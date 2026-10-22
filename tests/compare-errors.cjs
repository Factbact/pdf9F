// Diagnostic comparison, not a pass/fail oracle for the insecure baseline.
const fs=require('node:fs'),{chromium}=require('playwright'),{serve}=require('./server.cjs'),fixtures=require('./fixtures.cjs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});const records=[];
 try{
 for(const baseline of [true,false]){
  const {server,url}=await serve(baseline?require('node:path').resolve('.tmp/baseline'):process.cwd());
  try{
   for(const name of ['index','merge','split','compress','heic','img2pdf','outline']){
    for(const kind of ['corrupt',...(['heic','img2pdf'].includes(name)?[]:['encrypted'])]){
     const page=await browser.newPage({locale:'ja-JP'});page.setDefaultTimeout(5000);
     const record={baseline,name,kind,unhandled:[]};records.push(record);
     page.on('pageerror',e=>record.unhandled.push(e.message));
     try{
      await page.goto(url+name+'.html');
      const buffer=kind==='encrypted'?Buffer.from(fs.readFileSync('tests/encrypted.base64','utf8'),'base64'):Buffer.from('broken');
      const ext=name==='heic'?'heic':name==='img2pdf'?'png':'pdf';
      const mimeType=ext==='heic'?'image/heic':ext==='png'?'image/png':'application/pdf';
      const input={name:'sample.'+ext,mimeType,buffer};
      await page.locator('input[type=file]').first().setInputFiles(name==='merge'?[input,{name:'valid.pdf',mimeType:'application/pdf',buffer:await fixtures.pdf()}]:input);
      await page.waitForTimeout(250);
      const selector=['heic','img2pdf','index'].includes(name)?'#convert-btn':name==='outline'?'#sort-btn':`#${name}-btn`;
      if(await page.locator(selector).isVisible()&&await page.locator(selector).isEnabled())await page.locator(selector).click();
      await page.waitForTimeout(750);
      record.errorVisible=await page.locator('#error-box').isVisible();
      record.error=record.errorVisible?await page.locator('#error-box').innerText():null;
      record.controlEnabled=await page.locator(selector).isEnabled();
      record.readError=await page.getByText('読込エラー',{exact:true}).count()>0;
     }catch(e){record.testError=e.message;}
     finally{await page.close();}
    }
   }
  }finally{server.close();}
 }
 }finally{await browser.close();fs.writeFileSync('test-results/error-comparison.json',JSON.stringify(records,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
