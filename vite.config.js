import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cRunnerPlugin from './server/cRunner.js';

export default defineConfig({
  plugins: [react(), cRunnerPlugin()],
});
