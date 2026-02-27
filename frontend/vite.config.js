import { defineConfig } from 'vite';

const totalDays = parseInt(process.env.TOTAL_DAYS || '365', 10);
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
