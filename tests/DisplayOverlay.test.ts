import '../src/setupTests';
import { TestEnvironment, ComponentTestHelper } from '../src';
import { Subject } from '@microsoft/msfs-sdk';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { DisplayOverlay, DisplayOverlayProps } from '../../html_ui/stormscope/components/DisplayOverlay';

describe('DisplayOverlay Component', () => {
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
    test('should render overlay container', () => {
      const { element } = helper.renderComponent(DisplayOverlay, {
        viewMode: viewModeSubject
      });

      expect(element).toBeTruthy();
      expect(element.tagName).toBe('g');
      expect(element.id).toBe('display-overlay');
    });

    test('should render overlay path', () => {
      helper.renderComponent(DisplayOverlay, {
        viewMode: viewModeSubject
      });

      const path = helper.querySelectorSVG('path.display-overlay');
      expect(path).toBeTruthy();
      expect(path?.getAttribute('fill')).toBe('black');
      expect(path?.getAttribute('fill-rule')).toBe('evenodd');
    });

    test('should render triangle path', () => {
      helper.renderComponent(DisplayOverlay, {
        viewMode: viewModeSubject
      });

      const triangle = helper.querySelectorSVG('path.display-overlay-triangle');
      expect(triangle).toBeTruthy();
      expect(triangle?.getAttribute('fill')).toBe('black');
    });
  });

  describe('View Mode - 360°', () => {
    test('should show circular hole in 360 mode', async () => {
      viewModeSubject.set('360');
      
      helper.renderComponent(DisplayOverlay, {
        viewMode: viewModeSubject
      });

      await helper.waitForUpdate(50);

      const path = helper.querySelectorSVG('path.display-overlay') as SVGPathElement;
      expect(path).toBeTruthy();
      
      const pathData = path.getAttribute('d') || '';
      // Should contain circular hole path
      expect(pathData).toContain('M 384 384'); // Center point
      expect(pathData).toContain('a 320 320'); // Arc with radius 320
      
      // Path should be visible
      expect(path.style.display).not.toBe('none');
    });

    test('should hide triangle in 360 mode', async () => {
      viewModeSubject.set('360');
      
      helper.renderComponent(DisplayOverlay, {
        viewMode: viewModeSubject
      });

      await helper.waitForUpdate(50);

      const triangle = helper.querySelectorSVG('path.display-overlay-triangle') as SVGPathElement;
      expect(triangle).toBeTruthy();
      expect(triangle.style.display).toBe('none');
    });
  });

  describe('View Mode - 120°', () => {
    test('should hide circular overlay in 120 mode', async () => {
      viewModeSubject.set('120');
      
      helper.renderComponent(DisplayOverlay, {
        viewMode: viewModeSubject
      });

      await helper.waitForUpdate(50);

      const path = helper.querySelectorSVG('path.display-overlay') as SVGPathElement;
      expect(path).toBeTruthy();
      expect(path.style.display).toBe('none');
    });

    test('should show triangle in 120 mode', async () => {
      viewModeSubject.set('120');
      
      helper.renderComponent(DisplayOverlay, {
        viewMode: viewModeSubject
      });

      await helper.waitForUpdate(50);

      const triangle = helper.querySelectorSVG('path.display-overlay-triangle') as SVGPathElement;
      expect(triangle).toBeTruthy();
      expect(triangle.style.display).not.toBe('none');
      
      const pathData = triangle.getAttribute('d') || '';
      // Should contain triangle path with decentered center (384, 641)
      expect(pathData).toContain('M 384 641');
    });

    test('should create M-shaped polygon in 120 mode', async () => {
      viewModeSubject.set('120');
      
      helper.renderComponent(DisplayOverlay, {
        viewMode: viewModeSubject
      });

      await helper.waitForUpdate(50);

      const triangle = helper.querySelectorSVG('path.display-overlay-triangle') as SVGPathElement;
      const pathData = triangle.getAttribute('d') || '';
      
      // Should have multiple line commands (L) for the polygon
      const lineCommands = (pathData.match(/L /g) || []).length;
      expect(lineCommands).toBeGreaterThanOrEqual(4); // At least 4 lines for the M shape
    });
  });

  describe('View Mode Changes', () => {
    test('should update overlay when view mode changes from 360 to 120', async () => {
      viewModeSubject.set('360');
      
      helper.renderComponent(DisplayOverlay, {
        viewMode: viewModeSubject
      });

      await helper.waitForUpdate(50);

      let path = helper.querySelectorSVG('path.display-overlay') as SVGPathElement;
      let triangle = helper.querySelectorSVG('path.display-overlay-triangle') as SVGPathElement;
      
      expect(path.style.display).not.toBe('none');
      expect(triangle.style.display).toBe('none');

      // Change to 120 mode
      viewModeSubject.set('120');
      await helper.waitForUpdate(50);

      path = helper.querySelectorSVG('path.display-overlay') as SVGPathElement;
      triangle = helper.querySelectorSVG('path.display-overlay-triangle') as SVGPathElement;
      
      expect(path.style.display).toBe('none');
      expect(triangle.style.display).not.toBe('none');
    });

    test('should update overlay when view mode changes from 120 to 360', async () => {
      viewModeSubject.set('120');
      
      helper.renderComponent(DisplayOverlay, {
        viewMode: viewModeSubject
      });

      await helper.waitForUpdate(50);

      let path = helper.querySelectorSVG('path.display-overlay') as SVGPathElement;
      let triangle = helper.querySelectorSVG('path.display-overlay-triangle') as SVGPathElement;
      
      expect(path.style.display).toBe('none');
      expect(triangle.style.display).not.toBe('none');

      // Change to 360 mode
      viewModeSubject.set('360');
      await helper.waitForUpdate(50);

      path = helper.querySelectorSVG('path.display-overlay') as SVGPathElement;
      triangle = helper.querySelectorSVG('path.display-overlay-triangle') as SVGPathElement;
      
      expect(path.style.display).not.toBe('none');
      expect(triangle.style.display).toBe('none');
    });
  });

  describe('Cleanup', () => {
    test('should cleanup subscriptions on destroy', () => {
      const { component } = helper.renderComponent(DisplayOverlay, {
        viewMode: viewModeSubject
      });

      // Change view mode
      viewModeSubject.set('120');

      // Destroy component
      component.destroy();

      // Should not throw errors
      viewModeSubject.set('360');
    });
  });
});
