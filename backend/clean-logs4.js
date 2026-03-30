const fs = require('fs');
const content = fs.readFileSync('logs4.json', 'utf16le');
fs.writeFileSync('clean-logs4.txt', content.replace(/\0/g, ''));
console.log('done');
