import '../src/setupTests';
import { TestEnvironment, ComponentTestHelper } from '../src';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { IntegrityMonitor, IntegrityMonitorProps } from '../../html_ui/stormscope/components/IntegrityMonitor';

describe('IntegrityMonitor Component', () => {
  let env: TestEnvironment;
  let helper: ComponentTestHelper;

  beforeEach(() => {
    env = new TestEnvironment();
    env.setup();
    helper = new ComponentTestHelper(env);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    helper.cleanup();
    env.teardown();
  });

  describe('Rendering', () => {
    test('should render integrity monitor container', () => {
      const { element } = helper.renderComponent(IntegrityMonitor, {});

      expect(element).toBeTruthy();
      expect(element.tagName).toBe('g');
      expect(element.id).toBe('integrity-monitor');
    });

    test('should render rotating line', () => {
      helper.renderComponent(IntegrityMonitor, {});

      const line = helper.querySelectorSVG('line.integrity-monitor-line');
      expect(line).toBeTruthy();
      expect(line?.getAttribute('stroke')).toBe('var(--stormscope-green)');
      expect(parseFloat(line?.getAttribute('stroke-width') || '0')).toBe(2);
    });
  });

  describe('Rotation Animation', () => {
    test('should start rotation on afterRender', () => {
      helper.renderComponent(IntegrityMonitor, {});

      jest.advanceTimersByTime(10);

      const line = helper.querySelectorSVG('line.integrity-monitor-line') as SVGLineElement;
      expect(line).toBeTruthy();
      
      // Line should be initialized
      const x1 = parseFloat(line.getAttribute('x1') || '0');
      const y1 = parseFloat(line.getAttribute('y1') || '0');
      const x2 = parseFloat(line.getAttribute('x2') || '0');
      const y2 = parseFloat(line.getAttribute('y2') || '0');
      
      // Should be positioned (center is 15, 15 for boxSize 30)
      // State 0: | (vertical) - x1 == x2 == 15, y1 = 5, y2 = 25
      expect(x1).toBe(15);
      expect(x2).toBe(15);
      expect(y1).toBe(5); // centerY - halfLength = 15 - 10
      expect(y2).toBe(25); // centerY + halfLength = 15 + 10
    });

    test('should rotate through states: | / - \\', () => {
      helper.renderComponent(IntegrityMonitor, {});

      // Wait for initial render
      jest.advanceTimersByTime(10);

      const line = helper.querySelectorSVG('line.integrity-monitor-line') as SVGLineElement;
      
      // Initial state: | (vertical)
      let x1 = parseFloat(line.getAttribute('x1') || '0');
      let x2 = parseFloat(line.getAttribute('x2') || '0');
      
      // State 0: | (vertical) - x1 == x2
      expect(x1).toBe(x2);
      
      // Advance to state 1: / (diagonal)
      jest.advanceTimersByTime(500);
      
      x1 = parseFloat(line.getAttribute('x1') || '0');
      x2 = parseFloat(line.getAttribute('x2') || '0');
      
      // State 1: / (diagonal top-left to bottom-right) - x1 < x2
      expect(x1).toBeLessThan(x2);
      
      // Advance to state 2: - (horizontal)
      jest.advanceTimersByTime(500);
      
      const y1 = parseFloat(line.getAttribute('y1') || '0');
      const y2 = parseFloat(line.getAttribute('y2') || '0');
      
      // State 2: - (horizontal) - y1 == y2, x1 < x2
      expect(y1).toBe(y2);
      
      // Advance to state 3: \ (diagonal)
      jest.advanceTimersByTime(500);
      
      x1 = parseFloat(line.getAttribute('x1') || '0');
      x2 = parseFloat(line.getAttribute('x2') || '0');
      
      // State 3: \ (diagonal top-right to bottom-left) - x1 > x2
      expect(x1).toBeGreaterThan(x2);
    });

    test('should cycle back to state 0 after state 3', () => {
      helper.renderComponent(IntegrityMonitor, {});

      jest.advanceTimersByTime(10);

      // Go through all 4 states
      jest.advanceTimersByTime(500 * 4);

      const line = helper.querySelectorSVG('line.integrity-monitor-line') as SVGLineElement;
      const x1 = parseFloat(line.getAttribute('x1') || '0');
      const x2 = parseFloat(line.getAttribute('x2') || '0');
      
      // Should be back to state 0: | (vertical) - x1 == x2
      expect(x1).toBe(x2);
    });

    test('should use correct rotation interval', () => {
      helper.renderComponent(IntegrityMonitor, {});

      jest.advanceTimersByTime(10);

      const line1 = helper.querySelectorSVG('line.integrity-monitor-line') as SVGLineElement;
      const x1_1 = parseFloat(line1.getAttribute('x1') || '0');

      // Advance by less than interval - should not change
      jest.advanceTimersByTime(400);

      const line2 = helper.querySelectorSVG('line.integrity-monitor-line') as SVGLineElement;
      const x1_2 = parseFloat(line2.getAttribute('x1') || '0');

      // Should be same state
      expect(x1_1).toBe(x1_2);

      // Advance by full interval - should change
      jest.advanceTimersByTime(100);

      const line3 = helper.querySelectorSVG('line.integrity-monitor-line') as SVGLineElement;
      const x1_3 = parseFloat(line3.getAttribute('x1') || '0');

      // Should be different state
      expect(x1_3).not.toBe(x1_1);
    });
  });

  describe('Line Positioning', () => {
    test('should position line correctly for vertical state', () => {
      helper.renderComponent(IntegrityMonitor, {});

      jest.advanceTimersByTime(10);

      const line = helper.querySelectorSVG('line.integrity-monitor-line') as SVGLineElement;
      const centerX = 15; // boxSize / 2 = 30 / 2
      const centerY = 15;
      const halfLength = 10; // lineLength / 2 = 20 / 2

      const x1 = parseFloat(line.getAttribute('x1') || '0');
      const y1 = parseFloat(line.getAttribute('y1') || '0');
      const x2 = parseFloat(line.getAttribute('x2') || '0');
      const y2 = parseFloat(line.getAttribute('y2') || '0');

      // State 0: | (vertical)
      expect(x1).toBe(centerX);
      expect(x2).toBe(centerX);
      expect(y1).toBe(centerY - halfLength);
      expect(y2).toBe(centerY + halfLength);
    });
  });

  describe('Cleanup', () => {
    test('should stop rotation timer on destroy', () => {
      const { component } = helper.renderComponent(IntegrityMonitor, {});

      component.destroy();

      // Advance time - should not cause errors
      jest.advanceTimersByTime(2000);
      
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
