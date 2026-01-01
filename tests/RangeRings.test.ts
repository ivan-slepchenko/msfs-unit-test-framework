// IMPORTANT: Import mocks FIRST before any component imports
// This ensures SDK mocks are set up before components try to use SDK classes
// setupTests.ts is automatically loaded by Jest, but we import it here explicitly
// to ensure the order is correct
import '../src/setupTests';

// CRITICAL: Import mocks FIRST before any component imports
// This ensures global mocks (BaseInstrument, DisplayComponent, FSComponent) are set up
import '../src/setupTests';

import { TestEnvironment, ComponentTestHelper } from '../src';
import { Subject } from '@microsoft/msfs-sdk';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { RangeRings, RangeRingsProps } from '../../html_ui/stormscope/components/RangeRings';

describe('RangeRings Component', () => {
  let env: TestEnvironment;
  let helper: ComponentTestHelper;
  let currentRangeSubject: Subject<number>;
  let viewModeSubject: Subject<'120' | '360'>;

  // Helper to get only visible rings (filters out rings with parent display: none)
  const getVisibleRings = () => {
    const allRings = helper.querySelectorAllSVG('circle.range-ring');
    return Array.from(allRings).filter(ring => {
      const group = ring.parentElement;
      if (!group || !(group instanceof HTMLElement)) {
        return true; // Include if no parent or not an HTML element
      }
      return group.style.display !== 'none';
    });
  };

  // Helper to get only visible labels
  const getVisibleLabels = () => {
    const allLabels = helper.querySelectorAllSVG('text.range-label');
    return Array.from(allLabels).filter(label => {
      if (!(label instanceof HTMLElement)) {
        return true;
      }
      return label.style.display !== 'none';
    });
  };

  beforeEach(() => {
    env = new TestEnvironment();
    env.setup();
    helper = new ComponentTestHelper(env);
    currentRangeSubject = Subject.create<number>(100);
    viewModeSubject = Subject.create<'120' | '360'>('360');
  });

  // Helper to render component and wait for initial observable subscription
  const renderAndWait = async (props: any) => {
    const result = helper.renderComponent(RangeRings, props);
    // Wait for initial observable subscription to execute and DOM to update
    // The subscription with immediate:true executes synchronously, but we need
    // to wait a bit for any DOM updates to be flushed
    await helper.waitForUpdate(100);
    return result;
  };

  afterEach(() => {
    helper.cleanup();
    env.teardown();
  });

  describe('Rendering', () => {
    test('should render range rings container', async () => {
      const { element } = await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      expect(element).toBeTruthy();
      expect(element.tagName).toBe('g');
      expect(element.id).toBe('range-rings');
    });

    test('should render single 25nm ring', async () => {
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Component renders a single 25nm ring that scales
      const rings = getVisibleRings();
      expect(rings.length).toBe(1);
      
      const ring = rings[0] as SVGCircleElement;
      expect(ring).toBeTruthy();
      expect(ring.classList.contains('range-ring')).toBe(true);
    });

    test('should render label for 25nm ring', async () => {
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      const labels = getVisibleLabels();
      expect(labels.length).toBe(1);
      
      const label = labels[0] as SVGTextElement;
      expect(label.textContent).toBe('25');
      expect(label.classList.contains('range-label')).toBe(true);
    });
  });

  describe('Observable Updates', () => {
    test('should update ring radius when currentRange observable changes', async () => {
      const { component } = await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Initially should show 1 ring (25nm ring)
      let rings = getVisibleRings();
      expect(rings.length).toBe(1);

      // Change range to 200 - still 1 ring, but radius changes
      currentRangeSubject.set(200);
      await helper.waitForUpdate();

      rings = getVisibleRings();
      expect(rings.length).toBe(1);
      
      // Ring should be smaller at 200 nmi range
      const ring = rings[0] as SVGCircleElement;
      const radius200 = parseFloat(ring.getAttribute('r') || '0');
      expect(radius200).toBeCloseTo(40, 1); // 25/200 * 320 = 40

      // Change range to 25 - still 1 ring, but at full radius
      currentRangeSubject.set(25);
      await helper.waitForUpdate();

      rings = getVisibleRings();
      expect(rings.length).toBe(1);
      
      const radius25 = parseFloat(rings[0].getAttribute('r') || '0');
      expect(radius25).toBeCloseTo(320, 1); // 25/25 * 320 = 320 (full radius)
    });

    test('should update ring radius when range changes', async () => {
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Set range to 100
      currentRangeSubject.set(100);
      await helper.waitForUpdate();

      const ring = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      const radius25_100 = parseFloat(ring.getAttribute('r') || '0');
      
      // At 100 nmi range: 25 nmi ring should be at 25% of display radius (80)
      // DISPLAY_RADIUS is 320, so 25/100 * 320 = 80
      expect(radius25_100).toBeCloseTo(80, 1);

      // Change range to 200
      currentRangeSubject.set(200);
      await helper.waitForUpdate();

      const radius25_200 = parseFloat(ring.getAttribute('r') || '0');
      
      // At 200 nmi range: 25 nmi ring should be at 12.5% of display radius (40)
      // 25/200 * 320 = 40
      expect(radius25_200).toBeCloseTo(40, 1);
      // Should be smaller than at 100 nmi range
      expect(radius25_200).toBeLessThan(radius25_100);
    });

    test('should update label position when range changes', async () => {
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Set range to 50
      currentRangeSubject.set(50);
      await helper.waitForUpdate();

      const label = helper.querySelectorSVG('text.range-label') as SVGTextElement;
      expect(label).toBeTruthy();
      expect(label.textContent).toBe('25');
      expect(label.style.display).not.toBe('none');
      
      const yBefore = parseFloat(label.getAttribute('y') || '0');
      // At 50 nmi: label at centerY + radius (384 + 160 = 544)
      expect(yBefore).toBeCloseTo(544, 1);

      // Change range to 100 - label should move (ring is smaller)
      currentRangeSubject.set(100);
      await helper.waitForUpdate();

      const labelAfter = helper.querySelectorSVG('text.range-label') as SVGTextElement;
      expect(labelAfter).toBeTruthy();
      expect(labelAfter.textContent).toBe('25');
      
      // Y position should change as ring radius changes
      const yAfter = parseFloat(labelAfter.getAttribute('y') || '0');
      // At 100 nmi: label at centerY + radius (384 + 80 = 464)
      expect(yAfter).toBeCloseTo(464, 1);
      expect(yAfter).toBeLessThan(yBefore);
    });
  });

  describe('Range Display', () => {
    test('should display correct ring radius for 25 nmi range', async () => {
      currentRangeSubject.set(25);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      const ring = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      expect(ring).toBeTruthy();
      // At 25 nmi range: 25 nmi ring should be at full display radius (320)
      expect(parseFloat(ring.getAttribute('r') || '0')).toBeCloseTo(320, 1);
    });

    test('should scale ring radius correctly for 50 nmi range', async () => {
      currentRangeSubject.set(50);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      const ring = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      expect(ring).toBeTruthy();
      
      const radius = parseFloat(ring.getAttribute('r') || '0');
      // 25 nmi ring should be at 50% of display radius when range is 50 nmi
      // 25/50 * 320 = 160
      expect(radius).toBeCloseTo(160, 1);
    });

    test('should scale ring radius correctly for 100 nmi range', async () => {
      currentRangeSubject.set(100);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      const ring = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      
      const radius = parseFloat(ring.getAttribute('r') || '0');
      // 25 nmi ring should be at 25% of display radius when range is 100 nmi
      // 25/100 * 320 = 80
      expect(radius).toBeCloseTo(80, 1);
    });

    test('should scale ring radius correctly for 200 nmi range', async () => {
      currentRangeSubject.set(200);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      const ring = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      
      const radius = parseFloat(ring.getAttribute('r') || '0');
      // 25 nmi ring should be at 12.5% of display radius when range is 200 nmi
      // 25/200 * 320 = 40
      expect(radius).toBeCloseTo(40, 1);
    });
  });

  describe('Styling', () => {
    test('should apply correct styling to ring', async () => {
      currentRangeSubject.set(50);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      const ring = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      expect(ring).toBeTruthy();
      
      // Ring uses CSS variables for styling
      expect(ring.getAttribute('stroke')).toBe('var(--stormscope-green)');
      expect(ring.getAttribute('stroke-width')).toBe('var(--stormscope-stroke-width)');
      expect(ring.getAttribute('fill')).toBe('none');
    });
  });

  describe('View Mode', () => {
    test('should render rings in forward view mode', async () => {
      viewModeSubject.set('120');
      const { element } = await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      expect(element).toBeTruthy();
      // Rings should still render, view mode affects other components
      const rings = helper.querySelectorAllSVG('circle.range-ring');
      expect(rings.length).toBeGreaterThan(0);
    });

    test('should render rings in 360 view mode', async () => {
      viewModeSubject.set('360');
      const { element } = await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      expect(element).toBeTruthy();
      const rings = helper.querySelectorAll('circle.range-ring');
      expect(rings.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle any range value gracefully', async () => {
      // Range not in the standard list (e.g., 75)
      currentRangeSubject.set(75);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Should still render the single ring
      const rings = helper.querySelectorAllSVG('circle.range-ring');
      expect(rings.length).toBe(1);
      
      const ring = rings[0] as SVGCircleElement;
      // At 75 nmi range: 25 nmi ring should be at 25/75 * 320 = 106.67
      const radius = parseFloat(ring.getAttribute('r') || '0');
      expect(radius).toBeCloseTo(106.67, 1);
    });

    test('should center ring correctly', async () => {
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      const ring = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      expect(ring).toBeTruthy();
      // DISPLAY_CENTER_X = 384, DISPLAY_CENTER_Y = 384
      expect(parseFloat(ring.getAttribute('cx') || '0')).toBe(384);
      expect(parseFloat(ring.getAttribute('cy') || '0')).toBe(384);
    });

    test('should handle rapid range changes', async () => {
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Rapidly change range multiple times
      currentRangeSubject.set(25);
      await helper.waitForUpdate();
      currentRangeSubject.set(50);
      await helper.waitForUpdate();
      currentRangeSubject.set(100);
      await helper.waitForUpdate();
      currentRangeSubject.set(200);
      await helper.waitForUpdate();

      // Should still show 1 ring at 200 nmi
      const rings = helper.querySelectorAllSVG('circle.range-ring');
      expect(rings.length).toBe(1);
      
      const ring = rings[0] as SVGCircleElement;
      const radius = parseFloat(ring.getAttribute('r') || '0');
      expect(radius).toBeCloseTo(40, 1); // 25/200 * 320 = 40
    });
  });

  describe('MSFS SDK Observable Patterns', () => {
    test('should subscribe to currentRange observable on afterRender', async () => {
      const { component } = await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Component should be rendered
      expect(component).toBeTruthy();
      
      // Change range - should trigger update
      const initialRing = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      const initialRadius = parseFloat(initialRing.getAttribute('r') || '0');
      
      currentRangeSubject.set(200);
      await helper.waitForUpdate();
      
      // Should have updated (radius changed)
      const updatedRing = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      const updatedRadius = parseFloat(updatedRing.getAttribute('r') || '0');
      expect(updatedRadius).not.toBe(initialRadius);
      expect(updatedRadius).toBeLessThan(initialRadius);
    });

    test('should update DOM directly via refs (not re-render)', async () => {
      // Start with range 100
      currentRangeSubject.set(100);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });
      await helper.waitForUpdate(); // Wait for initial subscription

      // Get initial ring element
      const ring = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      const initialRadius = parseFloat(ring.getAttribute('r') || '0');
      
      // Change range - should update same element, not create new one
      currentRangeSubject.set(200);
      await helper.waitForUpdate();
      
      // Should be the same DOM element (not re-rendered)
      const ringAfter = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      expect(ringAfter).toBe(ring); // Same element reference
      
      // But radius should have changed
      const newRadius = parseFloat(ringAfter.getAttribute('r') || '0');
      expect(newRadius).not.toBe(initialRadius);
      expect(newRadius).toBeLessThan(initialRadius); // Smaller at 200 nmi range
    });

    test('should update label position when range changes', async () => {
      // Start with range 100
      currentRangeSubject.set(100);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });
      await helper.waitForUpdate(); // Wait for initial subscription
      
      const label = helper.querySelectorSVG('text.range-label') as SVGTextElement;
      const initialY = parseFloat(label.getAttribute('y') || '0');
      
      // Change range to 200 - label should move (ring is smaller)
      currentRangeSubject.set(200);
      await helper.waitForUpdate();
      
      const labelAfter = helper.querySelectorSVG('text.range-label') as SVGTextElement;
      const newY = parseFloat(labelAfter.getAttribute('y') || '0');
      
      // Y position should have changed (ring radius changed, label moves closer to center)
      expect(newY).not.toBe(initialY);
      expect(newY).toBeLessThan(initialY); // Smaller ring = label closer to center
    });

    test('should properly destroy subscriptions on component destroy', async () => {
      const { component } = await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Verify subscriptions exist
      expect(component).toBeTruthy();
      
      // Destroy component
      component.destroy();
      
      // Change range after destroy - should not cause errors
      currentRangeSubject.set(200);
      await helper.waitForUpdate();
      // Should not throw
    });

    test('should handle viewMode observable changes', async () => {
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Ring should be visible in both modes
      viewModeSubject.set('120');
      await helper.waitForUpdate();
      
      const ringsForward = helper.querySelectorAllSVG('circle.range-ring');
      expect(ringsForward.length).toBe(1);
      
      viewModeSubject.set('360');
      await helper.waitForUpdate();
      
      const rings360 = helper.querySelectorAllSVG('circle.range-ring');
      expect(rings360.length).toBe(1);
    });
  });

  describe('Ref-based DOM Manipulation', () => {
    test('should initialize refs on render', async () => {
      const { component } = await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Component has refs: circleRef, arcRef, textRef, textBgRef
      expect((component as any).circleRef).toBeTruthy();
      expect((component as any).circleRef.instance).toBeTruthy();
      expect((component as any).arcRef).toBeTruthy();
      expect((component as any).textRef).toBeTruthy();
      expect((component as any).textRef.instance).toBeTruthy();
      expect((component as any).textBgRef).toBeTruthy();
      
      // Single ring and label should be rendered
      const rings = helper.querySelectorAllSVG('circle.range-ring');
      expect(rings.length).toBe(1);
      
      const labels = helper.querySelectorAllSVG('text.range-label');
      expect(labels.length).toBe(1);
    });

    test('should update ring when observable changes (observable pattern)', async () => {
      // Start with range 100
      currentRangeSubject.set(100);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });
      await helper.waitForUpdate();

      // Should show 1 ring
      const ring = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      expect(ring).toBeTruthy();
      const initialRadius = parseFloat(ring.getAttribute('r') || '0');
      expect(initialRadius).toBeCloseTo(80, 1); // 25/100 * 320 = 80
      
      // Change to 200 - should update same ring
      currentRangeSubject.set(200);
      await helper.waitForUpdate();
      
      // Should be the same DOM element
      const ringAfter = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      expect(ringAfter).toBe(ring);
      
      // Radius should have changed
      const newRadius = parseFloat(ringAfter.getAttribute('r') || '0');
      expect(newRadius).toBeCloseTo(40, 1); // 25/200 * 320 = 40
      expect(newRadius).toBeLessThan(initialRadius);
    });

    test('should subscribe to observables and update DOM (MSFS pattern)', async () => {
      // Verify that component uses observables, not re-rendering
      currentRangeSubject.set(50);
      const { component } = await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });
      await helper.waitForUpdate();

      // Get initial DOM element
      const ringInitial = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      const initialRadius = parseFloat(ringInitial.getAttribute('r') || '0');
      
      // Change range - should update same DOM element via subscription
      currentRangeSubject.set(100);
      await helper.waitForUpdate();
      
      // Should be the same DOM element (not re-rendered)
      const ringAfter = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      expect(ringAfter).toBe(ringInitial); // Same element = no re-render
      
      // Radius should have changed (updated via subscription)
      const newRadius = parseFloat(ringAfter.getAttribute('r') || '0');
      expect(newRadius).not.toBe(initialRadius);
      expect(newRadius).toBeLessThan(initialRadius); // Smaller at 100 nmi
    });
  });
});

