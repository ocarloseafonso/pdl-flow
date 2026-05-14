
const fs = require('fs');
const filePath = 'c:/Users/cadu_/OneDrive/Área de Trabalho/C.E. Afonso Soluções Digitais/Serviços/PDL FLOW - ÁREA DE TRABALHO/src/lib/agentConfig.ts';

let content = fs.readFileSync(filePath, 'utf8');

// ── Step 1: Normalize line endings to \n ──
content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// ── Step 2: Decode all escaped unicode sequences ──
content = content.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
  String.fromCharCode(parseInt(hex, 16))
);

const lines = content.split('\n');
console.log('Total lines:', lines.length);

// ── Step 3: Verify agent 6 close (line ~331) ──
for (let i = 328; i <= 335; i++) {
  const l = lines[i] || '';
  if (l.includes('Keywords locais') || l.includes('bairros espec') || l.includes('8:')) {
    console.log(`Line ${i+1}: ${l.substring(0, 100)}`);
  }
}

// ── Step 4: Verify agent 8 transition (line ~414) ──
console.log('\n=== Agent 8 end / Agent 7 start ===');
for (let i = 412; i <= 420; i++) {
  console.log(`Line ${i+1}: ${(lines[i] || '').substring(0, 100)}`);
}

// ── Step 5: Verify agent 7 end ──
console.log('\n=== Agent 7 end ===');
for (let i = 478; i <= 488; i++) {
  console.log(`Line ${i+1}: ${(lines[i] || '').substring(0, 100)}`);
}

// ── Step 6: Check for any remaining issues ──
console.log('\n=== Syntax-sensitive lines ===');
let inAgent6 = false;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l && l.includes("6: `")) inAgent6 = true;
  if (inAgent6 && l && l.match(/^\s*[0-9]+:/) && !l.includes("6:")) inAgent6 = false;
  if (l && l.includes('espec?')) {
    console.log(`CORRUPTION at line ${i+1}: ${l.substring(0, 100)}`);
  }
}

// Write normalized file
fs.writeFileSync(filePath, content, 'utf8');
console.log('\nFile written with normalized line endings + decoded unicode.');
console.log('Run: npx tsc --noEmit to check for TypeScript errors.');
