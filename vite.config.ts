import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// Serve a pasta /content no dev e copia para dist/content no build.
// Assim os textos ficam fora do código e o mestre edita sem mexer em nada.
function conteudo(): Plugin {
  const dir = path.resolve(__dirname, "content");
  const tipos: Record<string, string> = {
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
  };
  return {
    name: "conteudo",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url || "").split("?")[0]);
        const m = url.match(/\/content\/(.+)$/);
        if (!m) return next();
        const f = path.join(dir, m[1]);
        if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
          res.statusCode = 404;
          return res.end();
        }
        res.setHeader("Content-Type", tipos[path.extname(f)] || "application/octet-stream");
        res.setHeader("Cache-Control", "no-store");
        fs.createReadStream(f).pipe(res);
      });
    },
    writeBundle(opts) {
      fs.cpSync(dir, path.join(opts.dir!, "content"), { recursive: true });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), conteudo()],
  build: { chunkSizeWarningLimit: 1200 },
});
