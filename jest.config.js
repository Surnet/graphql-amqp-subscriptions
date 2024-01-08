module.exports = {
  coverageDirectory: './coverage',
  coverageReporters: ['html', ['text', { skipFull: true }], 'text-summary'],
  testEnvironment: 'node',
  coverageProvider: 'v8',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: ['.test.ts$'],
  transform: {
    '^.+\\.(t|j)s$': ['@swc/jest'],
  },
  collectCoverageFrom: ['src/**/*.(t|j)s']
};
