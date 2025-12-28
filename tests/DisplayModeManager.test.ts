// IMPORTANT: Import mocks FIRST before any component imports
import '../src/setupTests';

import { ObservableTestHelper } from '../src';
// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import { DisplayModeManager } from '../../html_ui/stormscope/managers/DisplayModeManager';

describe('DisplayModeManager', () => {
  let manager: DisplayModeManager;

  beforeEach(() => {
    manager = new DisplayModeManager();
  });

  describe('Initialization', () => {
    test('should initialize with default display mode STRIKE', () => {
      expect(manager.getCurrentDisplayMode()).toBe('STRIKE');
    });

    test('should initialize with default view mode 360', () => {
      expect(manager.getCurrentViewMode()).toBe('360');
    });

    test('should initialize with specified modes', () => {
      const customManager = new DisplayModeManager('CELL', 'forward');
      expect(customManager.getCurrentDisplayMode()).toBe('CELL');
      expect(customManager.getCurrentViewMode()).toBe('forward');
    });
  });

  describe('Display Mode', () => {
    test('should toggle display mode between STRIKE and CELL', () => {
      expect(manager.getCurrentDisplayMode()).toBe('STRIKE');
      
      manager.toggleDisplayMode();
      expect(manager.getCurrentDisplayMode()).toBe('CELL');
      
      manager.toggleDisplayMode();
      expect(manager.getCurrentDisplayMode()).toBe('STRIKE');
    });

    test('should set specific display mode', () => {
      manager.setDisplayMode('CELL');
      expect(manager.getCurrentDisplayMode()).toBe('CELL');
      
      manager.setDisplayMode('STRIKE');
      expect(manager.getCurrentDisplayMode()).toBe('STRIKE');
    });
  });

  describe('View Mode', () => {
    test('should toggle view mode between 360 and forward', () => {
      expect(manager.getCurrentViewMode()).toBe('360');
      
      manager.toggleViewMode();
      expect(manager.getCurrentViewMode()).toBe('forward');
      
      manager.toggleViewMode();
      expect(manager.getCurrentViewMode()).toBe('360');
    });

    test('should set specific view mode', () => {
      manager.setViewMode('forward');
      expect(manager.getCurrentViewMode()).toBe('forward');
      
      manager.setViewMode('360');
      expect(manager.getCurrentViewMode()).toBe('360');
    });
  });

  describe('Observable Updates', () => {
    test('should emit updates when display mode changes', async () => {
      const initialMode = manager.getCurrentDisplayMode();
      
      manager.toggleDisplayMode();
      
      const newMode = await ObservableTestHelper.waitForValue(
        manager.displayMode,
        (mode) => mode !== initialMode,
        1000
      );
      
      expect(newMode).not.toBe(initialMode);
      expect(['STRIKE', 'CELL']).toContain(newMode);
    });

    test('should emit updates when view mode changes', async () => {
      const initialMode = manager.getCurrentViewMode();
      
      manager.toggleViewMode();
      
      const newMode = await ObservableTestHelper.waitForValue(
        manager.viewMode,
        (mode) => mode !== initialMode,
        1000
      );
      
      expect(newMode).not.toBe(initialMode);
      expect(['360', 'forward']).toContain(newMode);
    });
  });
});

