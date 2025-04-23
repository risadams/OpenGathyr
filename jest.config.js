/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/**/*.ts'],
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.jsx'],
  transformIgnorePatterns: ['node_modules/(?!(rss-parser)/)'],
  testMatch: ['**/*.test.(js|ts)'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Add reporters configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
      classNameTemplate: "{filepath}",
      titleTemplate: "{title}",
      ancestorSeparator: " › ",
      suiteNameTemplate: "{filename}",
      reportTestSuiteErrors: true
    }]
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover', 'cobertura'],
  // ts-jest configuration is now in the transform property
};