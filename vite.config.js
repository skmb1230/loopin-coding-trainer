import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { javaRunnerPlugin } from './scripts/javaRunnerPlugin.mjs';

export default defineConfig({
  plugins: [react(), javaRunnerPlugin()],
  worker: { format: 'es' },
  build: { target: 'es2022', sourcemap: true },
});
