import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

const files = [
  "index.html",
  "cgv.html",
  "confidentialite.html",
  "styles.css",
  "app.js",
  "config.js",
  "header-scroll.js",
];

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const file of files) {
  const source = join(root, file);
  if (!existsSync(source)) throw new Error(`Fichier manquant : ${file}`);

  const destination = join(dist, file);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

cpSync(join(root, "assets"), join(dist, "assets"), { recursive: true });

console.log("Site statique généré dans dist/");
