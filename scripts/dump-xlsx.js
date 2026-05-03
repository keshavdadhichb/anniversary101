const XLSX = require('xlsx');
const workbook = XLSX.readFile('VRINDAVAN.xlsx');

const result = {};
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  result[sheetName] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
});

console.log(JSON.stringify(result, null, 2));
