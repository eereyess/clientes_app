const fs = require('fs');
const content = fs.readFileSync('logs3.json', 'utf16le');
fs.writeFileSync('clean-logs3.txt', content.replace(/\0/g, ''));
console.log('done');
