
const fs = require('fs');
const p = 'c:/Users/cadu_/OneDrive/Área de Trabalho/C.E. Afonso Soluções Digitais/Serviços/PDL FLOW - ÁREA DE TRABALHO/src/pages/AgentesIA.tsx';

let content = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

// Fix the truncated replace call on line 304
// Bad:  ? headers[i][0].replace(/===/g, ').trim()
// Good: ? headers[i][0].replace(/===/g, '').trim()
const bad  = "? headers[i][0].replace(/===/g, ').trim()";
const good = "? headers[i][0].replace(/===/g, '').trim()";

if (content.includes(bad)) {
  content = content.replace(bad, good);
  console.log('Fix applied: restored missing quote in replace call');
} else {
  console.log('Pattern not found — checking actual content around line 304...');
  const lines = content.split('\n');
  for (let i = 299; i <= 309; i++) {
    console.log(`Line ${i+1}: ${lines[i]}`);
  }
}

fs.writeFileSync(p, content, 'utf8');
console.log('File saved.');
