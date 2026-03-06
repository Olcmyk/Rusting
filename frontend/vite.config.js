import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config.json', 'utf-8'));
const totalDays = config.totalDays;
const deployTimestamp = Date.now();

export default defineConfig({
  define: {
    __DEPLOY_TIMESTAMP__: deployTimestamp,
    __TOTAL_DAYS__: totalDays,
  },
  build: {
    target: 'esnext',
  },
});
