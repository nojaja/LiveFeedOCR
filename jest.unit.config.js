module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/quality-tests/**/*.test.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        target: 'ES2022',
        allowImportingTsExtensions: true,
        noEmit: true
      }
    }]
  },
  collectCoverageFrom: ['src/domain/**/*.ts'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};
