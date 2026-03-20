const fs = require('fs');
const path = require('path');
const { buildLocationPages } = require('./generate-location-pages');
const { buildServicePages } = require('./generate-service-pages');

const projectRoot = path.resolve(__dirname, '..');

const normalize = (content) => String(content).replace(/\r\n/g, '\n');

const expectedOutputs = [...buildLocationPages(), ...buildServicePages()];
const mismatches = [];

for (const { fileName, html } of expectedOutputs) {
  const outputPath = path.join(projectRoot, fileName);

  if (!fs.existsSync(outputPath)) {
    mismatches.push(`${fileName}: missing generated file`);
    continue;
  }

  const current = normalize(fs.readFileSync(outputPath, 'utf8'));
  const expected = normalize(html);

  if (current !== expected) {
    mismatches.push(`${fileName}: generated output is out of date`);
  }
}

if (mismatches.length) {
  console.error('Generated public pages are out of sync:');
  mismatches.forEach((message) => console.error(`- ${message}`));
  console.error('Run `npm run generate:public-pages:content` and commit the updated HTML files.');
  console.error('Use `npm run generate:public-pages` only when you also need the full asset optimisation pass.');
  process.exit(1);
}

console.log(`Verified ${expectedOutputs.length} generated public pages.`);
