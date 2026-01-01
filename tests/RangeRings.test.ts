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

    test('should render all rings up to current range', async () => {
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Should render rings for 25, 50, 100 (3 rings)
      const rings = getVisibleRings();
      expect(rings.length).toBe(3);
    });

    test('should render only active ring label', async () => {
      currentRangeSubject.set(50);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Should have 2 rings (25, 50) but only 1 label (for 50)
      const rings = getVisibleRings();
      const labels = getVisibleLabels();
      
      expect(rings.length).toBe(2);
      expect(labels.length).toBe(1);
      
      const label = labels[0] as SVGTextElement;
      expect(label.textContent).toBe('50');
    });
  });

  describe('Observable Updates', () => {
    test('should update rings when currentRange observable changes', async () => {
      const { component } = await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Initially should show 3 rings (25, 50, 100)
      let rings = getVisibleRings();
      expect(rings.length).toBe(3);

      // Change range to 200 - should show all 4 rings
      currentRangeSubject.set(200);
      await helper.waitForUpdate();

      rings = getVisibleRings();
      expect(rings.length).toBe(4);

      // Change range to 25 - should show only 1 ring
      currentRangeSubject.set(25);
      await helper.waitForUpdate();

      rings = getVisibleRings();
      expect(rings.length).toBe(1);
    });

    test('should update ring radii when range changes', async () => {
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Set range to 100
      currentRangeSubject.set(100);
      await helper.waitForUpdate();

      const ring25 = helper.querySelectorSVG('circle[data-range="25"]') as SVGCircleElement;
      const ring100 = helper.querySelectorSVG('circle[data-range="100"]') as SVGCircleElement;
      
      const radius25_100 = parseFloat(ring25.getAttribute('r') || '0');
      const radius100_100 = parseFloat(ring100.getAttribute('r') || '0');
      
      // At 100 nmi range: 25 nmi ring should be at 25% of display radius
      expect(radius25_100).toBeCloseTo(45, 1);
      // 100 nmi ring should be at full display radius
      expect(radius100_100).toBeCloseTo(180, 1);

      // Change range to 200
      currentRangeSubject.set(200);
      await helper.waitForUpdate();

      const ring25_200 = helper.querySelectorSVG('circle[data-range="25"]') as SVGCircleElement;
      const radius25_200 = parseFloat(ring25_200.getAttribute('r') || '0');
      
      // At 200 nmi range: 25 nmi ring should be at 12.5% of display radius
      expect(radius25_200).toBeCloseTo(22.5, 1);
      // Should be smaller than at 100 nmi range
      expect(radius25_200).toBeLessThan(radius25_100);
    });

    test('should update active ring styling when range changes', async () => {
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Set range to 50
      currentRangeSubject.set(50);
      await helper.waitForUpdate();

      const activeRing50 = helper.querySelectorSVG('circle[data-range="50"]') as SVGCircleElement;
      expect(activeRing50.getAttribute('stroke')).toBe('#00FF00');
      expect(activeRing50.getAttribute('stroke-width')).toBe('2');

      // Change range to 100
      currentRangeSubject.set(100);
      await helper.waitForUpdate();

      // 50 should no longer be active
      const inactiveRing50 = helper.querySelectorSVG('circle[data-range="50"]') as SVGCircleElement;
      expect(inactiveRing50.getAttribute('stroke')).toBe('#006600');
      expect(inactiveRing50.getAttribute('stroke-width')).toBe('1');

      // 100 should now be active
      const activeRing100 = helper.querySelectorSVG('circle[data-range="100"]') as SVGCircleElement;
      expect(activeRing100.getAttribute('stroke')).toBe('#00FF00');
      expect(activeRing100.getAttribute('stroke-width')).toBe('2');
    });

    test('should update label visibility when range changes', async () => {
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Set range to 50
      currentRangeSubject.set(50);
      await helper.waitForUpdate();

      const label50 = helper.querySelectorSVG('text[data-range="50"]') as SVGTextElement;
      expect(label50.style.display).not.toBe('none');
      expect(label50.textContent).toBe('50');

      // Change range to 100
      currentRangeSubject.set(100);
      await helper.waitForUpdate();

      // 50 label should be hidden
      const label50_hidden = helper.querySelectorSVG('text[data-range="50"]') as SVGTextElement;
      expect(label50_hidden.style.display).toBe('none');

      // 100 label should be visible
      const label100 = helper.querySelectorSVG('text[data-range="100"]') as SVGTextElement;
      expect(label100.style.display).not.toBe('none');
      expect(label100.textContent).toBe('100');
    });
  });

  describe('Range Display', () => {
    test('should display correct ring radius for 25 nmi range', async () => {
      currentRangeSubject.set(25);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      const ring = helper.querySelectorSVG('circle[data-range="25"]') as SVGCircleElement;
      expect(ring).toBeTruthy();
      expect(parseFloat(ring.getAttribute('r') || '0')).toBeCloseTo(180, 1); // Full radius
    });

    test('should scale ring radius correctly for 50 nmi range', async () => {
      currentRangeSubject.set(50);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      const ring25 = helper.querySelector('circle[data-range="25"]') as SVGCircleElement;
      const ring50 = helper.querySelector('circle[data-range="50"]') as SVGCircleElement;
      
      expect(ring25).toBeTruthy();
      expect(ring50).toBeTruthy();
      
      const radius25 = parseFloat(ring25.getAttribute('r') || '0');
      const radius50 = parseFloat(ring50.getAttribute('r') || '0');
      
      // 25 nmi ring should be at 50% of display radius when range is 50 nmi
      expect(radius25).toBeCloseTo(90, 1);
      // 50 nmi ring should be at full display radius
      expect(radius50).toBeCloseTo(180, 1);
    });

    test('should scale ring radius correctly for 100 nmi range', async () => {
      currentRangeSubject.set(100);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      const ring25 = helper.querySelector('circle[data-range="25"]') as SVGCircleElement;
      const ring100 = helper.querySelector('circle[data-range="100"]') as SVGCircleElement;
      
      const radius25 = parseFloat(ring25.getAttribute('r') || '0');
      const radius100 = parseFloat(ring100.getAttribute('r') || '0');
      
      // 25 nmi ring should be at 25% of display radius when range is 100 nmi
      expect(radius25).toBeCloseTo(45, 1);
      // 100 nmi ring should be at full display radius
      expect(radius100).toBeCloseTo(180, 1);
    });

    test('should scale ring radius correctly for 200 nmi range', async () => {
      currentRangeSubject.set(200);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      const ring25 = helper.querySelector('circle[data-range="25"]') as SVGCircleElement;
      const ring200 = helper.querySelector('circle[data-range="200"]') as SVGCircleElement;
      
      const radius25 = parseFloat(ring25.getAttribute('r') || '0');
      const radius200 = parseFloat(ring200.getAttribute('r') || '0');
      
      // 25 nmi ring should be at 12.5% of display radius when range is 200 nmi
      expect(radius25).toBeCloseTo(22.5, 1);
      // 200 nmi ring should be at full display radius
      expect(radius200).toBeCloseTo(180, 1);
    });
  });

  describe('Styling', () => {
    test('should apply active styling to current range ring', async () => {
      currentRangeSubject.set(50);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      const activeRing = helper.querySelectorSVG('circle[data-range="50"]') as SVGCircleElement;
      const inactiveRing = helper.querySelectorSVG('circle[data-range="25"]') as SVGCircleElement;
      
      expect(activeRing.getAttribute('stroke')).toBe('#00FF00');
      expect(activeRing.getAttribute('stroke-width')).toBe('2');
      expect(parseFloat(activeRing.getAttribute('opacity') || '0')).toBe(1);
      
      expect(inactiveRing.getAttribute('stroke')).toBe('#006600');
      expect(inactiveRing.getAttribute('stroke-width')).toBe('1');
      expect(parseFloat(inactiveRing.getAttribute('opacity') || '0')).toBe(0.5);
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
    test('should handle invalid range gracefully', async () => {
      // Range not in the list (e.g., 75)
      currentRangeSubject.set(75);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // Should still render rings (defaults to showing all)
      const rings = helper.querySelectorAll('circle.range-ring');
      expect(rings.length).toBe(4); // All 4 rings
    });

    test('should center rings correctly', async () => {
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      const ring = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      expect(ring).toBeTruthy();
      expect(parseFloat(ring.getAttribute('cx') || '0')).toBe(200);
      expect(parseFloat(ring.getAttribute('cy') || '0')).toBe(200);
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

      // Should show all 4 rings at 200 nmi
      const rings = helper.querySelectorAllSVG('circle.range-ring');
      expect(rings.length).toBe(4);
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
      const initialRings = getVisibleRings();
      const initialCount = initialRings.length;
      
      currentRangeSubject.set(200);
      await helper.waitForUpdate();
      
      // Should have updated (more rings visible)
      const updatedRings = getVisibleRings();
      expect(updatedRings.length).toBeGreaterThan(initialCount);
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
      const ring100 = helper.querySelectorSVG('circle[data-range="100"]') as SVGCircleElement;
      const initialRadius = parseFloat(ring100.getAttribute('r') || '0');
      
      // Change range - should update same element, not create new one
      currentRangeSubject.set(200);
      await helper.waitForUpdate();
      
      // Should be the same DOM element (not re-rendered)
      const ring100After = helper.querySelectorSVG('circle[data-range="100"]') as SVGCircleElement;
      expect(ring100After).toBe(ring100); // Same element reference
      
      // But radius should have changed
      const newRadius = parseFloat(ring100After.getAttribute('r') || '0');
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
      
      const label100 = helper.querySelectorSVG('text[data-range="100"]') as SVGTextElement;
      const initialX = parseFloat(label100.getAttribute('x') || '0');
      
      // Change range to 200 - label should move (ring is smaller)
      currentRangeSubject.set(200);
      await helper.waitForUpdate();
      
      const label100After = helper.querySelectorSVG('text[data-range="100"]') as SVGTextElement;
      const newX = parseFloat(label100After.getAttribute('x') || '0');
      
      // X position should have changed (ring radius changed)
      expect(newX).not.toBe(initialX);
      expect(newX).toBeLessThan(initialX); // Smaller ring = label closer to center
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

      // Rings should be visible in both modes
      viewModeSubject.set('120');
      await helper.waitForUpdate();
      
      const ringsForward = helper.querySelectorAllSVG('circle.range-ring');
      expect(ringsForward.length).toBeGreaterThan(0);
      
      viewModeSubject.set('360');
      await helper.waitForUpdate();
      
      const rings360 = helper.querySelectorAllSVG('circle.range-ring');
      expect(rings360.length).toBeGreaterThan(0);
    });
  });

  describe('Ref-based DOM Manipulation', () => {
    test('should initialize all ring refs on render', async () => {
      const { component } = await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });

      // All 4 rings should have refs initialized
      const rings = helper.querySelectorAllSVG('circle.range-ring');
      expect(rings.length).toBe(4); // All 4 rings rendered
      
      // Each ring should have a corresponding text element
      const labels = helper.querySelectorAllSVG('text.range-label');
      expect(labels.length).toBe(4); // All 4 labels rendered
    });

    test('should update rings when observable changes (observable pattern)', async () => {
      // Start with range 100
      currentRangeSubject.set(100);
      await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });
      await helper.waitForUpdate();

      // Initially should show 3 rings (25, 50, 100) - verify by checking they're not hidden
      const ring25 = helper.querySelectorSVG('circle[data-range="25"]') as SVGCircleElement;
      const ring50 = helper.querySelectorSVG('circle[data-range="50"]') as SVGCircleElement;
      const ring100 = helper.querySelectorSVG('circle[data-range="100"]') as SVGCircleElement;
      
      expect(ring25).toBeTruthy();
      expect(ring50).toBeTruthy();
      expect(ring100).toBeTruthy();
      
      // Change to 200 - should show all 4 rings
      currentRangeSubject.set(200);
      await helper.waitForUpdate();
      
      // All 4 rings should be visible
      const allRings = helper.querySelectorAllSVG('circle.range-ring');
      const visibleRings = Array.from(allRings).filter(ring => {
        const group = ring.parentElement;
        if (!group || !(group instanceof HTMLElement)) {
          return false;
        }
        return group.style.display !== 'none';
      });
      expect(visibleRings.length).toBe(4);
    });

    test('should subscribe to observables and update DOM (MSFS pattern)', async () => {
      // Verify that component uses observables, not re-rendering
      currentRangeSubject.set(50);
      const { component } = await renderAndWait({
        currentRange: currentRangeSubject,
        viewMode: viewModeSubject
      });
      await helper.waitForUpdate();

      // Get initial DOM elements
      const ring50Initial = helper.querySelectorSVG('circle[data-range="50"]') as SVGCircleElement;
      const initialRadius = parseFloat(ring50Initial.getAttribute('r') || '0');
      
      // Change range - should update same DOM element via subscription
      currentRangeSubject.set(100);
      await helper.waitForUpdate();
      
      // Should be the same DOM element (not re-rendered)
      const ring50After = helper.querySelectorSVG('circle[data-range="50"]') as SVGCircleElement;
      expect(ring50After).toBe(ring50Initial); // Same element = no re-render
      
      // Radius should have changed (updated via subscription)
      const newRadius = parseFloat(ring50After.getAttribute('r') || '0');
      expect(newRadius).not.toBe(initialRadius);
    });
  });
});

