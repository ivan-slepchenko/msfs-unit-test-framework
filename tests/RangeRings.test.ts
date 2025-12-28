// IMPORTANT: Import mocks FIRST before any component imports
// This ensures SDK mocks are set up before components try to use SDK classes
// setupTests.ts is automatically loaded by Jest, but we import it here explicitly
// to ensure the order is correct
import '../src/setupTests';

// CRITICAL: Import mocks FIRST before any component imports
// This ensures global mocks (BaseInstrument, DisplayComponent, FSComponent) are set up
import '../src/setupTests';

import { TestEnvironment, ComponentTestHelper } from '../src';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { RangeRings, RangeRingsProps } from '../../html_ui/stormscope/components/RangeRings';

describe('RangeRings Component', () => {
  let env: TestEnvironment;
  let helper: ComponentTestHelper;

  beforeEach(() => {
    env = new TestEnvironment();
    env.setup();
    helper = new ComponentTestHelper(env);
  });

  afterEach(() => {
    helper.cleanup();
    env.teardown();
  });

  describe('Rendering', () => {
    test('should render range rings container', () => {
      const { element } = helper.renderComponent(RangeRings, {
        currentRange: 100,
        viewMode: '360'
      });

      expect(element).toBeTruthy();
      expect(element.tagName).toBe('g');
      expect(element.id).toBe('range-rings');
    });

    test('should render all rings up to current range', () => {
      helper.renderComponent(RangeRings, {
        currentRange: 100,
        viewMode: '360'
      });

      // Should render rings for 25, 50, 100 (3 rings)
      const rings = helper.querySelectorAllSVG('circle.range-ring');
      expect(rings.length).toBe(3);
    });

    test('should render only active ring label', () => {
      helper.renderComponent(RangeRings, {
        currentRange: 50,
        viewMode: '360'
      });

      // Should have 2 rings (25, 50) but only 1 label (for 50)
      const rings = helper.querySelectorAllSVG('circle.range-ring');
      const labels = helper.querySelectorAllSVG('text.range-label');
      
      expect(rings.length).toBe(2);
      expect(labels.length).toBe(1);
      
      const label = labels[0] as SVGTextElement;
      expect(label.textContent).toBe('50');
    });
  });

  describe('Range Display', () => {
    test('should display correct ring radius for 25 nmi range', () => {
      helper.renderComponent(RangeRings, {
        currentRange: 25,
        viewMode: '360'
      });

      const ring = helper.querySelectorSVG('circle[data-range="25"]') as SVGCircleElement;
      expect(ring).toBeTruthy();
      expect(parseFloat(ring.getAttribute('r') || '0')).toBeCloseTo(180, 1); // Full radius
    });

    test('should scale ring radius correctly for 50 nmi range', () => {
      helper.renderComponent(RangeRings, {
        currentRange: 50,
        viewMode: '360'
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

    test('should scale ring radius correctly for 100 nmi range', () => {
      helper.renderComponent(RangeRings, {
        currentRange: 100,
        viewMode: '360'
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

    test('should scale ring radius correctly for 200 nmi range', () => {
      helper.renderComponent(RangeRings, {
        currentRange: 200,
        viewMode: '360'
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
    test('should apply active styling to current range ring', () => {
      helper.renderComponent(RangeRings, {
        currentRange: 50,
        viewMode: '360'
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
    test('should render rings in forward view mode', () => {
      const { element } = helper.renderComponent(RangeRings, {
        currentRange: 100,
        viewMode: 'forward'
      });

      expect(element).toBeTruthy();
      // Rings should still render, view mode affects other components
      const rings = helper.querySelectorAllSVG('circle.range-ring');
      expect(rings.length).toBeGreaterThan(0);
    });

    test('should render rings in 360 view mode', () => {
      const { element } = helper.renderComponent(RangeRings, {
        currentRange: 100,
        viewMode: '360'
      });

      expect(element).toBeTruthy();
      const rings = helper.querySelectorAll('circle.range-ring');
      expect(rings.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle invalid range gracefully', () => {
      // Range not in the list (e.g., 75)
      helper.renderComponent(RangeRings, {
        currentRange: 75,
        viewMode: '360'
      });

      // Should still render rings (defaults to showing all)
      const rings = helper.querySelectorAll('circle.range-ring');
      expect(rings.length).toBe(4); // All 4 rings
    });

    test('should center rings correctly', () => {
      helper.renderComponent(RangeRings, {
        currentRange: 100,
        viewMode: '360'
      });

      const ring = helper.querySelectorSVG('circle.range-ring') as SVGCircleElement;
      expect(ring).toBeTruthy();
      expect(parseFloat(ring.getAttribute('cx') || '0')).toBe(200);
      expect(parseFloat(ring.getAttribute('cy') || '0')).toBe(200);
    });
  });
});

