import '../src/setupTests';
import { TestEnvironment, ComponentTestHelper } from '../src';
import { Subject, UnitType } from '@microsoft/msfs-sdk';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { WeatherRadarWrapper } from '../../html_ui/stormscope/components/WeatherRadarWrapper';

describe('WeatherRadarWrapper Component (framework integration)', () => {
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

  test('should render underlying WeatherRadar element', () => {
    const range = Subject.create<number>(100);
    helper.renderComponent(WeatherRadarWrapper, {
      bingId: 'test-bing',
      bus: {},
      size: [300, 200],
      range,
    });

    const el = helper.querySelector('#weather-radar-test-bing');
    expect(el).toBeTruthy();
    expect(el?.classList.contains('weather-radar')).toBe(true);
  });

  test('should subscribe to range prop and update internal range subject', async () => {
    const range = Subject.create<number>(100);
    const { component } = helper.renderComponent(WeatherRadarWrapper, {
      bingId: 'test-bing',
      bus: {},
      size: [300, 200],
      range,
    });

    await helper.waitForUpdate(10);

    const internal = (component as any).rangeSubject;
    expect(internal).toBeTruthy();
    expect(internal.get().asUnit(UnitType.NMILE)).toBe(100);

    range.set(50);
    await helper.waitForUpdate(10);
    expect(internal.get().asUnit(UnitType.NMILE)).toBe(50);
  });

  test('update/wake/sleep should delegate to WeatherRadar instance', () => {
    const range = Subject.create<number>(100);
    const { component } = helper.renderComponent(WeatherRadarWrapper, {
      bingId: 'test-bing',
      bus: {},
      size: [300, 200],
      range,
    });

    const radar = (component as any).weatherRadarRef?.instance;
    expect(radar).toBeTruthy();

    // The Garmin adapter provides jest.fn() implementations
    component.update(0);
    component.wake();
    component.sleep();

    expect(radar.update).toHaveBeenCalled();
    expect(radar.wake).toHaveBeenCalled();
    expect(radar.sleep).toHaveBeenCalled();
  });

  test('destroy should unsubscribe from range updates', async () => {
    const range = Subject.create<number>(100);
    const { component } = helper.renderComponent(WeatherRadarWrapper, {
      bingId: 'test-bing',
      bus: {},
      size: [300, 200],
      range,
    });

    await helper.waitForUpdate(10);
    const internal = (component as any).rangeSubject;
    component.destroy();

    range.set(25);
    await helper.waitForUpdate(10);
    // Should remain at previous value after destroy
    expect(internal.get().asUnit(UnitType.NMILE)).toBe(100);
  });
});

