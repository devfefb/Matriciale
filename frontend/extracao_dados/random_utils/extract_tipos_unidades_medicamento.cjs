const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

// --- Configuração ---

// ATENÇÃO: Verifique se o caminho está correto. 
// Backslashes (\) em strings JS precisam ser escapados (\\).
const INPUT_FILE_PATH = 'D:\\Beets\\Matriciale\\Well\\Palmares_data\\[Completo] Saída - Palmares - Base de Movimentações.xlsx';

// O nome da aba que você quer ler
const SHEET_NAME = 'BalanceteCAF';

// O nome do arquivo JSON que será gerado
const OUTPUT_FILE_PATH = 'dados_convertidos.json';

// --- Fim da Configuração ---

console.log('Iniciando processo de conversão...');

try {
    // 1. Verificar se o arquivo de entrada existe
    if (!fs.existsSync(INPUT_FILE_PATH)) {
        throw new Error(`Arquivo de entrada não encontrado: ${INPUT_FILE_PATH}`);
    }

    // 2. Ler o arquivo Excel do disco
    const workbookBuffer = fs.readFileSync(INPUT_FILE_PATH);

    // 3. Parsear o arquivo
    const workbook = xlsx.read(workbookBuffer, { type: 'buffer' });

    // 4. Pegar a aba específica
    const sheet = workbook.Sheets[SHEET_NAME];
    if (!sheet) {
        throw new Error(`A aba "${SHEET_NAME}" não foi encontrada no arquivo Excel.`);
    }

    // 5. Converter a aba para um formato de "array de arrays"
    // Usamos { header: 1 } para obter dados brutos, sem tentar adivinhar cabeçalhos
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // 6. Processar os dados
    // .slice(1) pula a primeira linha (que você disse ser o cabeçalho)
    const dataRows = rawData.slice(1);

    const jsonData = dataRows
        // Filtra linhas que possam estar completamente vazias
        .filter(row => row.length > 0 && row[0] != null) 
        .map(row => {
            // Mapeia as 3 primeiras colunas para os nomes de chave desejados
            // row[0] = Coluna A
            // row[1] = Coluna B
            // row[2] = Coluna C
            return {
                cod: row[0],
                descricao: row[1],
                unidade: row[2]
            };
        });

    // 7. Salvar o array de objetos como um arquivo JSON
    // JSON.stringify(..., null, 2) formata o JSON de forma legível
    fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(jsonData, null, 2), 'utf-8');

    console.log(`\nSucesso! ✨`);
    console.log(`Total de ${jsonData.length} linhas processadas.`);
    console.log(`Arquivo salvo em: ${path.resolve(OUTPUT_FILE_PATH)}`);

} catch (error) {
    console.error('\n❌ Ocorreu um erro durante a execução:');
    console.error(error.message);
    process.exit(1); // Encerra o script com um código de erro
}