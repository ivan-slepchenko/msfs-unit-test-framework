/**
 * Jest setup file - runs before all tests
 * 
 * This file is automatically loaded by Jest (configured in jest.config.js)
 * 
 * IMPORTANT: Order matters! Setup must happen in this order:
 * 1. TextEncoder/TextDecoder polyfills
 * 2. JSX type definitions (for TypeScript)
 * 3. MSFS globals (BaseInstrument, DisplayComponent, FSComponent, etc.)
 * 4. SimVar and Coherent mocks
 * 5. SDK can now be imported safely
 */

// ============================================
// STEP 0: Load JSX type definitions
// ============================================
/// <reference path="./mocks/jsx.d.ts" />

// ============================================
// STEP 1: Polyfills for Node.js environment
// ============================================
import { TextEncoder, TextDecoder } from 'util';

if (typeof globalThis.TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = TextDecoder;
}

if (typeof (global as any).TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}
if (typeof (global as any).TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}

// ============================================
// STEP 2: Setup MSFS globals FIRST
// This must happen before any SDK imports
// ============================================
const { setupMSFSGlobals } = require('./mocks/MSFSGlobals');
setupMSFSGlobals();

// ============================================
// STEP 3: Setup SimVar and Coherent mocks
// ============================================
const { SimVarMock } = require('./mocks/SimVarMock');
const { CoherentMock } = require('./mocks/CoherentMock');
const simVarMock = SimVarMock.getInstance();
const coherentMock = CoherentMock.getInstance();

const globalObj = globalThis as any;

// Setup SimVar mock
if (typeof globalObj.SimVar === 'undefined') {
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

// Setup simvar global (used by SDK internally)
if (typeof globalObj.simvar === 'undefined') {
  globalObj.simvar = {
    getValueReg: (id: number) => simVarMock.getValueReg(id),
    getValueReg_String: (id: number) => simVarMock.getValueReg(id),
    getValue_LatLongAlt: () => ({ lat: 0, long: 0, alt: 0 }),
    getValue_LatLongAltPBH: () => ({ lat: 0, long: 0, alt: 0, pitch: 0, bank: 0, heading: 0 }),
    getValue_PBH: () => ({ pitch: 0, bank: 0, heading: 0 }),
    getValue_PID_STRUCT: () => ({ p: 0, i: 0, d: 0 }),
    getValue_XYZ: () => ({ x: 0, y: 0, z: 0 }),
  };
}

// Setup Coherent mock
if (typeof globalObj.Coherent === 'undefined') {
  globalObj.Coherent = {
    call: (method: string, ...args: any[]) => coherentMock.call(method, ...args),
    on: (eventName: string, callback: (data: any) => void) => coherentMock.on(eventName, callback),
    off: (eventName: string, callback: (data: any) => void) => coherentMock.off(eventName, callback),
  };
}
