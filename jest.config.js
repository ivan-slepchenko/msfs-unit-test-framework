const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.tests.json',
    }],
    '^.+\\.tsx$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.tests.json',
    }],
  },
  moduleNameMapper: {
    // Map SDK imports to our adapter which provides mocks for testing
    // This allows us to use mock implementations of DisplayComponent, FSComponent, etc.
    // IMPORTANT: This must point to our adapter, not the IIFE bundle
    '^@microsoft/msfs-sdk$': path.resolve(__dirname, 'src/mocks/SDKAdapter.ts'),
    '^@microsoft/msfs-sdk/(.*)$': path.resolve(__dirname, 'src/mocks/SDKAdapter.ts'),
    '^@microsoft/msfs-garminsdk$': path.resolve(__dirname, 'src/mocks/GarminSDKAdapter.ts'),
    '^@microsoft/msfs-garminsdk/(.*)$': path.resolve(__dirname, 'src/mocks/GarminSDKAdapter.ts'),
    '^@microsoft/msfs-types$': path.resolve(__dirname, 'node_modules/@microsoft/msfs-types'),
    // Map test framework imports
    '^@avimate/msfs-jest-utils$': '<rootDir>/src',
  },
  modulePaths: [
    '<rootDir>/node_modules',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  transformIgnorePatterns: [
    // Transform SDK modules - they need to be processed
    'node_modules/(?!(@microsoft/msfs-sdk|@microsoft/msfs-types)/)',
  ],
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/setupTests.ts',
  ],
};
