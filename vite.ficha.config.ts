// Empacota a ficha de personagem para o módulo do Foundry: npm run ficha:pacote
// Saída em foundry/ficha/: ficha.js (define window.FichaExposicao) e ficha.css.
// React vai dentro do ficha.js, então o módulo não precisa instalar nada.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  publicDir: false,
  build: {
    outDir: "foundry/ficha",
    emptyOutDir: false, // o LEIAME.md e o exemplo.html moram na mesma pasta
    cssCodeSplit: false,
    lib: {
      entry: "src/ficha/montar.tsx",
      name: "FichaExposicao",
      formats: ["iife"],
      fileName: () => "ficha.js",
    },
    rollupOptions: { output: { assetFileNames: "ficha[extname]" } },
  },
});
