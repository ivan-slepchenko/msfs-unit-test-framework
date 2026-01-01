import '../src/setupTests';
import { TestEnvironment, ComponentTestHelper } from '../src';
import { Subject } from '@microsoft/msfs-sdk';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { MenuPage, MenuPageProps } from '../../html_ui/stormscope/components/MenuPage';

describe('MenuPage Component', () => {
  let env: TestEnvironment;
  let helper: ComponentTestHelper;
  let viewModeSubject: Subject<'120' | '360'>;
  let onCloseMock: jest.Mock;
  let onSelectionChangeMock: jest.Mock;
  let onToggleViewModeMock: jest.Mock;

  beforeEach(() => {
    env = new TestEnvironment();
    env.setup();
    helper = new ComponentTestHelper(env);
    viewModeSubject = Subject.create<'120' | '360'>('360');
    onCloseMock = jest.fn();
    onSelectionChangeMock = jest.fn();
    onToggleViewModeMock = jest.fn();
  });

  afterEach(() => {
    helper.cleanup();
    env.teardown();
  });

  describe('Rendering', () => {
    test('should render menu page container', () => {
      const { element } = helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 0,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
      });

      expect(element).toBeTruthy();
      expect(element.tagName).toBe('g');
      expect(element.id).toBe('menu-page');
    });

    test('should render background overlay', () => {
      helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 0,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
      });

      const bg = helper.querySelectorSVG('rect.menu-overlay-bg');
      expect(bg).toBeTruthy();
      expect(bg?.getAttribute('fill')).toBe('black');
      expect(parseFloat(bg?.getAttribute('width') || '0')).toBe(768);
      expect(parseFloat(bg?.getAttribute('height') || '0')).toBe(768);
    });

    test('should render menu title', () => {
      helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 0,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
      });

      const title = helper.querySelectorSVG('text.menu-title');
      expect(title).toBeTruthy();
      expect(title?.textContent).toBe('MENU');
    });

    test('should render menu items', () => {
      helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 0,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
      });

      // Should have 2 menu items: Weather View and Self Test
      const item0 = helper.querySelectorSVG('#menu-item-0');
      const item1 = helper.querySelectorSVG('#menu-item-1');
      
      expect(item0).toBeTruthy();
      expect(item1).toBeTruthy();
    });

    test('should render menu item labels', () => {
      helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 0,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
      });

      const labels = helper.querySelectorAllSVG('text.menu-item-label');
      expect(labels.length).toBe(2);
      
      expect(labels[0].textContent).toBe('Weather View');
      expect(labels[1].textContent).toBe('Self Test');
    });
  });

  describe('Selection', () => {
    test('should highlight selected item', () => {
      helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 0,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
      });

      // First item should be selected
      const bg0 = helper.querySelectorSVG('#menu-item-0 rect.menu-item-bg');
      expect(bg0).toBeTruthy();
      
      // Second item should not be selected
      const bg1 = helper.querySelectorSVG('#menu-item-1 rect.menu-item-bg');
      expect(bg1).toBeFalsy();
    });

    test('should change selection highlight when selectedIndex changes', () => {
      const { component } = helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 0,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
      });

      // Re-render with different selectedIndex
      helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 1,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
      });

      // Second item should now be selected
      const bg1 = helper.querySelectorSVG('#menu-item-1 rect.menu-item-bg');
      expect(bg1).toBeTruthy();
    });

    test('should apply correct text color for selected item', () => {
      helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 0,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
      });

      const label0 = helper.querySelectorSVG('#menu-item-0 text.menu-item-label') as SVGTextElement;
      expect(label0.getAttribute('fill')).toBe('black'); // Selected = black text
      
      const label1 = helper.querySelectorSVG('#menu-item-1 text.menu-item-label') as SVGTextElement;
      expect(label1.getAttribute('fill')).toBe('var(--stormscope-green)'); // Not selected = green text
    });
  });

  describe('View Mode Display', () => {
    test('should display current view mode for Weather View item', () => {
      viewModeSubject.set('360');
      
      helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 0,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
      });

      const value0 = helper.querySelectorSVG('#menu-item-0 text.menu-item-value') as SVGTextElement;
      expect(value0.textContent).toBe('360°');
    });

    test('should update view mode display when viewMode changes', async () => {
      viewModeSubject.set('360');
      
      helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 0,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
      });

      await helper.waitForUpdate(100); // Wait for onAfterRender subscription

      let value0 = helper.querySelectorSVG('#menu-item-0 text.menu-item-value') as SVGTextElement;
      expect(value0.textContent).toBe('360°');

      // Change view mode
      viewModeSubject.set('120');
      await helper.waitForUpdate(100); // Wait for subscription callback

      value0 = helper.querySelectorSVG('#menu-item-0 text.menu-item-value') as SVGTextElement;
      expect(value0.textContent).toBe('120°');
    });

    test('should display PASSED for Self Test item', () => {
      helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 0,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
      });

      const value1 = helper.querySelectorSVG('#menu-item-1 text.menu-item-value') as SVGTextElement;
      expect(value1.textContent).toBe('PASSED');
    });
  });

  describe('Menu Item Positioning', () => {
    test('should center menu items vertically', () => {
      helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 0,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
      });

      const content = helper.querySelectorSVG('#menu-content');
      expect(content).toBeTruthy();
      const transform = content?.getAttribute('transform') || '';
      expect(transform).toContain('translate(384, 384)'); // Centered at display center
    });
  });

  describe('Cleanup', () => {
    test('should cleanup subscriptions on destroy', () => {
      const { component } = helper.renderComponent(MenuPage, {
        onClose: onCloseMock,
        selectedIndex: 0,
        onSelectionChange: onSelectionChangeMock,
        viewMode: viewModeSubject,
        onToggleViewMode: onToggleViewModeMock
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
