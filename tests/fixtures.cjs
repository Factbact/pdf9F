const { PDFDocument, PDFName, PDFHexString } = require('pdf-lib');
exports.payload = `<img src=x onerror="globalThis.__xss=1">'&`;
exports.pdf = async function({ pages = 4, huge = false, cycle = false } = {}) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage(huge ? [100000,100000] : [300,400]);
    page.drawText(`Page ${i + 1}`, { x:30,y:50,size:16 });
  }
  const root = doc.context.obj({ Type: 'Outlines' });
  const rootRef = doc.context.register(root);
  const nodes = [2,1].map((n,i) => doc.context.obj({ Title: PDFHexString.fromText(`${n} ${exports.payload}`), Parent: rootRef, Dest: [doc.getPage(i).ref, 'Fit'] }));
  const refs = nodes.map(n => doc.context.register(n));
  nodes[0].set(PDFName.of('Next'), refs[1]);
  nodes[1].set(PDFName.of('Prev'), refs[0]);
  if (cycle) nodes[1].set(PDFName.of('Next'),refs[0]);
  root.set(PDFName.of('First'),refs[0]); root.set(PDFName.of('Last'),refs[1]);
  doc.catalog.set(PDFName.of('Outlines'),rootRef);
  return Buffer.from(await doc.save());
};
exports.png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAIElEQVR4nGP8z0AaYCJRPcOoBmIAE1GqkMCoBmIAyRoAQC4BH1m1rqAAAAAASUVORK5CYII=','base64');
