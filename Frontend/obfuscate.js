const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const inputPath = path.resolve(__dirname, 'src/main.js');
const outputPath = path.resolve(__dirname, 'src/main.obf.js');

const code = fs.readFileSync(inputPath, 'utf8');

const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
  compact: true,
  controlFlowFlattening: true,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  debugProtection: true,
  disableConsoleOutput: false,
}).getObfuscatedCode();

fs.writeFileSync(outputPath, obfuscatedCode);

console.log('main.js обфусцирован и сохранён как main.obf.js');
