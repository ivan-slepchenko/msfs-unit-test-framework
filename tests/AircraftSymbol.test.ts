import { TestEnvironment, ComponentTestHelper } from '../src';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { AircraftSymbol, AircraftSymbolProps } from '../../html_ui/stormscope/components/AircraftSymbol';

describe('AircraftSymbol Component', () => {
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
    test('should render aircraft symbol container', () => {
      const { element } = helper.renderComponent(AircraftSymbol, {});

      expect(element).toBeTruthy();
      expect(element.tagName).toBe('g');
      expect(element.id).toBe('aircraft-symbol');
    });

    test('should render horizontal and vertical lines', () => {
      helper.renderComponent(AircraftSymbol, {});

      const lines = helper.querySelectorAllSVG('line.aircraft-line');
      expect(lines.length).toBe(2);
    });

    test('should render center circle', () => {
      helper.renderComponent(AircraftSymbol, {});

      const circle = helper.querySelectorSVG('circle.aircraft-center');
      expect(circle).toBeTruthy();
      expect(parseFloat(circle?.getAttribute('r') || '0')).toBe(3);
    });
  });

  describe('Positioning', () => {
    test('should be centered at (200, 200)', () => {
      helper.renderComponent(AircraftSymbol, {});

      const symbol = helper.querySelectorSVG('#aircraft-symbol');
      expect(symbol).toBeTruthy();
      
      const transform = symbol?.getAttribute('transform');
      expect(transform).toContain('translate(200, 200)');
    });

    test('should have correct line positions', () => {
      helper.renderComponent(AircraftSymbol, {});

      const lines = helper.querySelectorAllSVG('line.aircraft-line');
      expect(lines.length).toBe(2);

      // Check horizontal line
      const horizontalLine = Array.from(lines).find(line => 
        parseFloat(line.getAttribute('x1') || '0') === -10
      );
      expect(horizontalLine).toBeTruthy();
      expect(parseFloat(horizontalLine?.getAttribute('x2') || '0')).toBe(10);
      expect(parseFloat(horizontalLine?.getAttribute('y1') || '0')).toBe(0);
      expect(parseFloat(horizontalLine?.getAttribute('y2') || '0')).toBe(0);

      // Check vertical line
      const verticalLine = Array.from(lines).find(line => 
        parseFloat(line.getAttribute('y1') || '0') === -10
      );
      expect(verticalLine).toBeTruthy();
      expect(parseFloat(verticalLine?.getAttribute('y2') || '0')).toBe(10);
      expect(parseFloat(verticalLine?.getAttribute('x1') || '0')).toBe(0);
      expect(parseFloat(verticalLine?.getAttribute('x2') || '0')).toBe(0);
    });
  });

  describe('Styling', () => {
    test('should apply correct stroke color', () => {
      helper.renderComponent(AircraftSymbol, {});

      const lines = helper.querySelectorAllSVG('line.aircraft-line');
      lines.forEach(line => {
        expect(line.getAttribute('stroke')).toBe('#00FF00');
        expect(parseFloat(line.getAttribute('stroke-width') || '0')).toBe(2);
      });
    });

    test('should apply correct fill color to circle', () => {
      helper.renderComponent(AircraftSymbol, {});

      const circle = helper.querySelectorSVG('circle.aircraft-center');
      expect(circle?.getAttribute('fill')).toBe('#00FF00');
    });
  });
});

