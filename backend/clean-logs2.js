const fs = require('fs');
const content = fs.readFileSync('logs2.json', 'utf16le');
fs.writeFileSync('clean-logs2.txt', content.replace(/\0/g, ''));
console.log('done');
