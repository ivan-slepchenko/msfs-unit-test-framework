import { TestEnvironment, ComponentTestHelper } from '../src';
import { Subject } from '@microsoft/msfs-sdk';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { AircraftSymbol, AircraftSymbolProps } from '../../html_ui/stormscope/components/AircraftSymbol';

describe('AircraftSymbol Component', () => {
  let env: TestEnvironment;
  let helper: ComponentTestHelper;
  let viewModeSubject: Subject<'120' | '360'>;

  beforeEach(() => {
    env = new TestEnvironment();
    env.setup();
    helper = new ComponentTestHelper(env);
    viewModeSubject = Subject.create<'120' | '360'>('360');
  });

  afterEach(() => {
    helper.cleanup();
    env.teardown();
  });

  describe('Rendering', () => {
    test('should render aircraft symbol container', () => {
      const { element } = helper.renderComponent(AircraftSymbol, {
        viewMode: viewModeSubject
      });

      expect(element).toBeTruthy();
      expect(element.tagName).toBe('g');
      expect(element.id).toBe('aircraft-symbol');
    });

    test('should render fuselage, wings, and tail lines', () => {
      helper.renderComponent(AircraftSymbol, {
        viewMode: viewModeSubject
      });

      const fuselage = helper.querySelectorSVG('line.aircraft-fuselage');
      const wings = helper.querySelectorSVG('line.aircraft-wings');
      const tail = helper.querySelectorSVG('line.aircraft-tail');
      
      expect(fuselage).toBeTruthy();
      expect(wings).toBeTruthy();
      expect(tail).toBeTruthy();
      
      // Check fuselage (vertical line)
      expect(parseFloat(fuselage?.getAttribute('x1') || '0')).toBe(30);
      expect(parseFloat(fuselage?.getAttribute('x2') || '0')).toBe(30);
      expect(parseFloat(fuselage?.getAttribute('y1') || '0')).toBe(10);
      expect(parseFloat(fuselage?.getAttribute('y2') || '0')).toBe(50);
      
      // Check wings (horizontal line)
      expect(parseFloat(wings?.getAttribute('x1') || '0')).toBe(13);
      expect(parseFloat(wings?.getAttribute('x2') || '0')).toBe(47);
      expect(parseFloat(wings?.getAttribute('y1') || '0')).toBe(24);
      expect(parseFloat(wings?.getAttribute('y2') || '0')).toBe(24);
      
      // Check tail (horizontal line)
      expect(parseFloat(tail?.getAttribute('x1') || '0')).toBe(20);
      expect(parseFloat(tail?.getAttribute('x2') || '0')).toBe(40);
      expect(parseFloat(tail?.getAttribute('y1') || '0')).toBe(44);
      expect(parseFloat(tail?.getAttribute('y2') || '0')).toBe(44);
    });
  });

  describe('Positioning', () => {
    test('should be centered at display center (384, 384)', () => {
      helper.renderComponent(AircraftSymbol, {
        viewMode: viewModeSubject
      });

      const symbol = helper.querySelectorSVG('#aircraft-symbol');
      expect(symbol).toBeTruthy();
      
      const transform = symbol?.getAttribute('transform');
      expect(transform).toContain('translate(384, 384)');
    });

    test('should update position based on view mode', async () => {
      viewModeSubject.set('360');
      
      helper.renderComponent(AircraftSymbol, {
        viewMode: viewModeSubject
      });

      await helper.waitForUpdate(50);
      
      let symbol = helper.querySelectorSVG('#aircraft-symbol');
      let transform = symbol?.getAttribute('transform') || '';
      expect(transform).toContain('translate(384, 384)');

      // Change to 120 mode
      viewModeSubject.set('120');
      await helper.waitForUpdate(50);
      
      symbol = helper.querySelectorSVG('#aircraft-symbol');
      transform = symbol?.getAttribute('transform') || '';
      expect(transform).toContain('translate(384, 647)');
    });
  });

  describe('Styling', () => {
    test('should apply correct stroke styling', () => {
      helper.renderComponent(AircraftSymbol, {
        viewMode: viewModeSubject
      });

      const symbol = helper.querySelectorSVG('#aircraft-symbol');
      expect(symbol).toBeTruthy();
      
      // The stroke and stroke-width are set on the group element
      expect(symbol?.getAttribute('stroke')).toBe('var(--stormscope-green)');
      expect(symbol?.getAttribute('stroke-width')).toBe('var(--stormscope-stroke-width)');
      expect(symbol?.getAttribute('fill')).toBe('none');
    });
  });
});

