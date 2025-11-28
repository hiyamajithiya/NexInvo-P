/**
 * Update Version Script
 * Run this before building to update the version.json file
 *
 * Usage:
 *   node scripts/update-version.js
 *   node scripts/update-version.js 1.0.2
 *   node scripts/update-version.js patch  (auto-increment patch version)
 *   node scripts/update-version.js minor  (auto-increment minor version)
 *   node scripts/update-version.js major  (auto-increment major version)
 */

const fs = require('fs');
const path = require('path');

const versionFilePath = path.join(__dirname, '..', 'public', 'version.json');

// Read current version
let currentVersion = { version: '1.0.0', buildDate: new Date().toISOString() };
try {
  const content = fs.readFileSync(versionFilePath, 'utf8');
  currentVersion = JSON.parse(content);
} catch (e) {
  console.log('No existing version file, creating new one');
}

const arg = process.argv[2];
let newVersion = currentVersion.version;

if (arg) {
  if (arg === 'patch' || arg === 'minor' || arg === 'major') {
    // Auto-increment version
    const parts = currentVersion.version.split('.').map(Number);
    if (arg === 'patch') {
      parts[2] = (parts[2] || 0) + 1;
    } else if (arg === 'minor') {
      parts[1] = (parts[1] || 0) + 1;
      parts[2] = 0;
    } else if (arg === 'major') {
      parts[0] = (parts[0] || 1) + 1;
      parts[1] = 0;
      parts[2] = 0;
    }
    newVersion = parts.join('.');
  } else {
    // Use provided version
    newVersion = arg;
  }
}

const versionData = {
  version: newVersion,
  buildDate: new Date().toISOString()
};

fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2) + '\n');

console.log(`Version updated: ${currentVersion.version} -> ${newVersion}`);
console.log(`Build date: ${versionData.buildDate}`);
