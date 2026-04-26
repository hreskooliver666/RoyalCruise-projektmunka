// Vite konfigurációs helper a típushelyes és olvasható beállításokhoz.
import { defineConfig } from 'vite'
// React plugin: JSX transzformáció, Fast Refresh és React-optimalizációk.
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // A pluginlista határozza meg, milyen build/dev képességek aktívak.
  plugins: [react()],
})
