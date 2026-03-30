const fs = require('fs');
const content = fs.readFileSync('logs.json', 'utf16le');
fs.writeFileSync('clean-logs.txt', content.replace(/\0/g, ''));
console.log('done');
