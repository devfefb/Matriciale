const XLSX = require('xlsx');
const fs = require('fs');

const excelFilePath = 'classificacoes.xlsx'; // Path to your Excel file
const jsonOutputFilePath = 'output.json'; // Path for the output JSON file

try {
  const workbook = XLSX.readFile(excelFilePath);
  const sheetNameList = workbook.SheetNames;
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]]);

  // 'data' will be an array of objects, where keys are column headers.
  // Example: [{ Header1: 'Value1A', Header2: 'Value1B', Header3: 'Value1C' }, ...]

  // If you need to ensure exactly three specific columns:
  const outputArray = data

  fs.writeFile(jsonOutputFilePath, JSON.stringify(outputArray, null, 2), (err) => {
    if (err) {
      console.error('Error writing JSON file:', err);
    } else {
      console.log(`Successfully converted ${excelFilePath} to ${jsonOutputFilePath}`);
    }
  });

} catch (error) {
  console.error('Error processing Excel file:', error);
}