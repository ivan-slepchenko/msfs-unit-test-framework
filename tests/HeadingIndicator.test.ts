import { TestEnvironment, ComponentTestHelper } from '../src';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { HeadingIndicator, HeadingIndicatorProps } from '../../html_ui/stormscope/components/HeadingIndicator';
import { Subject } from '@microsoft/msfs-sdk';

describe('HeadingIndicator Component', () => {
  let env: TestEnvironment;
  let helper: ComponentTestHelper;
  let headingSubject: Subject<number>;
  let viewModeSubject: Subject<'forward' | '360'>;

  beforeEach(() => {
    env = new TestEnvironment();
    env.setup();
    helper = new ComponentTestHelper(env);
    headingSubject = Subject.create<number>(0);
    viewModeSubject = Subject.create<'forward' | '360'>('360');
  });

  afterEach(() => {
    helper.cleanup();
    env.teardown();
  });

  describe('Rendering', () => {
    test('should render heading indicator container', () => {
      const { element } = helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      expect(element).toBeTruthy();
      expect(element.tagName).toBe('g');
      expect(element.id).toBe('heading-indicator');
    });

    test('should render outer ring', () => {
      helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      const ring = helper.querySelectorSVG('circle.heading-ring');
      expect(ring).toBeTruthy();
      expect(parseFloat(ring?.getAttribute('r') || '0')).toBe(190);
    });

    test('should render 8 azimuth markers', () => {
      helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      const markers = helper.querySelectorAllSVG('line.azimuth-marker');
      expect(markers.length).toBe(8);
    });

    test('should render heading arrow', () => {
      helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      const arrow = helper.querySelectorSVG('polygon.heading-arrow');
      expect(arrow).toBeTruthy();
    });
  });

  describe('View Mode', () => {
    test('should be visible in 360° mode', async () => {
      viewModeSubject.set('360');
      
      const { element } = helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      await helper.waitForUpdate(50);
      
      const indicator = helper.querySelectorSVG('#heading-indicator');
      expect(indicator).toBeTruthy();
      // Should be visible (display not set to none)
      const display = indicator?.style.display || '';
      expect(display).not.toBe('none');
    });

    test('should be hidden in forward mode', async () => {
      viewModeSubject.set('forward');
      
      helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      await helper.waitForUpdate(50);
      
      const indicator = helper.querySelectorSVG('#heading-indicator');
      expect(indicator).toBeTruthy();
      // Should be hidden
      expect(indicator?.style.display).toBe('none');
    });

    test('should toggle visibility when view mode changes', async () => {
      viewModeSubject.set('360');
      
      helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      await helper.waitForUpdate(50);
      
      let indicator = helper.querySelectorSVG('#heading-indicator');
      expect(indicator?.style.display).not.toBe('none');

      // Change to forward mode
      viewModeSubject.set('forward');
      await helper.waitForUpdate(50);
      
      indicator = helper.querySelectorSVG('#heading-indicator');
      expect(indicator?.style.display).toBe('none');
    });
  });

  describe('Heading Updates', () => {
    test('should update arrow position when heading changes', async () => {
      headingSubject.set(0); // North
      
      helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      await helper.waitForUpdate(50);

      let arrow = helper.querySelectorSVG('#heading-arrow');
      let transform = arrow?.getAttribute('transform') || '';
      expect(transform).toContain('rotate(0)');

      // Change heading to 90° (East)
      headingSubject.set(90);
      await helper.waitForUpdate(50);

      arrow = helper.querySelectorSVG('#heading-arrow');
      transform = arrow?.getAttribute('transform') || '';
      expect(transform).toContain('rotate(90)');
    });

    test('should position arrow correctly for different headings', async () => {
      headingSubject.set(45);
      
      helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      await helper.waitForUpdate(50);

      const arrow = helper.querySelectorSVG('#heading-arrow');
      const transform = arrow?.getAttribute('transform') || '';
      
      // Should contain translate with calculated position and rotation
      expect(transform).toContain('translate(');
      expect(transform).toContain('rotate(45)');
    });
  });

  describe('Azimuth Markers', () => {
    test('should have markers at correct bearings', () => {
      helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      const expectedBearings = [0, 45, 90, 135, 180, 225, 270, 315];
      const markers = helper.querySelectorAllSVG('line.azimuth-marker');
      
      expect(markers.length).toBe(8);
      
      expectedBearings.forEach(bearing => {
        const marker = Array.from(markers).find(m => 
          m.getAttribute('data-bearing') === bearing.toString()
        );
        expect(marker).toBeTruthy();
      });
    });
  });

  describe('Cleanup', () => {
    test('should cleanup subscriptions on destroy', () => {
      const { component } = helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      // Change values
      headingSubject.set(180);
      viewModeSubject.set('forward');

      // Destroy component
      component.destroy();

      // Should not throw errors
      headingSubject.set(270);
      viewModeSubject.set('360');
    });
  });
});

