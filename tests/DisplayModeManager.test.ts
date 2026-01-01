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
    test('should initialize with default view mode 360', () => {
      expect(manager.getCurrentViewMode()).toBe('360');
    });

    test('should initialize with specified view mode', () => {
      const customManager = new DisplayModeManager('120');
      expect(customManager.getCurrentViewMode()).toBe('120');
    });
  });

  describe('View Mode', () => {
    test('should toggle view mode between 360 and 120', () => {
      expect(manager.getCurrentViewMode()).toBe('360');
      
      manager.toggleViewMode();
      expect(manager.getCurrentViewMode()).toBe('120');
      
      manager.toggleViewMode();
      expect(manager.getCurrentViewMode()).toBe('360');
    });

    test('should set specific view mode', () => {
      manager.setViewMode('120');
      expect(manager.getCurrentViewMode()).toBe('120');
      
      manager.setViewMode('360');
      expect(manager.getCurrentViewMode()).toBe('360');
    });
  });

  describe('Observable Updates', () => {
    test('should emit updates when view mode changes', async () => {
      const initialMode = manager.getCurrentViewMode();
      
      manager.toggleViewMode();
      
      const newMode = await ObservableTestHelper.waitForValue(
        manager.viewMode,
        (mode) => mode !== initialMode,
        1000
      );
      
      expect(newMode).not.toBe(initialMode);
      expect(['360', '120']).toContain(newMode);
    });
  });
});
