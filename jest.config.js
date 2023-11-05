module.exports = {
    testMatch: [
      '**/*.test.ts'
    ],
    transform: {
      '^.+\\.ts$': 'ts-jest'
    },
    moduleFileExtensions: [
      'ts',
      'js'
    ],
    globals: {
      'ts-jest': {
        tsconfig: 'tsconfig.json'
      }
    }
  };