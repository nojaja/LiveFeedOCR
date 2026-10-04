import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const workspaceRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [vue()],
  server: {
    fs: {
      allow: [workspaceRoot],
    },
  },
});
