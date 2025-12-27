/**
 * Mock implementation of Coherent Browser API for testing MSFS instruments.
 * 
 * Coherent is the embedded browser used by MSFS. This mock provides:
 * - Coherent.call() for calling simulator functions
 * - Event system simulation
 * - Browser API compatibility
 */

export interface CoherentCall {
  method: string;
  args: any[];
  timestamp: number;
  resolve?: (value: any) => void;
  reject?: (error: any) => void;
}

/**
 * Mock Coherent Browser implementation
 */
export class CoherentMock {
  private static instance: CoherentMock;
  private callHistory: CoherentCall[] = [];
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  private callHandlers: Map<string, (...args: any[]) => any> = new Map();
  private maxHistorySize: number = 10000;

  private constructor() {
    this.initializeDefaultHandlers();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CoherentMock {
    if (!CoherentMock.instance) {
      CoherentMock.instance = new CoherentMock();
    }
    return CoherentMock.instance;
  }

  /**
   * Initialize default call handlers for common MSFS functions
   */
  private initializeDefaultHandlers(): void {
    // SimVar set handlers - will be connected to SimVarMock in setup
    this.registerHandler('setValueReg_Number', (id: number, value: number) => {
      // This will be connected to SimVarMock in TestEnvironment
      return Promise.resolve();
    });

    this.registerHandler('setValueReg_String', (id: number, value: string) => {
      return Promise.resolve();
    });

    this.registerHandler('setValueReg_Bool', (id: number, value: boolean) => {
      return Promise.resolve();
    });
  }

  /**
   * Mock Coherent.call() - calls a function in the simulator
   */
  call(method: string, ...args: any[]): Promise<any> {
    const call: CoherentCall = {
      method,
      args,
      timestamp: Date.now()
    };

    this.callHistory.push(call);

    // Keep history size manageable
    if (this.callHistory.length > this.maxHistorySize) {
      this.callHistory = this.callHistory.slice(-this.maxHistorySize);
    }

    // Check if we have a registered handler
    const handler = this.callHandlers.get(method);
    if (handler) {
      try {
        const result = handler(...args);
        return Promise.resolve(result);
      } catch (error) {
        return Promise.reject(error);
      }
    }

    // Default: return resolved promise
    return Promise.resolve(null);
  }

  /**
   * Register a handler for a specific Coherent call
   */
  registerHandler(method: string, handler: (...args: any[]) => any): void {
    this.callHandlers.set(method, handler);
  }

  /**
   * Trigger an event (simulates simulator events)
   */
  triggerEvent(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Add event listener
   */
  on(eventName: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(eventName: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Get call history
   */
  getCallHistory(): CoherentCall[] {
    return [...this.callHistory];
  }

  /**
   * Get calls for a specific method
   */
  getCallsForMethod(method: string): CoherentCall[] {
    return this.callHistory.filter(call => call.method === method);
  }

  /**
   * Clear call history
   */
  clearHistory(): void {
    this.callHistory = [];
  }

  /**
   * Reset all handlers and history
   */
  reset(): void {
    this.callHistory = [];
    this.eventListeners.clear();
    this.callHandlers.clear();
    this.initializeDefaultHandlers();
  }
}

/**
 * Global Coherent mock instance
 */
export const coherentMock = CoherentMock.getInstance();


