// IMPORTANT: Import mocks FIRST before any component imports
import '../src/setupTests';

import { ObservableTestHelper } from '../src';
import { simVarMock } from '../src/mocks/SimVarMock';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { SelfTestSystem, SelfTestPhase } from '../../html_ui/stormscope/systems/SelfTestSystem';

describe('SelfTestSystem', () => {
  let system: SelfTestSystem;

  beforeEach(() => {
    simVarMock.reset();
    simVarMock.setSimVarValue('PLANE HEADING DEGREES TRUE', 'degrees', 0);
    system = new SelfTestSystem({
      initDuration: 100, // Fast for testing
      displayTestDuration: 100,
      dataTestDuration: 100
    });
  });

  afterEach(() => {
    system.stop();
    system.reset();
  });

  describe('Initialization', () => {
    test('should initialize with INITIALIZING phase', () => {
      const result = system.getCurrentResult();
      expect(result.phase).toBe(SelfTestPhase.INITIALIZING);
      expect(result.passed).toBe(false);
      expect(result.progress).toBe(0);
    });

    test('should use default configuration', () => {
      const defaultSystem = new SelfTestSystem();
      const result = defaultSystem.getCurrentResult();
      expect(result.phase).toBe(SelfTestPhase.INITIALIZING);
    });

    test('should use custom configuration', () => {
      const customSystem = new SelfTestSystem({
        initDuration: 500,
        displayTestDuration: 1000,
        dataTestDuration: 500
      });
      const result = customSystem.getCurrentResult();
      expect(result.phase).toBe(SelfTestPhase.INITIALIZING);
    });
  });

  describe('Self-Test Sequence', () => {
    test('should start self-test sequence', () => {
      system.start();
      
      const result = system.getCurrentResult();
      expect(result.phase).toBe(SelfTestPhase.INITIALIZING);
      expect(result.progress).toBeGreaterThanOrEqual(0);
    });

    test('should progress through initialization phase', async () => {
      system.start();
      
      // Wait for initialization to progress
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result = system.getCurrentResult();
      expect(result.progress).toBeGreaterThan(0);
      expect(result.progress).toBeLessThanOrEqual(1);
    });

    test('should transition to display test phase', async () => {
      system.start();
      
      // Wait for initialization to complete (with buffer)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const result = system.getCurrentResult();
      // Should be in display test phase or beyond
      expect([SelfTestPhase.DISPLAY_TEST, SelfTestPhase.DATA_TEST, SelfTestPhase.COMPLETE]).toContain(result.phase);
    });

    test('should transition to data test phase', async () => {
      system.start();
      
      // Wait for display test to complete (with buffer)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const result = system.getCurrentResult();
      // Should be in data test phase or complete
      expect([SelfTestPhase.DATA_TEST, SelfTestPhase.COMPLETE]).toContain(result.phase);
    });

    test('should complete successfully', async () => {
      system.start();
      
      // Wait for all phases to complete (with buffer)
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const result = await ObservableTestHelper.waitForValue(
        system.result,
        (r) => r.phase === SelfTestPhase.COMPLETE || r.phase === SelfTestPhase.FAILED,
        1000
      );
      
      expect(result.phase).toBe(SelfTestPhase.COMPLETE);
      expect(result.passed).toBe(true);
      expect(result.progress).toBe(1);
    });
  });

  describe('Stop and Reset', () => {
    test('should stop self-test sequence', () => {
      system.start();
      system.stop();
      
      // Test should be stopped (may still be in a phase, but not progressing)
      expect(() => system.stop()).not.toThrow();
    });

    test('should reset self-test system', () => {
      system.start();
      system.reset();
      
      const result = system.getCurrentResult();
      expect(result.phase).toBe(SelfTestPhase.INITIALIZING);
      expect(result.progress).toBe(0);
    });
  });

  describe('Observable Updates', () => {
    test('should emit result updates during test', async () => {
      const results: any[] = [];
      
      const subscription = system.result.sub((result) => {
        results.push(result);
      }, true);
      
      system.start();
      
      // Wait for some progress
      await new Promise(resolve => setTimeout(resolve, 150));
      
      subscription.destroy();
      
      // Should have collected multiple results
      expect(results.length).toBeGreaterThan(0);
    });

    test('should emit completion result', async () => {
      system.start();
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 350));
      
      const result = await ObservableTestHelper.waitForValue(
        system.result,
        (r) => r.phase === SelfTestPhase.COMPLETE,
        1000
      );
      
      expect(result.phase).toBe(SelfTestPhase.COMPLETE);
      expect(result.passed).toBe(true);
    });
  });

  describe('Progress Tracking', () => {
    test('should track progress through phases', async () => {
      system.start();
      
      // Check progress at different times
      await new Promise(resolve => setTimeout(resolve, 50));
      const result1 = system.getCurrentResult();
      expect(result1.progress).toBeGreaterThan(0);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      const result2 = system.getCurrentResult();
      expect(result2.progress).toBeGreaterThan(result1.progress);
    });
  });
});

