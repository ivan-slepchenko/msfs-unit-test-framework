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
    test('should have MENU binding with all key formats (Control+Q)', () => {
      expect(StormScopeKeyboardBindings.MENU.key).toBe('KeyQ');
      expect(StormScopeKeyboardBindings.MENU.keyCode).toBe(81);
      expect(StormScopeKeyboardBindings.MENU.keyChar).toBe('q');
      expect(StormScopeKeyboardBindings.MENU.ctrl).toBe(true);
      expect(StormScopeKeyboardBindings.MENU.shift).toBe(false);
      expect(StormScopeKeyboardBindings.MENU.alt).toBe(false);
    });

    test('should have WX binding with all key formats (Control+W)', () => {
      expect(StormScopeKeyboardBindings.WX.key).toBe('KeyW');
      expect(StormScopeKeyboardBindings.WX.keyCode).toBe(87);
      expect(StormScopeKeyboardBindings.WX.keyChar).toBe('w');
      expect(StormScopeKeyboardBindings.WX.ctrl).toBe(true);
    });

    test('should have RANGE binding with all key formats (Control+E)', () => {
      expect(StormScopeKeyboardBindings.RANGE.key).toBe('KeyE');
      expect(StormScopeKeyboardBindings.RANGE.keyCode).toBe(69);
      expect(StormScopeKeyboardBindings.RANGE.keyChar).toBe('e');
      expect(StormScopeKeyboardBindings.RANGE.ctrl).toBe(true);
    });

    test('should have CLEAR binding with all key formats (Control+R)', () => {
      expect(StormScopeKeyboardBindings.CLEAR.key).toBe('KeyR');
      expect(StormScopeKeyboardBindings.CLEAR.keyCode).toBe(82);
      expect(StormScopeKeyboardBindings.CLEAR.keyChar).toBe('r');
      expect(StormScopeKeyboardBindings.CLEAR.ctrl).toBe(true);
    });
  });

  describe('matchesKeyboardBinding', () => {
    describe('Modern event.code support', () => {
      test('should match MENU binding using event.code', () => {
        const event = new KeyboardEvent('keydown', {
          code: 'KeyQ',
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        });
        
        expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.MENU)).toBe(true);
      });

      test('should match WX binding using event.code', () => {
        const event = new KeyboardEvent('keydown', {
          code: 'KeyW',
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        });
        
        expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.WX)).toBe(true);
      });
    });

    describe('Legacy event.keyCode support (Coherent GT compatibility)', () => {
      test('should match MENU binding using event.keyCode', () => {
        const event = {
          code: undefined,
          keyCode: 81, // Q
          key: undefined,
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        } as unknown as KeyboardEvent;
        
        expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.MENU)).toBe(true);
      });

      test('should match WX binding using event.keyCode', () => {
        const event = {
          code: undefined,
          keyCode: 87, // W
          key: undefined,
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        } as unknown as KeyboardEvent;
        
        expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.WX)).toBe(true);
      });

      test('should match RANGE binding using event.keyCode', () => {
        const event = {
          code: undefined,
          keyCode: 69, // E
          key: undefined,
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        } as unknown as KeyboardEvent;
        
        expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.RANGE)).toBe(true);
      });

      test('should match CLEAR binding using event.keyCode', () => {
        const event = {
          code: undefined,
          keyCode: 82, // R
          key: undefined,
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        } as unknown as KeyboardEvent;
        
        expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.CLEAR)).toBe(true);
      });
    });

    describe('Fallback event.key support', () => {
      test('should match MENU binding using event.key (lowercase)', () => {
        const event = {
          code: undefined,
          keyCode: undefined,
          key: 'q',
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        } as unknown as KeyboardEvent;
        
        expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.MENU)).toBe(true);
      });

      test('should match WX binding using event.key (lowercase)', () => {
        const event = {
          code: undefined,
          keyCode: undefined,
          key: 'w',
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        } as unknown as KeyboardEvent;
        
        expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.WX)).toBe(true);
      });

      test('should not match if event.key is uppercase', () => {
        const event = {
          code: undefined,
          keyCode: undefined,
          key: 'Q', // Uppercase
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        } as unknown as KeyboardEvent;
        
        // Should not match because we compare lowercase
        expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.MENU)).toBe(false);
      });
    });

    describe('Modifier key validation', () => {
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

      test('should not match if alt key is pressed', () => {
        const event = new KeyboardEvent('keydown', {
          code: 'KeyQ',
          ctrlKey: true,
          shiftKey: false,
          altKey: true
        });
        
        expect(matchesKeyboardBinding(event, StormScopeKeyboardBindings.MENU)).toBe(false);
      });
    });
  });

  describe('getSimEventFromKeyboard', () => {
    describe('Modern event.code support', () => {
      test('should return MENU event for Control+Q (event.code)', () => {
        const event = new KeyboardEvent('keydown', {
          code: 'KeyQ',
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        });
        
        expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.MENU);
      });

      test('should return WX event for Control+W (event.code)', () => {
        const event = new KeyboardEvent('keydown', {
          code: 'KeyW',
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        });
        
        expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.WX);
      });

      test('should return RANGE event for Control+E (event.code)', () => {
        const event = new KeyboardEvent('keydown', {
          code: 'KeyE',
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        });
        
        expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.RANGE);
      });

      test('should return CLEAR event for Control+R (event.code)', () => {
        const event = new KeyboardEvent('keydown', {
          code: 'KeyR',
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        });
        
        expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.CLEAR);
      });
    });

    describe('Legacy event.keyCode support (Coherent GT)', () => {
      test('should return MENU event for Control+Q (event.keyCode)', () => {
        const event = {
          code: undefined,
          keyCode: 81, // Q
          key: undefined,
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        } as unknown as KeyboardEvent;
        
        expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.MENU);
      });

      test('should return WX event for Control+W (event.keyCode)', () => {
        const event = {
          code: undefined,
          keyCode: 87, // W
          key: undefined,
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        } as unknown as KeyboardEvent;
        
        expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.WX);
      });

      test('should return RANGE event for Control+E (event.keyCode)', () => {
        const event = {
          code: undefined,
          keyCode: 69, // E
          key: undefined,
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        } as unknown as KeyboardEvent;
        
        expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.RANGE);
      });

      test('should return CLEAR event for Control+R (event.keyCode)', () => {
        const event = {
          code: undefined,
          keyCode: 82, // R
          key: undefined,
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        } as unknown as KeyboardEvent;
        
        expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.CLEAR);
      });
    });

    describe('Fallback event.key support', () => {
      test('should return MENU event for Control+Q (event.key)', () => {
        const event = {
          code: undefined,
          keyCode: undefined,
          key: 'q',
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        } as unknown as KeyboardEvent;
        
        expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.MENU);
      });

      test('should return WX event for Control+W (event.key)', () => {
        const event = {
          code: undefined,
          keyCode: undefined,
          key: 'w',
          ctrlKey: true,
          shiftKey: false,
          altKey: false
        } as unknown as KeyboardEvent;
        
        expect(getSimEventFromKeyboard(event)).toBe(StormScopeSimEvents.WX);
      });
    });

    describe('Error cases', () => {
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

