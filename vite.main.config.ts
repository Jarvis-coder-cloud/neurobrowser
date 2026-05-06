import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    {
      name: 'copy-neurobrowser-static-html',
      closeBundle() {
        const outDir = path.resolve(__dirname, '.vite/build');
        fs.mkdirSync(outDir, { recursive: true });
        fs.copyFileSync(
          path.resolve(__dirname, 'src/main/home.html'),
          path.join(outDir, 'home.html'),
        );
        fs.copyFileSync(
          path.resolve(__dirname, 'src/main/search.html'),
          path.join(outDir, 'search.html'),
        );
      },
    },
  ],
});
