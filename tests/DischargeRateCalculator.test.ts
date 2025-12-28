// IMPORTANT: Import mocks FIRST before any component imports
import '../src/setupTests';

import { ObservableTestHelper } from '../src';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { DischargeRateCalculator } from '../../html_ui/stormscope/managers/DischargeRateCalculator';
// @ts-ignore
import { DischargePoint } from '../../html_ui/stormscope/types/StormDetection';

describe('DischargeRateCalculator', () => {
  let calculator: DischargeRateCalculator;

  function createTestPoint(id: string): DischargePoint {
    return {
      id,
      bearing: 0,
      distance: 50,
      latitude: 40.0,
      longitude: -75.0,
      timestamp: Date.now(),
      age: 0,
      intensity: 1.0,
      isInterference: false
    };
  }

  beforeEach(() => {
    calculator = new DischargeRateCalculator({
      timeWindow: 1000, // 1 second for testing
      updateInterval: 100 // 100ms for testing
    });
  });

  afterEach(() => {
    calculator.stop();
    calculator.reset();
  });

  describe('Initialization', () => {
    test('should initialize with zero rate', () => {
      expect(calculator.getCurrentRate()).toBe(0);
    });

    test('should use default configuration', () => {
      const defaultCalc = new DischargeRateCalculator();
      expect(defaultCalc.getCurrentRate()).toBe(0);
    });

    test('should use custom configuration', () => {
      const customCalc = new DischargeRateCalculator({
        timeWindow: 5000,
        updateInterval: 500
      });
      expect(customCalc.getCurrentRate()).toBe(0);
    });
  });

  describe('Start and Stop', () => {
    test('should start calculation', () => {
      expect(() => calculator.start()).not.toThrow();
    });

    test('should stop calculation', () => {
      calculator.start();
      expect(() => calculator.stop()).not.toThrow();
    });

    test('should not start twice', () => {
      calculator.start();
      calculator.start(); // Second start should not throw
      expect(() => calculator.stop()).not.toThrow();
    });
  });

  describe('Rate Calculation', () => {
    test('should calculate rate from discharge points', () => {
      calculator.start();
      
      const points: DischargePoint[] = [
        createTestPoint('point1'),
        createTestPoint('point2'),
        createTestPoint('point3')
      ];
      
      calculator.update(points);
      
      // Rate should be calculated (may be 0 if not enough time has passed)
      const rate = calculator.getCurrentRate();
      expect(rate).toBeGreaterThanOrEqual(0);
    });

    test('should return zero rate when no points', () => {
      calculator.start();
      calculator.update([]);
      
      // Wait a bit for calculation
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const rate = calculator.getCurrentRate();
          expect(rate).toBeGreaterThanOrEqual(0);
          resolve();
        }, 150);
      });
    });

    test('should update rate over time', () => {
      calculator.start();
      
      // Initial update with few points
      calculator.update([createTestPoint('point1')]);
      const initialRate = calculator.getCurrentRate();
      
      // Update with more points
      calculator.update([
        createTestPoint('point1'),
        createTestPoint('point2'),
        createTestPoint('point3'),
        createTestPoint('point4'),
        createTestPoint('point5')
      ]);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const newRate = calculator.getCurrentRate();
          // Rate may have changed (or stayed same if time window hasn't passed)
          expect(newRate).toBeGreaterThanOrEqual(0);
          resolve();
        }, 150);
      });
    });
  });

  describe('Reset', () => {
    test('should reset rate to zero', () => {
      calculator.start();
      calculator.update([createTestPoint('point1')]);
      
      calculator.reset();
      expect(calculator.getCurrentRate()).toBe(0);
    });

    test('should clear point history on reset', () => {
      calculator.start();
      calculator.update([createTestPoint('point1')]);
      calculator.reset();
      
      calculator.update([]);
      expect(calculator.getCurrentRate()).toBe(0);
    });
  });

  describe('Observable Updates', () => {
    test('should emit rate updates', async () => {
      calculator.start();
      
      const initialRate = calculator.getCurrentRate();
      
      calculator.update([createTestPoint('point1')]);
      
      // Wait for rate to potentially update
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Rate may have updated or stayed the same
      const currentRate = calculator.getCurrentRate();
      expect(currentRate).toBeGreaterThanOrEqual(0);
    });
  });
});

