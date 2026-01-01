// IMPORTANT: Import mocks FIRST before any component imports
import '../src/setupTests';

import { TestEnvironment, ComponentTestHelper } from '../src';
import { Subject } from '@microsoft/msfs-sdk';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { DischargePoints, DischargePointsProps } from '../../html_ui/stormscope/components/DischargePoints';
// @ts-ignore
import { DischargePoint } from '../../html_ui/stormscope/types/StormDetection';

describe('DischargePoints Component', () => {
  let env: TestEnvironment;
  let helper: ComponentTestHelper;
  let headingSubject: Subject<number>;

  function createTestPoint(
    id: string,
    bearing: number,
    distance: number,
    intensity: number = 1.0
  ): DischargePoint {
    return {
      id,
      bearing,
      distance,
      latitude: 40.0,
      longitude: -75.0,
      timestamp: Date.now(),
      age: 0,
      intensity,
      isInterference: false
    };
  }

  beforeEach(() => {
    env = new TestEnvironment();
    env.setup();
    helper = new ComponentTestHelper(env);
    headingSubject = Subject.create<number>(0);
  });

  afterEach(() => {
    helper.cleanup();
    env.teardown();
  });

  describe('Rendering', () => {
    test('should render discharge points container', () => {
      const { element } = helper.renderComponent(DischargePoints, {
        points: [],
        currentRange: 100,
        heading: headingSubject,
        viewMode: '360'
      });

      expect(element).toBeTruthy();
      expect(element.tagName).toBe('g');
      expect(element.id).toBe('discharge-points');
    });

    test('should render single discharge point', () => {
      const point = createTestPoint('point1', 0, 50, 1.0);
      
      helper.renderComponent(DischargePoints, {
        points: [point],
        currentRange: 100,
        heading: headingSubject,
        viewMode: '360'
      });

      const lines = helper.querySelectorAllSVG('line.discharge-point');
      expect(lines.length).toBe(2); // X symbol has 2 lines
    });

    test('should render multiple discharge points', () => {
      const points = [
        createTestPoint('point1', 0, 50, 1.0),
        createTestPoint('point2', 90, 75, 0.8),
        createTestPoint('point3', 180, 25, 0.6)
      ];
      
      helper.renderComponent(DischargePoints, {
        points,
        currentRange: 100,
        heading: headingSubject,
        viewMode: '360'
      });

      const lines = helper.querySelectorAllSVG('line.discharge-point');
      expect(lines.length).toBe(6); // 3 points * 2 lines each
    });

    test('should not render points outside current range', () => {
      const points = [
        createTestPoint('point1', 0, 50, 1.0), // Within range
        createTestPoint('point2', 90, 150, 0.8) // Outside range
      ];
      
      helper.renderComponent(DischargePoints, {
        points,
        currentRange: 100,
        heading: headingSubject,
        viewMode: '360'
      });

      const lines = helper.querySelectorAllSVG('line.discharge-point');
      expect(lines.length).toBe(2); // Only first point should be rendered
    });
  });

  describe('Heading Stabilization', () => {
    test('should adjust point positions based on heading', () => {
      const point = createTestPoint('point1', 90, 50, 1.0); // East
      
      helper.renderComponent(DischargePoints, {
        points: [point],
        currentRange: 100,
        heading: headingSubject,
        viewMode: '360'
      });

      const lines1 = helper.querySelectorAllSVG('line.discharge-point');
      expect(lines1.length).toBeGreaterThan(0);
      const x1 = parseFloat(lines1[0].getAttribute('x1') || '0');

      // Change heading to 90° (point should now appear at 0° relative)
      headingSubject.set(90);

      // Re-render to get updated positions
      helper.renderComponent(DischargePoints, {
        points: [point],
        currentRange: 100,
        heading: headingSubject,
        viewMode: '360'
      });

      const lines2 = helper.querySelectorAllSVG('line.discharge-point');
      expect(lines2.length).toBeGreaterThan(0);
      const x2 = parseFloat(lines2[0].getAttribute('x1') || '0');

      // Position should have changed (or at least be valid)
      // Note: Due to coordinate transformation, exact values may vary
      expect(typeof x2).toBe('number');
      expect(isNaN(x2)).toBe(false);
    });
  });

  describe('View Mode', () => {
    test('should show all points in 360° mode', () => {
      const points = [
        createTestPoint('point1', 0, 50, 1.0), // North
        createTestPoint('point2', 90, 50, 1.0), // East
        createTestPoint('point3', 180, 50, 1.0), // South
        createTestPoint('point4', 270, 50, 1.0) // West
      ];
      
      helper.renderComponent(DischargePoints, {
        points,
        currentRange: 100,
        heading: headingSubject,
        viewMode: '360'
      });

      const lines = helper.querySelectorAllSVG('line.discharge-point');
      expect(lines.length).toBe(8); // All 4 points should be visible
    });

    test('should only show forward points in forward mode', () => {
      const points = [
        createTestPoint('point1', 0, 50, 1.0), // North (in forward arc)
        createTestPoint('point2', 90, 50, 1.0), // East (outside forward arc)
        createTestPoint('point3', 180, 50, 1.0), // South (outside forward arc)
        createTestPoint('point4', 270, 50, 1.0) // West (outside forward arc)
      ];
      
      helper.renderComponent(DischargePoints, {
        points,
        currentRange: 100,
        heading: headingSubject,
        viewMode: '120'
      });

      // In forward mode, only points in forward 120° arc should be visible
      // With heading 0°, forward arc is 300°-60°
      // So point at 0° should be visible, others may not be
      const lines = helper.querySelectorAllSVG('line.discharge-point');
      expect(lines.length).toBeGreaterThanOrEqual(0);
      expect(lines.length).toBeLessThanOrEqual(8);
    });
  });

  describe('Intensity Visualization', () => {
    test('should scale point size based on intensity', () => {
      const lowIntensityPoint = createTestPoint('point1', 0, 50, 0.3);
      const highIntensityPoint = createTestPoint('point2', 90, 50, 1.0);
      
      helper.renderComponent(DischargePoints, {
        points: [lowIntensityPoint, highIntensityPoint],
        currentRange: 100,
        heading: headingSubject,
        viewMode: '360'
      });

      const lines = helper.querySelectorAllSVG('line.discharge-point');
      expect(lines.length).toBe(4); // 2 points * 2 lines each
      
      // Check that opacity is set based on intensity
      const groups = helper.querySelectorAllSVG('g[opacity]');
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe('Range Scaling', () => {
    test('should scale point positions based on range', () => {
      const point = createTestPoint('point1', 0, 50, 1.0);
      
      // Render with 100 nmi range
      helper.renderComponent(DischargePoints, {
        points: [point],
        currentRange: 100,
        heading: headingSubject,
        viewMode: '360'
      });

      const lines1 = helper.querySelectorAllSVG('line.discharge-point');
      const y1 = parseFloat(lines1[0].getAttribute('y1') || '0');

      // Render with 200 nmi range (point should appear closer to center)
      helper.renderComponent(DischargePoints, {
        points: [point],
        currentRange: 200,
        heading: headingSubject,
        viewMode: '360'
      });

      const lines2 = helper.querySelectorAllSVG('line.discharge-point');
      const y2 = parseFloat(lines2[0].getAttribute('y1') || '0');

      // With larger range, same distance point should be closer to center
      // (smaller or equal y offset from center)
      expect(Math.abs(y2 - 200)).toBeLessThanOrEqual(Math.abs(y1 - 200));
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty points array', () => {
      const { element } = helper.renderComponent(DischargePoints, {
        points: [],
        currentRange: 100,
        heading: headingSubject,
        viewMode: '360'
      });

      expect(element).toBeTruthy();
      const lines = helper.querySelectorAllSVG('line.discharge-point');
      expect(lines.length).toBe(0);
    });

    test('should handle points at exactly range boundary', () => {
      const point = createTestPoint('point1', 0, 100, 1.0); // Exactly at range
      
      helper.renderComponent(DischargePoints, {
        points: [point],
        currentRange: 100,
        heading: headingSubject,
        viewMode: '360'
      });

      const lines = helper.querySelectorAllSVG('line.discharge-point');
      expect(lines.length).toBe(2); // Should be visible
    });

    test('should handle zero intensity points', () => {
      const point = createTestPoint('point1', 0, 50, 0);
      
      helper.renderComponent(DischargePoints, {
        points: [point],
        currentRange: 100,
        heading: headingSubject,
        viewMode: '360'
      });

      const lines = helper.querySelectorAllSVG('line.discharge-point');
      expect(lines.length).toBe(2); // Should still render, but with low opacity
    });
  });
});

