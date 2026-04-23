#!/usr/bin/env node
/**
 * One-off script to extract raw text from HZMO PDF for parser debugging.
 * Run: node scripts/extract-pdf-text.mjs <path-to-pdf>
 */
import { readFileSync } from 'fs';
import { PDFParse } from 'pdf-parse';

const pdfPath = process.argv[2] || '/Users/jbrdar/Downloads/Elektronicki_zapis_260228_191117.pdf';

const buf = readFileSync(pdfPath);
const parser = new PDFParse({ data: new Uint8Array(buf) });
const result = await parser.getText();
const text = (result && typeof result === 'object' && 'text' in result ? result.text : typeof result === 'string' ? result : '') ?? '';
console.log('--- RAW PDF TEXT (start) ---');
console.log(text.slice(0, 3000));
console.log('--- RAW PDF TEXT (end) ---');
