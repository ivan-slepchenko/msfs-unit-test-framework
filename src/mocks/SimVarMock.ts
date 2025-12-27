/**
 * Mock implementation of SimVar API for testing MSFS instruments.
 * 
 * This provides a complete simulation of the SimVar system, allowing you to:
 * - Set and get SimVar values
 * - Register SimVars for efficient access
 * - Simulate different data types (number, string, bool, structs)
 * - Track SimVar access for testing
 */

export interface SimVarValue {
  value: any;
  unit: string;
  dataSource?: string;
  accessCount?: number;
  lastAccessTime?: number;
}

export interface SimVarAccessLog {
  name: string;
  unit: string;
  operation: 'get' | 'set';
  value?: any;
  timestamp: number;
}

/**
 * Mock SimVar implementation for testing
 */
export class SimVarMock {
  private static instance: SimVarMock;
  private simVars: Map<string, SimVarValue> = new Map();
  private registeredIds: Map<number, string> = new Map();
  private registeredSimVars: Map<string, number> = new Map();
  private nextRegisteredId: number = 0;
  private accessLog: SimVarAccessLog[] = [];
  private maxLogSize: number = 10000;

  private constructor() {
    this.initializeDefaults();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SimVarMock {
    if (!SimVarMock.instance) {
      SimVarMock.instance = new SimVarMock();
    }
    return SimVarMock.instance;
  }

  /**
   * Initialize default SimVars with common values
   */
  private initializeDefaults(): void {
    // Common aircraft state SimVars
    this.setSimVarValue('PLANE LATITUDE', 'degrees', 0);
    this.setSimVarValue('PLANE LONGITUDE', 'degrees', 0);
    this.setSimVarValue('PLANE ALTITUDE', 'feet', 0);
    this.setSimVarValue('AIRSPEED INDICATED', 'knots', 0);
    this.setSimVarValue('VERTICAL SPEED', 'feet per minute', 0);
    this.setSimVarValue('PLANE HEADING DEGREES TRUE', 'degrees', 0);
    this.setSimVarValue('PLANE PITCH DEGREES', 'degrees', 0);
    this.setSimVarValue('PLANE BANK DEGREES', 'degrees', 0);
    this.setSimVarValue('SIM ON GROUND', 'bool', 1);
    this.setSimVarValue('ENGINE RPM:1', 'Rpm', 0);
    this.setSimVarValue('GENERAL ENG THROTTLE LEVER POSITION:1', 'percent', 0);
  }

  /**
   * Get a SimVar value
   */
  getSimVarValue(name: string, unit: string, dataSource: string = ''): any {
    const key = this.getKey(name, unit, dataSource);
    const simVar = this.simVars.get(key);
    
    this.logAccess(name, unit, 'get', simVar?.value);
    
    if (simVar) {
      simVar.accessCount = (simVar.accessCount || 0) + 1;
      simVar.lastAccessTime = Date.now();
      return simVar.value;
    }
    
    // Return default based on unit type
    return this.getDefaultValue(unit);
  }

  /**
   * Set a SimVar value
   */
  setSimVarValue(name: string, unit: string, value: any, dataSource: string = ''): void {
    const key = this.getKey(name, unit, dataSource);
    const existing = this.simVars.get(key);
    
    this.simVars.set(key, {
      value: this.coerceValue(value, unit),
      unit,
      dataSource,
      accessCount: existing?.accessCount || 0,
      lastAccessTime: Date.now()
    });
    
    this.logAccess(name, unit, 'set', value);
  }

  /**
   * Register a SimVar for efficient access
   */
  getRegisteredId(name: string, unit: string, dataSource: string = ''): number {
    const key = this.getKey(name, unit, dataSource);
    
    if (this.registeredSimVars.has(key)) {
      return this.registeredSimVars.get(key)!;
    }
    
    const id = this.nextRegisteredId++;
    this.registeredSimVars.set(key, id);
    this.registeredIds.set(id, key);
    
    // Initialize if not exists
    if (!this.simVars.has(key)) {
      this.setSimVarValue(name, unit, this.getDefaultValue(unit), dataSource);
    }
    
    return id;
  }

  /**
   * Get value using registered ID
   */
  getValueReg(registeredId: number): any {
    const key = this.registeredIds.get(registeredId);
    if (!key) {
      return null;
    }
    
    const simVar = this.simVars.get(key);
    if (simVar) {
      simVar.accessCount = (simVar.accessCount || 0) + 1;
      simVar.lastAccessTime = Date.now();
      return simVar.value;
    }
    
    return null;
  }

  /**
   * Set value using registered ID
   */
  setValueReg(registeredId: number, value: any): void {
    const key = this.registeredIds.get(registeredId);
    if (!key) {
      return;
    }
    
    const [name, unit, dataSource] = this.parseKey(key);
    this.setSimVarValue(name, unit, value, dataSource);
  }

  /**
   * Get access log
   */
  getAccessLog(): SimVarAccessLog[] {
    return [...this.accessLog];
  }

  /**
   * Clear access log
   */
  clearAccessLog(): void {
    this.accessLog = [];
  }

  /**
   * Get all SimVars
   */
  getAllSimVars(): Map<string, SimVarValue> {
    return new Map(this.simVars);
  }

  /**
   * Reset all SimVars to defaults
   */
  reset(): void {
    this.simVars.clear();
    this.registeredIds.clear();
    this.registeredSimVars.clear();
    this.nextRegisteredId = 0;
    this.accessLog = [];
    this.initializeDefaults();
  }

  /**
   * Get SimVar by name (first match)
   */
  getSimVar(name: string): SimVarValue | undefined {
    for (const [key, value] of this.simVars.entries()) {
      if (key.startsWith(`${name}|`)) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Check if SimVar exists
   */
  hasSimVar(name: string, unit: string, dataSource: string = ''): boolean {
    return this.simVars.has(this.getKey(name, unit, dataSource));
  }

  private getKey(name: string, unit: string, dataSource: string): string {
    return `${name}|${unit}|${dataSource}`;
  }

  private parseKey(key: string): [string, string, string] {
    const parts = key.split('|');
    return [parts[0], parts[1], parts[2] || ''];
  }

  private getDefaultValue(unit: string): any {
    if (unit.toLowerCase().includes('bool')) {
      return 0;
    }
    if (unit.toLowerCase().includes('string')) {
      return '';
    }
    return 0;
  }

  private coerceValue(value: any, unit: string): any {
    if (unit.toLowerCase().includes('bool')) {
      return value ? 1 : 0;
    }
    if (unit.toLowerCase().includes('string')) {
      return String(value);
    }
    return Number(value);
  }

  private logAccess(name: string, unit: string, operation: 'get' | 'set', value?: any): void {
    this.accessLog.push({
      name,
      unit,
      operation,
      value,
      timestamp: Date.now()
    });
    
    // Keep log size manageable
    if (this.accessLog.length > this.maxLogSize) {
      this.accessLog = this.accessLog.slice(-this.maxLogSize);
    }
  }
}

/**
 * Global SimVar mock instance
 */
export const simVarMock = SimVarMock.getInstance();


