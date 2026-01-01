import { TestEnvironment, ComponentTestHelper } from '../src';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { HeadingIndicator, HeadingIndicatorProps } from '../../html_ui/stormscope/components/HeadingIndicator';
import { Subject } from '@microsoft/msfs-sdk';

describe('HeadingIndicator Component', () => {
  let env: TestEnvironment;
  let helper: ComponentTestHelper;
  let headingSubject: Subject<number>;
  let viewModeSubject: Subject<'120' | '360'>;

  beforeEach(() => {
    env = new TestEnvironment();
    env.setup();
    helper = new ComponentTestHelper(env);
    headingSubject = Subject.create<number>(0);
    viewModeSubject = Subject.create<'120' | '360'>('360');
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

    test('should render 8 T-shaped azimuth markers', () => {
      helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      // The component renders groups with class "azimuth-marker"
      const markerGroups = helper.querySelectorAllSVG('g.azimuth-marker');
      expect(markerGroups.length).toBe(8);
      
      // Each group should contain 2 lines (leg and cap of the T)
      markerGroups.forEach(group => {
        const lines = group.querySelectorAll('line');
        expect(lines.length).toBe(2);
      });
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
      viewModeSubject.set('120');
      
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
      viewModeSubject.set('120');
      await helper.waitForUpdate(50);
      
      indicator = helper.querySelectorSVG('#heading-indicator');
      expect(indicator?.style.display).toBe('none');
    });
  });

  describe('Heading Updates', () => {
    test('should render markers at correct bearings', () => {
      helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      // The component renders markers at bearings: 30, 60, 90, 120, 240, 270, 300, 330
      // (skipping 0, 150, 180, 210)
      const expectedBearings = [30, 60, 90, 120, 240, 270, 300, 330];
      const markerGroups = helper.querySelectorAllSVG('g.azimuth-marker');
      
      expect(markerGroups.length).toBe(8);
      
      expectedBearings.forEach(bearing => {
        const marker = Array.from(markerGroups).find(m => 
          m.getAttribute('data-bearing') === bearing.toString()
        );
        expect(marker).toBeTruthy();
      });
    });
  });

  describe('Azimuth Markers', () => {
    test('should have T-shaped markers with correct structure', () => {
      helper.renderComponent(HeadingIndicator, {
        heading: headingSubject,
        viewMode: viewModeSubject
      });

      const markerGroups = helper.querySelectorAllSVG('g.azimuth-marker');
      expect(markerGroups.length).toBe(8);
      
      // Check that each marker has the correct T-shape structure
      markerGroups.forEach(group => {
        const lines = group.querySelectorAll('line');
        expect(lines.length).toBe(2); // Leg and cap
        
        // Check that transform contains translate and rotate
        const transform = group.getAttribute('transform') || '';
        expect(transform).toContain('translate(');
        expect(transform).toContain('rotate(');
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
      viewModeSubject.set('120');

      // Destroy component
      component.destroy();

      // Should not throw errors
      headingSubject.set(270);
      viewModeSubject.set('360');
    });
  });
});

