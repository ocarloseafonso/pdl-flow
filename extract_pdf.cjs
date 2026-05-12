const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const buf = fs.readFileSync('./public/documento-gmn.pdf');
const parser = new PDFParse();
parser.pdf(buf).then(data => {
  fs.writeFileSync('./gmn_text.txt', data.text);
  console.log('OK: ' + data.text.length + ' chars, ' + data.numpages + ' pages');
  console.log(data.text.substring(0, 500));
}).catch(err => {
  console.error('ERROR:', err.message);
});

