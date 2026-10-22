const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');
const crypto = require('node:crypto');

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}
async function build() {
  copy('node_modules/pdf-lib/dist/pdf-lib.min.js', 'vendor/pdf-lib/pdf-lib.min.js');
  copy('node_modules/pdf-lib/LICENSE.md', 'vendor/pdf-lib/LICENSE.md');
  for (const file of ['pdf.mjs', 'pdf.worker.mjs'])
    copy(`node_modules/pdfjs-dist/build/${file}`, `vendor/pdfjs/${file}`);
  for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs'])
    if (fs.existsSync(`node_modules/pdfjs-dist/${dir}`)) copy(`node_modules/pdfjs-dist/${dir}`, `vendor/pdfjs/${dir}`);
  copy('node_modules/pdfjs-dist/LICENSE', 'vendor/pdfjs/LICENSE');
  copy('node_modules/libheif-js/libheif-wasm/libheif-bundle.mjs', 'vendor/libheif/libheif-bundle.mjs');
  copy('node_modules/libheif-js/LICENSE', 'vendor/libheif/LICENSE');
  for (const name of ['index', 'merge', 'split', 'compress', 'heic', 'img2pdf', 'outline']) {
    const input = `@import "tailwindcss" source(none);
@config "./tailwind-${name}.cjs";
@custom-variant dark (&:where(.dark, .dark *));
@source "../${name}.html";
@source "../assets/${name}.mjs";
@source "../translations.js";
@source "../utils.js";
/* Preserve the v3 preflight defaults used by the existing design. */
@layer base { *, ::before, ::after { border-color: #e5e7eb; } button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer; } }
@theme { --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05); --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); --radius-sm: 0.125rem; --radius: 0.25rem; --default-ring-width: 3px; --default-ring-color: #3b82f6; }
`;
    const result = await postcss([tailwind({ optimize: true })]).process(input, { from: path.resolve(`scripts/${name}.css`) });
    fs.writeFileSync(`assets/${name}.css`, result.css);
  }
  const manifest = {};
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(file);
      else manifest[file] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    }
  }
  walk('vendor');
  fs.writeFileSync('vendor-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
}
build().catch(e => { console.error(e); process.exitCode = 1; });
