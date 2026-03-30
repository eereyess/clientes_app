const fs = require('fs');
const content = fs.readFileSync('logs.json', 'utf16le');
console.log(content.slice(-2000));
