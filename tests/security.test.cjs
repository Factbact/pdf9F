const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const pages=['index','merge','split','compress','heic','img2pdf','outline'];
test('all entry points use same-origin modules and a restrictive CSP',()=>{
 for(const name of pages){
  const html=fs.readFileSync(name+'.html','utf8');
  assert.match(html,/script-src 'self' 'wasm-unsafe-eval'/);
  assert.doesNotMatch(html,/<script[^>]*>\s*[^<\s]/);
  assert.doesNotMatch(html,/\son[a-z]+\s*=/i);
  assert.doesNotMatch(html,/(?:src|href)="https?:/);
  assert.match(html,new RegExp(`type="module" src="assets/${name}.mjs"`));
 }
 assert.doesNotMatch(fs.readFileSync('assets/split.mjs','utf8'),/pdfjs/);
});
test('PDF.js core/worker are from the pinned package and eval is disabled at every call',()=>{
 const pkg=JSON.parse(fs.readFileSync('package.json'));
 for(const name of ['pdf.mjs','pdf.worker.mjs']){
  const source=fs.readFileSync('vendor/pdfjs/'+name,'utf8');
  assert.ok(source.includes(pkg.dependencies['pdfjs-dist']));
 }
 let count=0;
 for(const name of ['index','merge','compress']) {
  const source=fs.readFileSync('assets/'+name+'.mjs','utf8');
  const calls=source.match(/pdfjsLib\.getDocument\([^\n]+/g)||[];
  for(const call of calls)assert.match(call,/isEvalSupported: false/);
  count+=calls.length;
 }
 assert.equal(count,3);
 assert.match(fs.readFileSync('assets/pdf-runtime.mjs','utf8'),/getDocument\(\{ isEvalSupported: false, data: await file.arrayBuffer\(\)/);
});
test('untrusted file strings cannot be interpolated into HTML templates',()=>{
 for(const name of pages){
  const source=fs.readFileSync('assets/'+name+'.mjs','utf8');
  for(const m of source.matchAll(/\.innerHTML\s*=\s*`([\s\S]*?)`/g)){
   assert.doesNotMatch(m[1],/\$\{(?:fileObj\.(?:name|relativePath)|fileObject\.relativePath|file\.name|item\.name|result\.(?:name|errorMsg|url)|fileObj\.thumbnail)/);
  }
 }
 assert.match(fs.readFileSync('assets/outline.mjs','utf8'),/escapeHtml\(item.title\)/);
});
test('vendored bytes match the checked-in SHA-256 inventory',()=>{
 const manifest=JSON.parse(fs.readFileSync('vendor-manifest.json'));
 for(const [file,expected]of Object.entries(manifest))assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),expected,file);
});
