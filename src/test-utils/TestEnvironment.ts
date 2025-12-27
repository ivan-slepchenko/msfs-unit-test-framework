/**
 * Test environment setup for MSFS instrument testing.
 * 
 * Sets up jsdom, mocks SimVar and Coherent APIs, and provides utilities for testing.
 */

import { JSDOM } from 'jsdom';
import { SimVarMock, simVarMock } from '../mocks/SimVarMock';
import { CoherentMock, coherentMock } from '../mocks/CoherentMock';
import { Subject } from '@microsoft/msfs-sdk';

export class TestEnvironment {
  private dom: JSDOM | null = null;
  private originalSimVar: any = null;
  private originalCoherent: any = null;
  private originalDocument: Document | null = null;
  private originalWindow: Window | null = null;

  /**
   * Setup test environment with jsdom
   */
  setup(): void {
    // Create jsdom environment
    this.dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable',
    });

    // Set global document and window
    const globalObj = globalThis as any;
    this.originalDocument = globalObj.document;
    this.originalWindow = globalObj.window;
    
    globalObj.document = this.dom.window.document;
    globalObj.window = this.dom.window as any;
    
    // Copy window properties to global
    Object.defineProperty(globalObj, 'window', {
      value: this.dom.window,
      writable: true,
    });

    // Setup SimVar mock
    this.setupSimVarMock();

    // Setup Coherent mock
    this.setupCoherentMock();

    // Setup simvar global (used by SDK)
    this.setupSimvarGlobal();
  }

  /**
   * Teardown test environment
   */
  teardown(): void {
    // Reset mocks
    simVarMock.reset();
    coherentMock.reset();

    // Restore original globals
    const globalObj = globalThis as any;
    if (this.originalDocument) {
      globalObj.document = this.originalDocument;
    }
    if (this.originalWindow) {
      globalObj.window = this.originalWindow;
    }

    // Clean up
    this.dom = null;
  }

  /**
   * Reset environment (clear mocks but keep setup)
   */
  reset(): void {
    simVarMock.reset();
    coherentMock.reset();
  }

  /**
   * Get the jsdom document
   */
  getDocument(): Document {
    if (!this.dom) {
      throw new Error('TestEnvironment not setup. Call setup() first.');
    }
    return this.dom.window.document;
  }

  /**
   * Get the jsdom window
   */
  getWindow(): any {
    if (!this.dom) {
      throw new Error('TestEnvironment not setup. Call setup() first.');
    }
    return this.dom.window;
  }

  /**
   * Set a SimVar value
   */
  setSimVar(name: string, unit: string, value: any, dataSource: string = ''): void {
    simVarMock.setSimVarValue(name, unit, value, dataSource);
  }

  /**
   * Get a SimVar value
   */
  getSimVar(name: string, unit: string, dataSource: string = ''): any {
    return simVarMock.getSimVarValue(name, unit, dataSource);
  }

  /**
   * Get SimVar access log
   */
  getSimVarAccessLog() {
    return simVarMock.getAccessLog();
  }

  /**
   * Clear SimVar access log
   */
  clearSimVarAccessLog(): void {
    simVarMock.clearAccessLog();
  }

  /**
   * Get Coherent call history
   */
  getCoherentCallHistory() {
    return coherentMock.getCallHistory();
  }

  /**
   * Clear Coherent call history
   */
  clearCoherentCallHistory(): void {
    coherentMock.clearHistory();
  }

  /**
   * Create a Subject that reads from SimVar and updates automatically
   * Useful for testing reactive components
   * Note: In real tests, you would typically poll SimVar in Update() method
   * This is a helper for setting up test scenarios
   */
  createSimVarSubject<T>(name: string, unit: string, dataSource: string = ''): Subject<T> {
    const value = this.getSimVar(name, unit);
    return Subject.create(value as T);
  }

  /**
   * Setup SimVar mock in global scope
   */
  private setupSimVarMock(): void {
    const globalObj = globalThis as any;
    // Store original if exists
    if (typeof globalObj.SimVar !== 'undefined') {
      this.originalSimVar = globalObj.SimVar;
    }

    // Create mock SimVar object
    globalObj.SimVar = {
      GetSimVarValue: (name: string, unit: string, dataSource: string = '') => {
        return simVarMock.getSimVarValue(name, unit, dataSource);
      },
      SetSimVarValue: (name: string, unit: string, value: any, dataSource: string = '') => {
        return Promise.resolve(simVarMock.setSimVarValue(name, unit, value, dataSource));
      },
      GetRegisteredId: (name: string, unit: string, dataSource: string = '') => {
        return simVarMock.getRegisteredId(name, unit, dataSource);
      },
    };
  }

  /**
   * Setup Coherent mock in global scope
   */
  private setupCoherentMock(): void {
    const globalObj = globalThis as any;
    // Store original if exists
    if (typeof globalObj.Coherent !== 'undefined') {
      this.originalCoherent = globalObj.Coherent;
    }

    // Connect Coherent handlers to SimVar mock
    coherentMock.registerHandler('setValueReg_Number', (id: number, value: number) => {
      simVarMock.setValueReg(id, value);
      return Promise.resolve();
    });

    coherentMock.registerHandler('setValueReg_String', (id: number, value: string) => {
      simVarMock.setValueReg(id, value);
      return Promise.resolve();
    });

    coherentMock.registerHandler('setValueReg_Bool', (id: number, value: boolean) => {
      simVarMock.setValueReg(id, value ? 1 : 0);
      return Promise.resolve();
    });

    // Create mock Coherent object
    globalObj.Coherent = {
      call: (method: string, ...args: any[]) => {
        return coherentMock.call(method, ...args);
      },
      on: (eventName: string, callback: (data: any) => void) => {
        coherentMock.on(eventName, callback);
      },
      off: (eventName: string, callback: (data: any) => void) => {
        coherentMock.off(eventName, callback);
      },
    };
  }

  /**
   * Setup simvar global (used by SDK internally)
   */
  private setupSimvarGlobal(): void {
    const globalObj = globalThis as any;
    // The SDK uses a global 'simvar' object for optimized access
    globalObj.simvar = {
      getValueReg: (id: number) => {
        return simVarMock.getValueReg(id);
      },
      getValueReg_String: (id: number) => {
        return simVarMock.getValueReg(id);
      },
      getValue_LatLongAlt: (name: string, dataSource: string) => {
        // Mock implementation - return default structure
        return { lat: 0, long: 0, alt: 0 };
      },
      getValue_LatLongAltPBH: (name: string, dataSource: string) => {
        return { lat: 0, long: 0, alt: 0, pitch: 0, bank: 0, heading: 0 };
      },
      getValue_PBH: (name: string, dataSource: string) => {
        return { pitch: 0, bank: 0, heading: 0 };
      },
      getValue_PID_STRUCT: (name: string, dataSource: string) => {
        return { p: 0, i: 0, d: 0 };
      },
      getValue_XYZ: (name: string, dataSource: string) => {
        return { x: 0, y: 0, z: 0 };
      },
    };
  }
}

