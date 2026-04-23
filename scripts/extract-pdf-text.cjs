const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const pdfPath = process.argv[2] || path.join(process.env.HOME || '', 'Downloads', 'Elektronicki_zapis_260228_191117.pdf');

async function run() {
  const data = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(data) });
  const result = await parser.getText();
  console.log('--- TEXT ---');
  console.log(result.text || result);
}

run().catch(err => console.error(err));
