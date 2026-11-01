import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import pxtorem from 'postcss-pxtorem'

export default defineConfig({
  main: {
    build: { rollupOptions: { input: resolve(__dirname, 'src/main/index.ts') } }
  },
  preload: {
    build: { rollupOptions: { input: resolve(__dirname, 'src/preload/index.ts') } }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: { rollupOptions: { input: resolve(__dirname, 'src/renderer/index.html') } },
    plugins: [react()],
    css: {
      postcss: {
        // Escreve-se o CSS em px (como no protótipo) e o build converte para rem.
        // 1rem = 18px × escala da letra (A−/A+). O menu lateral não muda de tamanho.
        // Bordas de 1–2px ficam em px.
        plugins: [
          pxtorem({
            rootValue: 18,
            propList: ['*'],
            minPixelValue: 3,
            selectorBlackList: ['.menu', 'html']
          })
        ]
      }
    }
  }
})
