module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/extension'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'extension/**/*.ts',
    '!extension/**/*.d.ts',
    '!extension/**/index.ts'
  ]
};

