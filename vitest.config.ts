import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tests/**/*.test.ts'],testTimeout:60000,hookTimeout:60000,fileParallelism:false,env:{TEST_DATABASE:'true',NODE_ENV:'test',SESSION_SECRET:'test-only-secret-32-characters-long'}}});
