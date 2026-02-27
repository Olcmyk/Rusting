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
    rollupOptions: {
      external: [
        'three',
        'three/webgpu',
        'three/tsl',
        'three/addons/controls/OrbitControls.js',
        'three/addons/utils/BufferGeometryUtils.js',
        'tsl-textures',
      ],
    },
  },
});
