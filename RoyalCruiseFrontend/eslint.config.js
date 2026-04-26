// ESLint alap ajánlott JavaScript szabálycsomag.
import js from '@eslint/js'
// Előre definiált globális változólisták (pl. browser, node).
import globals from 'globals'
// React Hook szabályok: dependency lista és hook-használat validálás.
import reactHooks from 'eslint-plugin-react-hooks'
// React Fast Refresh kompatibilitási szabályok.
import reactRefresh from 'eslint-plugin-react-refresh'
// Flat config helper és globális ignore beállítás.
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Build output kizárása lintből.
  globalIgnores(['dist']),
  {
    // Lint célfájlok: JavaScript és JSX.
    files: ['**/*.{js,jsx}'],
    extends: [
      // Alap JS ajánlott szabályok.
      js.configs.recommended,
      // Legfrissebb React Hooks ajánlott szabályok.
      reactHooks.configs['recommended-latest'],
      // Vite + React Refresh specifikus ajánlások.
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // ES2020 nyelvi szint beállítása linteléshez.
      ecmaVersion: 2020,
      // Böngésző globálisok (window, document stb.).
      globals: globals.browser,
      parserOptions: {
        // Legfrissebb szintaxis engedélyezése parser oldalon.
        ecmaVersion: 'latest',
        // JSX feldolgozás bekapcsolása.
        ecmaFeatures: { jsx: true },
        // ESM modulrendszer használata.
        sourceType: 'module',
      },
    },
    rules: {
      // Nem használt változók tiltása, kivéve a konvenció szerint jelölt konstansok.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
