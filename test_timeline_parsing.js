const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const filePath = path.join(process.cwd(), 'data', 'raw', 'Timeline_Current_Owner_Count.csv');
const fileContent = fs.readFileSync(filePath, 'utf-8');
const content = fileContent.charCodeAt(0) === 0xFEFF ? fileContent.slice(1) : fileContent;

const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true
});

console.log('First record:', records[0]);
console.log('Keys:', Object.keys(records[0]));

const firstRow = records[0];
const allKeys = Object.keys(firstRow);
const ownerKey = allKeys[0];
console.log('Owner Key:', ownerKey);

const yearKeys = allKeys.filter(k => {
    const year = parseInt(k);
    return !isNaN(year) && year >= 2000 && year <= 2030;
}).sort();
console.log('Year Keys:', yearKeys);

const row = records[0];
const owner = row[ownerKey];
console.log('Owner value:', owner);

yearKeys.forEach(yearStr => {
    const rawValue = row[yearStr];
    console.log(`Year ${yearStr}: raw="${rawValue}", parsed=${parseInt(rawValue || '0')}`);
});
