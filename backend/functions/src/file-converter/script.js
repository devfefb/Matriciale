const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const jsonOutput = document.getElementById('jsonOutput');

// Eventos de drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('active');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('active');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('active');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
});

// Clique para abrir seletor de arquivos
browseBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
});

function parseExcelDate(excelDate) {
  // Converte número de série do Excel para data
  const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`; // Formato DD/MM/YYYY
}

function handleXLSXFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const data = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          cellDates: true,
          defval: '',
          cellTransform: (cell, header) => {
            // Tratamento específico para coluna F (DATA)
            if (header === 'F') {
              // Tratamento para diferentes tipos de data
              if (cell instanceof Date) {
                // Se for objeto Date
                const day = String(cell.getDate()).padStart(2, '0');
                const month = String(cell.getMonth() + 1).padStart(2, '0');
                const year = cell.getFullYear();
                return `${day}/${month}/${year}`; // Formato DD/MM/YYYY
              }

              // Se for número (serialização de data do Excel)
              if (typeof cell === 'number') {
                // Conversão de número de série do Excel para data
                const date = new Date(Math.round((cell - 25569) * 86440 * 1000));
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`; // Formato DD/MM/YYYY
              }

              // Se for string, tenta converter
              if (typeof cell === 'string') {
                // Assumimos que a string já está no formato DD/MM/YYYY original
                // ou pode ser convertida corretamente pelo moment
                const parsedDate = moment(cell, [
                  'DD/MM/YYYY', // Formato original esperado
                  'MM/DD/YYYY', // Adicione outros formatos se necessário
                  'YYYY-MM-DD'
                ]);

                if (parsedDate.isValid()) {
                  return parsedDate.format('DD/MM/YYYY'); // Formato DD/MM/YYYY
                }
              }

              return cell;
            }

            // Tratamento para COD_ITEM
            if (header === 'COD_ITEM') {
              return cell !== null && cell !== undefined
                ? String(Math.floor(Number(cell)))
                : '';
            }

            return cell;
          }
        });

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsBinaryString(file);
  });
}

function handleCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const csvData = e.target.result;
        const results = Papa.parse(csvData, {
          header: true,
          dynamicTyping: false,
          transformHeader: (header) => header.trim(),
          transform: (value, header) => {
            // Tratamento para DATA (coluna F)
            if (header === 'F') {
              const parsedDate = moment(value, [
                'DD/MM/YYYY', // Formato original esperado
                'MM/DD/YYYY',
                'YYYY-MM-DD'
              ]);

              if (parsedDate.isValid()) {
                return parsedDate.format('DD/MM/YYYY'); // Formato DD/MM/YYYY
              }

              return value;
            }

            // Tratamento para COD_ITEM
            if (header === 'COD_ITEM') {
              const numValue = Number(value);
              return !isNaN(numValue)
                ? String(Math.floor(numValue))
                : (value || '');
            }

            return value;
          }
        });

        resolve(results.data);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
}

function handlePDFFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const arrayBuffer = e.target.result;
      pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(pdf => {
        let fullText = [];
        const numPages = pdf.numPages;
        let pagesProcessed = 0;

        for (let i = 1; i <= numPages; i++) {
          pdf.getPage(i).then(page => {
            page.getTextContent().then(textContent => {
              const pageText = textContent.items.map(item => item.str).join(' ');
              fullText.push(`--- Page ${i} ---\n${pageText}\n`);
              pagesProcessed++;

              if (pagesProcessed === numPages) {
                // Return an array of objects, where each object represents a page
                // This makes it more "structured" in the JSON output
                const structuredText = fullText.map((text, index) => ({
                    page: index + 1,
                    content: text.replace(`--- Page ${index + 1} ---\n`, '').trim() // Clean up the page header for content
                }));
                resolve(structuredText);
              }
            }).catch(reject);
          }).catch(reject);
        }
      }).catch(reject);
    };
    reader.readAsArrayBuffer(file);
  });
}


function handleFile(file) {
  const fileExtension = file.name.split('.').pop().toLowerCase();

  let processingPromise;
  if (fileExtension === 'xlsx') {
    processingPromise = handleXLSXFile(file);
  } else if (fileExtension === 'csv') {
    processingPromise = handleCSVFile(file);
  } else if (fileExtension === 'pdf') {
    processingPromise = handlePDFFile(file);
  }
  else {
    jsonOutput.textContent = 'Formato de arquivo não suportado';
    return;
  }

  processingPromise
    .then(convertedData => {
      if (!convertedData || convertedData.length === 0) {
        throw new Error('Nenhum dado encontrado no arquivo');
      }

      // For PDF, we might have a lot of text, so we'll show a limited preview
      // and indicate total pages/records.
      const isPDF = fileExtension === 'pdf';
      const displayData = isPDF ? convertedData.slice(0, 5) : convertedData.slice(0, 100);

      jsonOutput.textContent = JSON.stringify({
        totalRecordsOrPages: convertedData.length,
        preview: displayData
      }, null, 2);

      console.log('Dados convertidos:', convertedData);
    })
    .catch(error => {
      console.error('Erro completo:', error);
      jsonOutput.textContent = `Erro: ${error.message}`;
    });
}