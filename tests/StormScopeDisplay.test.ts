import '../src/setupTests';
import { TestEnvironment, ComponentTestHelper } from '../src';
import { Subject } from '@microsoft/msfs-sdk';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { StormScopeDisplay } from '../../html_ui/stormscope/components/StormScopeDisplay';
import { RangeManager } from '../../html_ui/stormscope/managers/RangeManager';
import { DisplayModeManager } from '../../html_ui/stormscope/managers/DisplayModeManager';

describe('StormScopeDisplay (framework integration)', () => {
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

  test('should render key layers and labels', () => {
    const heading = Subject.create<number>(0);
    const rangeManager = new RangeManager();
    const displayModeManager = new DisplayModeManager();

    const isMenuVisible = Subject.create<boolean>(false);
    const isTestPageVisible = Subject.create<boolean>(false);
    const isOverlayVisible = Subject.create<boolean>(true);

    helper.renderComponent(StormScopeDisplay, {
      heading,
      rangeManager,
      displayModeManager,
      stormCells: [],
      isMenuVisible,
      onMenuToggle: jest.fn(),
      menuSelectedIndex: 0,
      onMenuSelectionChange: jest.fn(),
      onToggleViewMode: jest.fn(),
      isTestPageVisible,
      onTestPageClose: jest.fn(),
      isOverlayVisible,
    });

    expect(helper.querySelectorSVG('#components-container')).toBeTruthy();
    expect(helper.querySelectorSVG('#buttons-layer')).toBeTruthy();

    // Framework check: verify key texts exist (avoid relying on ID matching in non-<svg> root rendering)
    const allTexts = helper.querySelectorAllSVG('text').map(t => (t.textContent || '').trim());
    expect(allTexts).toContain('100nm');
    expect(allTexts).toContain('MENU');
    // Range ring label from RangeRings component
    expect(allTexts).toContain('25');
  });

  test('range label should update when range manager changes', async () => {
    const heading = Subject.create<number>(0);
    const rangeManager = new RangeManager();
    const displayModeManager = new DisplayModeManager();

    const isMenuVisible = Subject.create<boolean>(false);
    const isTestPageVisible = Subject.create<boolean>(false);
    const isOverlayVisible = Subject.create<boolean>(true);

    helper.renderComponent(StormScopeDisplay, {
      heading,
      rangeManager,
      displayModeManager,
      stormCells: [],
      isMenuVisible,
      onMenuToggle: jest.fn(),
      menuSelectedIndex: 0,
      onMenuSelectionChange: jest.fn(),
      onToggleViewMode: jest.fn(),
      isTestPageVisible,
      onTestPageClose: jest.fn(),
      isOverlayVisible,
    });

    await helper.waitForUpdate(10);
    const rangeLabel = helper.querySelectorAllSVG('text')
      .find(t => /^\d+nm$/.test((t.textContent || '').trim())) as SVGTextElement | undefined;
    expect(rangeLabel).toBeTruthy();
    expect((rangeLabel?.textContent || '').trim()).toBe('100nm');

    rangeManager.setRange(200);
    await helper.waitForUpdate(10);
    expect((rangeLabel?.textContent || '').trim()).toBe('200nm');
  });

  test('MENU button click should toggle menu when menu is hidden', async () => {
    const heading = Subject.create<number>(0);
    const rangeManager = new RangeManager();
    const displayModeManager = new DisplayModeManager();

    const isMenuVisible = Subject.create<boolean>(false);
    const isTestPageVisible = Subject.create<boolean>(false);
    const isOverlayVisible = Subject.create<boolean>(true);

    const onMenuToggle = jest.fn();

    helper.renderComponent(StormScopeDisplay, {
      heading,
      rangeManager,
      displayModeManager,
      stormCells: [],
      isMenuVisible,
      onMenuToggle,
      menuSelectedIndex: 0,
      onMenuSelectionChange: jest.fn(),
      onToggleViewMode: jest.fn(),
      isTestPageVisible,
      onTestPageClose: jest.fn(),
      isOverlayVisible,
    });

    await helper.waitForUpdate(10);

    const menuBtn = helper.querySelectorSVG('#menu-button') as SVGGElement;
    expect(menuBtn).toBeTruthy();
    const evt = new (env.getWindow().MouseEvent)('click', { bubbles: true });
    menuBtn.dispatchEvent(evt);

    expect(onMenuToggle).toHaveBeenCalled();
  });

  test('MENU button click should toggle view mode when menu is visible and Weather View selected', async () => {
    const heading = Subject.create<number>(0);
    const rangeManager = new RangeManager();
    const displayModeManager = new DisplayModeManager();

    const isMenuVisible = Subject.create<boolean>(true);
    const isTestPageVisible = Subject.create<boolean>(false);
    const isOverlayVisible = Subject.create<boolean>(true);

    const onToggleViewMode = jest.fn();

    helper.renderComponent(StormScopeDisplay, {
      heading,
      rangeManager,
      displayModeManager,
      stormCells: [],
      isMenuVisible,
      onMenuToggle: jest.fn(),
      menuSelectedIndex: 0, // Weather View
      onMenuSelectionChange: jest.fn(),
      onToggleViewMode,
      isTestPageVisible,
      onTestPageClose: jest.fn(),
      isOverlayVisible,
    });

    await helper.waitForUpdate(10);

    const menuBtn = helper.querySelectorSVG('#menu-button') as SVGGElement;
    const evt = new (env.getWindow().MouseEvent)('click', { bubbles: true });
    menuBtn.dispatchEvent(evt);

    expect(onToggleViewMode).toHaveBeenCalled();
  });
});

