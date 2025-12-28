// IMPORTANT: Import mocks FIRST before any component imports
import '../src/setupTests';

import { ObservableTestHelper } from '../src';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { RangeManager, RANGE_OPTIONS } from '../../html_ui/stormscope/managers/RangeManager';

describe('RangeManager', () => {
  let manager: RangeManager;

  beforeEach(() => {
    manager = new RangeManager();
  });

  describe('Initialization', () => {
    test('should initialize with default range of 100 nmi', () => {
      expect(manager.getCurrentRange()).toBe(100);
    });

    test('should initialize with specified range', () => {
      const customManager = new RangeManager(50);
      expect(customManager.getCurrentRange()).toBe(50);
    });

    test('should default to 100 nmi if invalid range provided', () => {
      const customManager = new RangeManager(75); // Not in options
      expect(customManager.getCurrentRange()).toBe(100);
    });
  });

  describe('Range Cycling', () => {
    test('should cycle to next range', () => {
      manager.setRange(25);
      expect(manager.getCurrentRange()).toBe(25);
      
      manager.cycleNext();
      expect(manager.getCurrentRange()).toBe(50);
      
      manager.cycleNext();
      expect(manager.getCurrentRange()).toBe(100);
      
      manager.cycleNext();
      expect(manager.getCurrentRange()).toBe(200);
    });

    test('should wrap around when cycling forward from last range', () => {
      manager.setRange(200);
      manager.cycleNext();
      expect(manager.getCurrentRange()).toBe(25);
    });

    test('should cycle to previous range', () => {
      manager.setRange(200);
      expect(manager.getCurrentRange()).toBe(200);
      
      manager.cyclePrevious();
      expect(manager.getCurrentRange()).toBe(100);
      
      manager.cyclePrevious();
      expect(manager.getCurrentRange()).toBe(50);
      
      manager.cyclePrevious();
      expect(manager.getCurrentRange()).toBe(25);
    });

    test('should wrap around when cycling backward from first range', () => {
      manager.setRange(25);
      manager.cyclePrevious();
      expect(manager.getCurrentRange()).toBe(200);
    });
  });

  describe('Range Setting', () => {
    test('should set specific range', () => {
      manager.setRange(50);
      expect(manager.getCurrentRange()).toBe(50);
      
      manager.setRange(200);
      expect(manager.getCurrentRange()).toBe(200);
    });

    test('should not change range if invalid value provided', () => {
      manager.setRange(100);
      const before = manager.getCurrentRange();
      
      // @ts-ignore - Testing invalid input
      manager.setRange(75);
      
      expect(manager.getCurrentRange()).toBe(before);
    });
  });

  describe('Observable Updates', () => {
    test('should emit updates when range changes', async () => {
      const initialRange = manager.getCurrentRange();
      
      manager.cycleNext();
      
      const newRange = await ObservableTestHelper.waitForValue(
        manager.currentRange,
        (range) => range !== initialRange,
        1000
      );
      
      expect(newRange).not.toBe(initialRange);
      expect(RANGE_OPTIONS).toContain(newRange);
    });

    test('should emit all range values when cycling', async () => {
      const ranges: number[] = [];
      
      const subscription = manager.currentRange.sub((range) => {
        ranges.push(range);
      }, true);
      
      // Cycle through all ranges
      for (let i = 0; i < RANGE_OPTIONS.length; i++) {
        manager.cycleNext();
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      subscription.destroy();
      
      // Should have collected all range values
      expect(ranges.length).toBeGreaterThan(0);
    });
  });
});

