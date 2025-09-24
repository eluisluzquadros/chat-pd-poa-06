module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'supabase/functions/**/*.ts',
    'src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageDirectory: 'tests/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000, // 30 seconds for RAG tests
  maxWorkers: 4, // Limit concurrent tests
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Test suites configuration
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/**/*.test.ts'],
      testPathIgnorePatterns: [
        '<rootDir>/tests/integration/',
        '<rootDir>/tests/e2e/'
      ]
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testTimeout: 45000
    },
    {
      displayName: 'E2E Tests',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
      testTimeout: 60000
    }
  ],

  // Custom reporters
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: 'tests/reports',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'RAG System Test Report',
        logoImgPath: undefined,
        inlineSource: false
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: 'tests/reports',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],

  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },

  // Module path mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@supabase/(.*)$': '<rootDir>/supabase/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Test categories
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ]
};