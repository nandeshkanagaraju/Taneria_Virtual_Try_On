import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        proxy: {
            '/runway-api': {
                target: 'https://api.dev.runwayml.com', // The URL from your Python script
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/runway-api/, ''),
                secure: false,
            },
        },
    },
})