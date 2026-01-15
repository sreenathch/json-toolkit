import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ⚠️ IMPORTANT: Change 'json-toolkit' to your actual repository name
  // If your repo is: github.com/username/my-app
  // Then base should be: '/my-app/'
  base: '/json-toolkit/',
})
