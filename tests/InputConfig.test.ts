// IMPORTANT: Import mocks FIRST before any component imports
import '../src/setupTests';

// @ts-ignore - Type conflict between SDK versions, but runtime is fine
import {
  StormScopeSimEvents,
  StormScopeKeyboardBindings,
  matchesKeyboardBinding,
  getSimEventFromKeyboard,
  KeyboardToEventMap
} from '../../html_ui/stormscope/config/input';

describe('Input Configuration', () => {
  describe('StormScopeSimEvents', () => {
    test('should have all required events', () => {
      expect(StormScopeSimEvents.MENU).toBe('STORMSCOPE_MENU');
      expect(StormScopeSimEvents.WX).toBe('STORMSCOPE_WX');
      expect(StormScopeSimEvents.RANGE).toBe('STORMSCOPE_RANGE');
      expect(StormScopeSimEvents.CLEAR).toBe('STORMSCOPE_CLEAR');
    });
  });

  describe('StormScopeKeyboardBindings', () => {
    test('should have MENU binding (Control+Q)', () => {
      expect(StormScopeKeyboardBindings.MENU.key).toBe('KeyQ');
      expect(StormScopeKeyboardBindings.MENU.ctrl).toBe(true);
      expect(StormScopeKeyboardBindings.MENU.shift).toBe(false);
      expect(StormScopeKeyboardBindings.MENU.alt).toBe(false);
    });

    test('should have WX binding (Control+W)', () => {
      expect(StormScopeKeyboardBindings.WX.key).toBe('KeyW');
      expect(StormScopeKeyboardBindings.WX.ctrl).toBe(true);
    });

    test('should have RANGE binding (Control+E)', () => {
      expect(StormScopeKeyboardBindings.RANGE.key).toBe('KeyE');
      expect(StormScopeKeyboardBindings.RANGE.ctrl).toBe(true);
    });

    test('should have CLEAR binding (Control+R)', () => {
      expect(StormScopeKeyboardBindings.CLEAR.key).toBe('KeyR');
      expect(StormScopeKeyboardBindings.CLEAR.ctrl).toBe(true);
    });
  });

  describe('matchesKeyboardBinding', () => {
    test('should match MENU binding', () => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyQ',
        ctrlKey: true,
        shiftKey: false,
        altKey: false
      });
      
      expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.MENU)).toBe(true);
    });

    test('should not match if key is different', () => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyA',
        ctrlKey: true,
        shiftKey: false,
        altKey: false
      });
      
      expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.MENU)).toBe(false);
    });

    test('should not match if ctrl key is missing', () => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyQ',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      });
      
      expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.MENU)).toBe(false);
    });

    test('should not match if shift key is pressed', () => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyQ',
        ctrlKey: true,
        shiftKey: true,
        altKey: false
      });
      
      expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.MENU)).toBe(false);
    });
  });

  describe('getSimEventFromKeyboard', () => {
    test('should return MENU event for Control+Q', () => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyQ',
        ctrlKey: true,
        shiftKey: false,
        altKey: false
      });
      
      expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.MENU);
    });

    test('should return WX event for Control+W', () => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyW',
        ctrlKey: true,
        shiftKey: false,
        altKey: false
      });
      
      expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.WX);
    });

    test('should return RANGE event for Control+E', () => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyE',
        ctrlKey: true,
        shiftKey: false,
        altKey: false
      });
      
      expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.RANGE);
    });

    test('should return CLEAR event for Control+R', () => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyR',
        ctrlKey: true,
        shiftKey: false,
        altKey: false
      });
      
      expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.CLEAR);
    });

    test('should return null for unmatched key combination', () => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyA',
        ctrlKey: true,
        shiftKey: false,
        altKey: false
      });
      
      expect(getSimEventFromKeyboard(event)).toBeNull();
    });

    test('should return null for key without ctrl', () => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyQ',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      });
      
      expect(getSimEventFromKeyboard(event)).toBeNull();
    });
  });

  describe('KeyboardToEventMap', () => {
    test('should map all keyboard combinations to events', () => {
      expect(KeyboardToEventMap['Control+Q']).toBe(StormScopeSimEvents.MENU);
      expect(KeyboardToEventMap['Control+W']).toBe(StormScopeSimEvents.WX);
      expect(KeyboardToEventMap['Control+E']).toBe(StormScopeSimEvents.RANGE);
      expect(KeyboardToEventMap['Control+R']).toBe(StormScopeSimEvents.CLEAR);
    });
  });
});

