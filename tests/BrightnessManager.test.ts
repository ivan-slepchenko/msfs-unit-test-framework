// IMPORTANT: Import mocks FIRST before any component imports
import '../src/setupTests';

import { ObservableTestHelper } from '../src';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { BrightnessManager } from '../../html_ui/stormscope/managers/BrightnessManager';

describe('BrightnessManager', () => {
  let manager: BrightnessManager;

  beforeEach(() => {
    manager = new BrightnessManager();
  });

  describe('Initialization', () => {
    test('should initialize with default brightness', () => {
      expect(manager.getCurrentBrightness()).toBe(0.8);
    });

    test('should use custom configuration', () => {
      const customManager = new BrightnessManager({
        defaultBrightness: 0.5,
        minBrightness: 0.2,
        maxBrightness: 0.9,
        stepSize: 0.05
      });
      expect(customManager.getCurrentBrightness()).toBe(0.5);
    });
  });

  describe('Brightness Control', () => {
    test('should increase brightness', () => {
      manager.setBrightness(0.5);
      manager.increase();
      
      expect(manager.getCurrentBrightness()).toBeCloseTo(0.6, 5);
    });

    test('should not exceed maximum brightness', () => {
      manager.setBrightness(0.95);
      manager.increase();
      
      expect(manager.getCurrentBrightness()).toBeLessThanOrEqual(1.0);
    });

    test('should decrease brightness', () => {
      manager.setBrightness(0.8);
      manager.decrease();
      
      expect(manager.getCurrentBrightness()).toBeCloseTo(0.7, 5);
    });

    test('should not go below minimum brightness', () => {
      manager.setBrightness(0.15);
      manager.decrease();
      
      expect(manager.getCurrentBrightness()).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('Brightness Setting', () => {
    test('should set specific brightness value', () => {
      manager.setBrightness(0.5);
      expect(manager.getCurrentBrightness()).toBe(0.5);
      
      manager.setBrightness(0.9);
      expect(manager.getCurrentBrightness()).toBe(0.9);
    });

    test('should clamp brightness to valid range', () => {
      manager.setBrightness(1.5); // Above max
      expect(manager.getCurrentBrightness()).toBeLessThanOrEqual(1.0);
      
      manager.setBrightness(-0.1); // Below min
      expect(manager.getCurrentBrightness()).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('Reset', () => {
    test('should reset to default brightness', () => {
      manager.setBrightness(0.3);
      manager.reset();
      
      expect(manager.getCurrentBrightness()).toBe(0.8);
    });
  });

  describe('Observable Updates', () => {
    test('should emit updates when brightness changes', async () => {
      const initialBrightness = manager.getCurrentBrightness();
      
      manager.increase();
      
      const newBrightness = await ObservableTestHelper.waitForValue(
        manager.brightness,
        (brightness) => brightness !== initialBrightness,
        1000
      );
      
      expect(newBrightness).not.toBe(initialBrightness);
      expect(newBrightness).toBeGreaterThanOrEqual(0.1);
      expect(newBrightness).toBeLessThanOrEqual(1.0);
    });
  });
});

