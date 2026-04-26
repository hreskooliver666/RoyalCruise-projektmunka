// Vitest konfigurációs helper.
import { defineConfig } from 'vitest/config';
// Azonos React plugin, hogy a tesztkörnyezet ugyanúgy értelmezze a JSX-et.
import react from '@vitejs/plugin-react';
// Útvonalkezelés alias beállításhoz.
import path from 'path';
// ESM környezetben __dirname kiváltására szolgáló URL helper.
import { fileURLToPath } from 'url';

// Az aktuális config fájl mappájának abszolút elérési útja.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // React plugin aktiválása a teszt build pipeline-ban.
  plugins: [react()],
  test: {
    // Lehetővé teszi a globális describe/it/expect használatot import nélkül.
    globals: true,
    // Böngészőközeli tesztkörnyezet DOM API-khoz.
    environment: 'jsdom',
    // Közös teszt setup (matcherek, mockok, globális inicializálás).
    setupFiles: ['./src/test/setup.js'],
    // A Selenium E2E teszteket kulon Node teszt runner futtatja, ne keruljenek a Vitest hataskorebe.
    exclude: ['**/node_modules/**', '**/dist/**', '**/selenium/**'],
    coverage: {
      // Gyors, beépített V8 coverage provider.
      provider: 'v8',
      // Több formátumú riport: konzol, gépi JSON és HTML.
      reporter: ['text', 'json', 'html'],
      // A coverage-ből kihagyott mappák/fájlok.
      exclude: ['node_modules/', 'src/test/', 'selenium/'],
    },
  },
  resolve: {
    alias: {
      // @ -> src alias a rövidebb és stabilabb import útvonalakért.
      '@': path.resolve(__dirname, './src'),
    },
  },
});
