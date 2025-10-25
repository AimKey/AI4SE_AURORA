// jest.config.cjs
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  moduleNameMapper: {
    // Auto-map all TS aliases defined in tsconfig
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/src/' }),

    // Add missing paths not defined in tsconfig
    '^utils/(.*)$': '<rootDir>/src/utils/$1',
    '^constants/(.*)$': '<rootDir>/src/constants/$1',
  },

  modulePaths: [compilerOptions.baseUrl],

  // ✅ Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/services/booking.service.ts', // only collect coverage from this file
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/config/',
    '/constants/',
    '/models/',
    '/utils/',
    'main.ts',
    'server.ts',
  ],

  coverageReporters: ['text', 'lcov', 'html'],
};
