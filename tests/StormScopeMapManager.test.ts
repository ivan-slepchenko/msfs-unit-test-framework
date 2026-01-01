import '../src/setupTests';
import { TestEnvironment } from '../src';
import { EventBus, Vec2Math, Subject } from '@microsoft/msfs-sdk';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { StormScopeMapManager } from '../../html_ui/stormscope/managers/StormScopeMapManager';

describe('StormScopeMapManager (framework integration)', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = new TestEnvironment();
    env.setup();
  });

  afterEach(() => {
    env.teardown();
  });

  test('should construct and build map system without throwing', () => {
    const mgr = new StormScopeMapManager(new EventBus(), 1, 'bing-id');
    expect(mgr).toBeTruthy();
    expect(() => mgr.initializeProjection()).not.toThrow();
  });

  test('getMapElement should return a VNode with instance', () => {
    const mgr = new StormScopeMapManager(new EventBus(), 1, 'bing-id');
    const vnode = mgr.getMapElement();
    expect(vnode).toBeTruthy();
    expect(vnode.instance).toBeTruthy();
  });

  test('getMapRange should map nominal range to number', async () => {
    const mgr = new StormScopeMapManager(new EventBus(), 1, 'bing-id');

    // Subscribe and capture updates
    const values: number[] = [];
    const sub = mgr.getMapRange().sub(v => values.push(v), true);
    sub.destroy();

    expect(values.length).toBeGreaterThan(0);
    expect(typeof values[0]).toBe('number');
  });

  test('setMapRange should not throw and should update map range when value exists', async () => {
    const mgr = new StormScopeMapManager(new EventBus(), 1, 'bing-id');

    const got: number[] = [];
    const handle = mgr.getMapRange().sub(v => got.push(v), true);

    mgr.setMapRange(200);
    await new Promise(r => setTimeout(r, 10));
    handle.destroy();

    // Should include 200 at least once
    expect(got.some(v => v === 200)).toBe(true);
  });

  test('isMapReady should be false without projection or image', () => {
    const mgr = new StormScopeMapManager(new EventBus(), 1, 'bing-id');
    // No DOM / image for `.stormscope-map`
    expect(mgr.isMapReady()).toBe(false);
  });

  test('readNexradPixel should read intensity from existing canvas when available', () => {
    const mgr = new StormScopeMapManager(new EventBus(), 1, 'bing-id');
    mgr.initializeProjection();

    // Create a map container with a canvas and a fake 2d context
    const mapContainer = document.createElement('div');
    mapContainer.className = 'stormscope-map';
    document.body.appendChild(mapContainer);

    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    mapContainer.appendChild(canvas);

    const originalGetContext = (canvas as any).getContext;
    (canvas as any).getContext = (_: string) => {
      return {
        getImageData: (_x: number, _y: number) => ({ data: new Uint8ClampedArray([0, 200, 0, 255]) }), // green => 0.3
      };
    };

    // With default projection in adapter: project => [0.5, 0.5]
    const intensity = mgr.readNexradPixel(40, -75);

    // Cleanup
    (canvas as any).getContext = originalGetContext;
    mapContainer.remove();

    expect(intensity).toBe(0.3);
  });
});

