const fs = require('fs');
const content = JSON.parse(fs.readFileSync('logs4.json', 'utf16le'));
content.forEach(c => console.log(c.textPayload || c.jsonPayload?.message || c.jsonPayload?.error));
