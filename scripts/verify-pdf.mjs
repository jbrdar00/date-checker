#!/usr/bin/env node
/**
 * Extract PDF text and output for manual verification.
 * Run: node scripts/verify-pdf.mjs <path-to-pdf>
 * Then run the app, import the PDF, and copy the summary from the UI - or we print parsed data here.
 */
import { readFileSync } from 'fs';
import { PDFParse } from 'pdf-parse';

const pdfPath = process.argv[2] || '/Users/jbrdar/Downloads/Elektronicki_zapis_260228_191117.pdf';

const buf = readFileSync(pdfPath);
const parser = new PDFParse({ data: new Uint8Array(buf) });
const result = await parser.getText();
const text = (result?.text ?? (typeof result === 'string' ? result : '')) ?? '';

// Write text to stdout so we can pipe or inspect
console.log('--- PDF TEXT (first 4000 chars) ---\n');
console.log(text.slice(0, 4000));
console.log('\n--- END ---');
