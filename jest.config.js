module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@microsoft/msfs-sdk$': '<rootDir>/../node_modules/@microsoft/msfs-sdk',
    '^@microsoft/msfs-types$': '<rootDir>/../node_modules/@microsoft/msfs-types',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/setupTests.ts',
  ],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
        jsxFactory: 'FSComponent.buildComponent',
      },
    },
  },
};

