/**
 * Generates .min.js for every .js file in public/js/ that doesn't already
 * have a minified counterpart.  Uses esbuild (ships with Vite).
 *
 * IMPORTANT: Only --minify-whitespace is used. These are legacy global scripts
 * that define/use globals like _OpenApi, bitcoin, etc. Syntax transforms
 * (var→let) and identifier renaming would break hoisting and global scope.
 *
 * Run: node minify-scripts.mjs
 */
import { execSync } from "child_process";
import { readdirSync, statSync, existsSync } from "fs";
import { join, extname, basename } from "path";

const JS_ROOT = "public/js";

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (extname(entry) === ".js" && !entry.endsWith(".min.js")) {
      files.push(full);
    }
  }
  return files;
}

let count = 0;
for (const src of walk(JS_ROOT)) {
  const min = src.replace(/\.js$/, ".min.js");
  if (existsSync(min)) continue;
  console.log(`  minify: ${src}`);
  execSync(`npx esbuild "${src}" --minify-whitespace --outfile="${min}"`, { stdio: "pipe" });
  count++;
}

console.log(count ? `  ${count} file(s) minified` : "  all .min.js files up to date");
