const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', 'expo-av', 'build', 'Audio', 'Recording.js');

if (!fs.existsSync(target)) {
  process.exit(0);
}

const src = fs.readFileSync(target, 'utf8');
const next = src.replace("./Recording.types';", "./Recording.types.js';");

if (next !== src) {
  fs.writeFileSync(target, next, 'utf8');
}
