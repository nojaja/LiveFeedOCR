const { defineConfig } = require('vite');
const vue = require('@vitejs/plugin-vue');

const workspaceRoot = __dirname;

module.exports = defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'index.bundle.js',
      },
    },
  },
  server: {
    fs: {
      allow: [workspaceRoot],
    },
  },
});
