const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { PDFDocument } = require('pdf-lib');
const { serve } = require('./server.cjs');
const fixtures = require('./fixtures.cjs');
const baseline = process.env.BASELINE === '1';
const names = ['index','merge','split','compress','heic','img2pdf','outline'];
let browser,server,url,pdf;
const audit = [];
before(async () => {
  ({server,url} = await serve(baseline ? path.resolve('.tmp/baseline') : process.cwd()));
  browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || 'chrome',headless:true});
  pdf = await fixtures.pdf();
});
after(async () => {
  fs.mkdirSync('test-results',{recursive:true});
  fs.writeFileSync(`test-results/${baseline?'baseline':'fixed'}-${process.env.BROWSER_CHANNEL || 'chrome'}-network.json`,JSON.stringify(audit,null,2));
  await browser?.close(); server?.close();
});
async function open(name) {
  const page = await browser.newPage({viewport:{width:1280,height:900},locale:'ja-JP'});
  page.setDefaultTimeout(15000);
  const record = {name,requests:[],errors:[],console:[]}; audit.push(record);
  page.context().on('request',r=>{
    // Browser-internal download UI is not a site network request (Edge opens it on download).
    if(!/^(edge|chrome):/.test(r.url()))record.requests.push({url:r.url(),method:r.method(),type:r.resourceType(),body:!!r.postData()});
  });
  page.on('pageerror',e=>record.errors.push(e.message));
  page.on('console',m=>{if(['error','warning'].includes(m.type()))record.console.push(m.text());});
  await page.goto(url+name+'.html');
  await page.waitForFunction(()=>typeof initLanguage === 'function');
  return {page,record};
}
function file(name,buffer=pdf,mimeType='application/pdf') {return {name,mimeType,buffer};}
async function download(page,selector) {
  await page.locator(selector).waitFor({state:'visible'});
  const [result] = await Promise.all([page.waitForEvent('download'), page.locator(selector).click()]);
  return fs.readFileSync(await result.path());
}
async function convert(name,page) {
  if(name==='index') {
    await page.locator('#enable-preview').check({force:true});
    await page.locator('#convert-btn').click();
    await page.waitForFunction(()=>document.querySelector('#preview-canvas')?.width>300);
    return download(page,'#confirm-convert-btn');
  }
  if(name==='merge') {
    await page.locator('#merge-btn').click();
    return download(page,'#download-with-outline-btn');
  }
  if(name==='split'||name==='compress') {
    await page.locator(`#${name}-btn`).click();
    return download(page,'.dl-btn >> nth=0');
  }
  if(name==='outline') return download(page,'#sort-btn');
  if(name==='heic') {
    await page.locator('#convert-btn').click();
    await page.locator('#results-grid a[download]').waitFor();
    return download(page,'#results-grid a[download]');
  }
  return download(page,'#convert-btn');
}
for(const name of names) test(`${name}: normal output, filenames, language, theme, console/network`,{timeout:120000},async()=>{
  const {page,record} = await open(name);
  try {
    await page.locator('#lang-toggle-btn').click();
    assert.equal(await page.locator('#lang-toggle-btn').textContent(),'🇯🇵');
    await page.locator('#lang-toggle-btn').click();
    assert.equal(await page.locator('#lang-toggle-btn').textContent(),'🇺🇸');
    await page.locator('#theme-toggle-btn').click();
    assert.match(await page.locator('html').getAttribute('class'),/dark/);
    const special = baseline ? 'sample & quoted.pdf' : fixtures.payload+'.pdf';
    const input = name==='heic' ? file(special+'.heic',fs.readFileSync('.tmp/example.heic'),'image/heic') : name==='img2pdf' ? file(special+'.png',fixtures.png,'image/png') : file(special);
    await page.locator('input[type=file]').first().setInputFiles(name==='merge'?[input,file('second.pdf')]:input);
    const result = await convert(name,page);
    if(name!=='heic') {
      const output = await PDFDocument.load(result);
      const expected = {index:1,merge:8,split:1,compress:4,img2pdf:1,outline:4};
      assert.equal(output.getPageCount(),expected[name]);
      if(name==='outline') {
        const {PDFName}=require('pdf-lib');
        const root=output.context.lookup(output.catalog.get(PDFName.of('Outlines')));
        const first=output.context.lookup(root.get(PDFName.of('First')));
        assert.equal(first.get(PDFName.of('Title')).decodeText(),`1 ${fixtures.payload}`);
      }
    } else assert.equal(result.subarray(1,4).toString(),'PNG');
    assert.equal(await page.evaluate(()=>globalThis.__xss),undefined);
    if(!baseline) {
      assert.equal(await page.locator('[onerror]').count(),0);
      assert.deepEqual(record.errors,[]);
      assert.deepEqual(record.requests.filter(r=>r.method!=='GET'||r.body),[]);
      assert.deepEqual(record.requests.filter(r=>!r.url.startsWith(new URL(url).origin)&&!r.url.startsWith('blob:')&&!r.url.startsWith('data:')),[]);
      assert.deepEqual(record.console.filter(s=>/Content Security Policy|Refused to|Failed to load resource/.test(s)),[]);
    }
    await page.screenshot({path:`test-results/${baseline?'baseline':'fixed'}-${name}.png`,fullPage:true});
  } finally {await page.close();}
});
if(!baseline) {
 for (const name of ['split','outline']) test(`${name}: invalid replacement cannot revive an older selection`,async()=>{
  const {page,record}=await open(name);try{
   await page.evaluate(()=>{
    const read=File.prototype.arrayBuffer;
    File.prototype.arrayBuffer=function(){
     if(this.name==='slow.pdf')return new Promise(resolve=>{globalThis.__resumePdf=()=>resolve(read.call(this));});
     return read.call(this);
    };
   });
   await page.locator('input[type=file]').setInputFiles(file('slow.pdf'));
   await page.waitForFunction(()=>!!globalThis.__resumePdf);
   await page.locator('input[type=file]').setInputFiles(file('broken.pdf',Buffer.from('broken')));
   await page.locator('#error-box').waitFor({state:'visible'});
   await page.evaluate(async()=>{__resumePdf();await new Promise(r=>setTimeout(r,200));});
   assert.equal(await page.locator(name==='split'?'#execute-section':'#action-section').isVisible(),false);
   assert.deepEqual(record.errors,[]);
  }finally{await page.close();}
 });
 test('image import cannot restore cleared files or enable conversion mid-import',async()=>{
  const {page,record}=await open('img2pdf');try{
   await page.locator('input[type=file]').setInputFiles(file('first.png',fixtures.png,'image/png'));
   await page.waitForFunction(()=>!document.querySelector('#convert-btn').disabled);
   await page.evaluate(()=>{
    const NativeWorker=Worker;
    globalThis.Worker=class extends NativeWorker {
     postMessage(file,...rest){
      if(file?.name==='slow.png'){
       this.addEventListener('message',()=>{globalThis.__imageDone=true;});
       globalThis.__resumeImage=()=>super.postMessage(file,...rest);
      }else super.postMessage(file,...rest);
     }
    };
   });
   await page.locator('input[type=file]').setInputFiles(file('slow.png',fixtures.png,'image/png'));
   await page.waitForFunction(()=>!!globalThis.__resumeImage);
   assert.equal(await page.locator('#convert-btn').isDisabled(),true);
   await page.locator('#clear-all-btn').click();
   await page.evaluate(()=>__resumeImage());
   await page.waitForFunction(()=>globalThis.__imageDone);
   assert.equal(await page.locator('#file-list-container .remove-btn').count(),0);
   assert.equal(await page.locator('#convert-btn').isDisabled(),true);
   assert.deepEqual(record.errors,[]);
  }finally{await page.close();}
 });
 test('thumbnail generation has at most two live PDF workers',async()=>{
  const {page,record}=await open('merge');try{
   await page.evaluate(()=>{
    const NativeWorker=Worker;globalThis.__activeWorkers=0;globalThis.__peakWorkers=0;
    globalThis.Worker=class extends NativeWorker {
     constructor(url,options){super(url,options);this.tracked=String(url).includes('pdf.worker.mjs');if(this.tracked){__activeWorkers++;__peakWorkers=Math.max(__peakWorkers,__activeWorkers);}}
     terminate(){if(this.tracked){__activeWorkers--;this.tracked=false;}return super.terminate();}
    };
   });
   await page.locator('input[type=file]').setInputFiles(Array.from({length:8},(_,i)=>file(`sample-${i}.pdf`)));
   await page.waitForFunction(()=>document.querySelectorAll('#file-list-container canvas').length===8 && [...document.querySelectorAll('#file-list-container canvas')].every(c=>c.width===60) && __activeWorkers===0);
   assert.equal(await page.evaluate(()=>__peakWorkers),2);
   assert.deepEqual(record.errors,[]);
  }finally{await page.close();}
 });
 test('stalled PDF rendering is cancelled on deadline',async()=>{
  const {page}=await open('index');try{
   const result=await page.evaluate(async()=>{
    const {renderPage}=await import('./assets/pdf-runtime.mjs');
    const schedule=setTimeout;globalThis.setTimeout=(fn,delay,...args)=>schedule(fn,delay===30000?10:delay,...args);
    let cancelled=false;
    try{await renderPage({render:()=>({promise:new Promise(()=>{}),cancel:()=>{cancelled=true;}})},{});}
    catch(error){return {cancelled,message:error.message};}
    finally{globalThis.setTimeout=schedule;}
   });
   assert.equal(result.cancelled,true);assert.match(result.message,/タイムアウト/);
  }finally{await page.close();}
 });
 for(const format of ['jpeg','webp']) test(`HEIC ${format} output and URL cleanup`,async()=>{
  const {page}=await open('heic');try{
   await page.locator('input[type=file]').setInputFiles(file('photo.heic',fs.readFileSync('.tmp/example.heic'),'image/heic'));
   await page.locator(`input[name=output-format][value=${format}]`).check({force:true});
   const result=await convert('heic',page);
   if(format==='jpeg')assert.equal(result.readUInt16BE(0),0xffd8);
   else assert.equal(result.subarray(8,12).toString(),'WEBP');
   await page.evaluate(()=>{globalThis.__revoked=[];const original=URL.revokeObjectURL;URL.revokeObjectURL=url=>{globalThis.__revoked.push(url);original.call(URL,url);};});
   await page.locator('#clear-all-btn').click();
   assert.equal(await page.evaluate(()=>globalThis.__revoked.length),1);
  }finally{await page.close();}
 });
 test('PNG, JPEG, GIF and WebP image inputs produce four PDF pages',async()=>{
  const {page}=await open('img2pdf');try{
   const data=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=c.height=16;c.getContext('2d').fillRect(0,0,16,16);
    return ['image/jpeg','image/webp'].map(type=>c.toDataURL(type).split(',')[1]);
   });
   await page.locator('input[type=file]').setInputFiles([
    file('a.png',fixtures.png,'image/png'),file('b.jpg',Buffer.from(data[0],'base64'),'image/jpeg'),
    file('c.webp',Buffer.from(data[1],'base64'),'image/webp'),file('d.gif',Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64'),'image/gif')
   ]);
   await page.waitForFunction(()=>document.querySelectorAll('#file-list-container .remove-btn').length===4);
   assert.equal((await PDFDocument.load(await convert('img2pdf',page))).getPageCount(),4);
  }finally{await page.close();}
 });
 for(const name of ['index','merge','split','compress','outline']) test(`${name}: encrypted PDF rejected safely`,async()=>{
   const {page,record}=await open(name);
   try {
    const encrypted=file('encrypted.pdf',Buffer.from(fs.readFileSync('tests/encrypted.base64','utf8'),'base64'));
    await page.locator('input[type=file]').first().setInputFiles(name==='merge'?[encrypted,file('valid.pdf')]:encrypted);
    if(['compress','merge'].includes(name)) await page.locator(`#${name}-btn`).click();
    if(name==='index') await page.getByText('読込エラー',{exact:true}).waitFor();
    else await page.locator('#error-box').waitFor({state:'visible'});
    assert.deepEqual(record.errors,[]);
   }finally{await page.close();}
 });
 test('page, canvas, file-count and cumulative-byte limits',async()=>{
   const {page}=await open('split');try{
    const outcomes=await page.evaluate(()=>{
      const catches=fn=>{try{fn();return false;}catch{return true;}};
      return [catches(()=>validateFiles(Array.from({length:51},()=>({size:1})))), catches(()=>validateFiles(Array.from({length:5},()=>({size:50*1024*1024})))), catches(()=>checkPixels(20000,2)), catches(()=>checkPixels(8000,8000))];
    });
    assert.deepEqual(outcomes,[true,true,true,true]);
    await page.locator('input[type=file]').setInputFiles(file('501-pages.pdf',await fixtures.pdf({pages:501})));
    await page.locator('#error-box').waitFor({state:'visible'});
    assert.equal(await page.locator('#execute-section').isVisible(),false);
   }finally{await page.close();}
 });
 test('compression rejects oversized page canvas and restores controls',async()=>{
   const {page,record}=await open('compress');try{
    await page.locator('input[type=file]').setInputFiles(file('huge-page.pdf',await fixtures.pdf({huge:true})));
    await page.locator('#compress-btn').click();
    await page.locator('#error-box').waitFor({state:'visible'});
    assert.equal(await page.locator('#compress-btn').isEnabled(),true);
    assert.deepEqual(record.errors,[]);
   }finally{await page.close();}
 });
 test('actual 51 MiB file and 51-file selection are rejected',async()=>{
  const {page}=await open('compress');try{
   const large=path.resolve('.tmp/large-test.pdf');
   fs.writeFileSync(large,Buffer.alloc(51*1024*1024));
   await page.locator('input[type=file]').setInputFiles(large);
   fs.unlinkSync(large);
   await page.locator('#error-box').waitFor({state:'visible'});
   assert.match(await page.locator('#error-box').textContent(),/50/);
   await page.locator('input[type=file]').setInputFiles(Array.from({length:51},(_,i)=>file(i+'.pdf')));
   assert.match(await page.locator('#error-box').textContent(),/50/);
  }finally{await page.close();}
 });
 for(const name of names) test(`${name}: corrupt input recovers without unhandled rejection`,{timeout:60000},async()=>{
   const {page,record}=await open(name);
   try {
    const type=name==='heic'?'image/heic':name==='img2pdf'?'image/png':'application/pdf';
    const ext=name==='heic'?'heic':name==='img2pdf'?'png':'pdf';
    const corrupt=file(fixtures.payload+'.'+ext,Buffer.from('not valid file data'),type);
    await page.locator('input[type=file]').first().setInputFiles(name==='merge'?[corrupt,file('valid.pdf')]:corrupt);
    if(['heic','compress','merge'].includes(name)) await page.locator(`#${name==='heic'?'convert':name}-btn`).click();
    if(name==='heic') await page.locator('#results-grid').getByText(fixtures.payload+'.heic',{exact:true}).waitFor();
    else if(name!=='index') await page.locator('#error-box').waitFor({state:'visible'});
    else await page.getByText(/読込エラー|読み込みエラー|Read Error/i).first().waitFor();
    assert.deepEqual(record.errors,[]);
    assert.equal(await page.evaluate(()=>globalThis.__xss),undefined);
    assert.equal(await page.locator('[onerror]').count(),0);
   }finally{await page.close();}
 });
 for(const name of names) test(`${name}: rejects oversized input before reading`,async()=>{
   const {page}=await open(name);
   try {
    await page.evaluate(name=>{
      const type=name==='heic'?'image/heic':name==='img2pdf'?'image/png':'application/pdf';
      const file=new File(['x'],'large.'+(name==='heic'?'heic':name==='img2pdf'?'png':'pdf'),{type});
      Object.defineProperty(file,'size',{value:51*1024*1024});
      file.arrayBuffer=()=>{globalThis.__readOversized=true;throw new Error('must not read');};
      const dt=new DataTransfer();dt.items.add(file);
      const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change'));
    },name);
    await page.locator('#error-box').waitFor({state:'visible'});
    assert.match(await page.locator('#error-box').textContent(),/50/);
    assert.equal(await page.evaluate(()=>globalThis.__readOversized),undefined);
   }finally{await page.close();}
 });
 test('outline: cyclic bookmark graph is rejected',async()=>{
  const {page}=await open('outline');try{
   await page.locator('input[type=file]').setInputFiles(file('cycle.pdf',await fixtures.pdf({cycle:true})));
   await page.locator('#error-box').waitFor({state:'visible'});
   assert.match(await page.locator('#error-box').textContent(),/しおり構造/);
  }finally{await page.close();}
 });
 test('HEIC input also converts to PDF through shared decoder',async()=>{
  const {page,record}=await open('img2pdf');try{
   await page.locator('input[type=file]').setInputFiles(file('photo.heic',fs.readFileSync('.tmp/example.heic'),'image/heic'));
   const result=await convert('img2pdf',page);
   assert.equal((await PDFDocument.load(result)).getPageCount(),1);
   assert.deepEqual(record.errors,[]);
  }finally{await page.close();}
 });
}
