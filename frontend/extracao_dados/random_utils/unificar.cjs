const fs = require('fs');
const path = require('path');

// --- Configuração ---

// 1. Defina os nomes dos seus 3 arquivos JSON de entrada
const INPUT_FILE_1 = 'dados_convertidos.json'; // Mude para o nome do seu primeiro arquivo
const INPUT_FILE_2 = 'dados_convertidos_esf.json'; // Mude para o nome do seu segundo arquivo
const INPUT_FILE_3 = 'dados_convertidos_olavo.json'; // Mude para o nome do seu terceiro arquivo

// 2. Defina o nome do arquivo JSON final que será gerado
const OUTPUT_FILE_PATH = 'medicamentos_unicos.json';

// 3. Defina qual propriedade identifica um item (para remover duplicados)
// Com base no script anterior, usaremos 'cod'.
const UNIQUE_KEY = 'cod';

// --- Fim da Configuração ---

console.log('Iniciando processo de unificação...');

/**
 * Função auxiliar para ler e parsear um arquivo JSON de forma segura.
 * @param {string} filePath - O caminho para o arquivo JSON.
 * @returns {Array<object>} - O array de objetos do arquivo.
 */
function readAndParseJson(filePath) {
    try {
        const fullPath = path.resolve(filePath); // Garante que o caminho é absoluto
        if (!fs.existsSync(fullPath)) {
            // Se o arquivo não existir, retorna um array vazio em vez de quebrar
            console.warn(`Aviso: Arquivo não encontrado: ${filePath}. Ignorando.`);
            return [];
        }
        
        const fileContent = fs.readFileSync(fullPath, 'utf-8');
        return JSON.parse(fileContent);

    } catch (parseError) {
        // Se o JSON for inválido, lança um erro claro
        throw new Error(`Erro ao ler ou parsear o arquivo "${filePath}": ${parseError.message}`);
    }
}

try {
    // 1. Ler e parsear os três arquivos
    const data1 = readAndParseJson(INPUT_FILE_1);
    const data2 = readAndParseJson(INPUT_FILE_2);
    const data3 = readAndParseJson(INPUT_FILE_3);

    console.log(`Itens lidos de ${INPUT_FILE_1}: ${data1.length}`);
    console.log(`Itens lidos de ${INPUT_FILE_2}: ${data2.length}`);
    console.log(`Itens lidos de ${INPUT_FILE_3}: ${data3.length}`);

    // 2. Combinar todos os arrays em um só
    const combinedItems = [...data1, ...data2, ...data3];
    console.log(`Total de itens (com duplicados): ${combinedItems.length}`);

    // 3. Remover duplicados usando um Map (baseado na UNIQUE_KEY)
    // Isso é muito eficiente. A chave do Map será o 'cod', e o valor será o objeto 'item' inteiro.
    const itemMap = new Map();
    for (const item of combinedItems) {
        // Verifica se o item é válido e tem a chave que estamos usando
        if (item && item[UNIQUE_KEY] != null) {
            const key = item[UNIQUE_KEY];
            
            // Se o Map ainda NÃO tiver essa chave, nós a adicionamos.
            // Se já tiver, ele simplesmente ignora, mantendo o *primeiro* item que encontrou.
            if (!itemMap.has(key)) {
                itemMap.set(key, item);
            }
        }
    }

    // 4. Converter os valores do Map (que são os objetos únicos) de volta para um array
    const uniqueItems = Array.from(itemMap.values());
    console.log(`Total de itens únicos (sem duplicados): ${uniqueItems.length}`);

    // 5. Salvar o resultado no arquivo de saída
    fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(uniqueItems, null, 2), 'utf-8');

    console.log(`\nSucesso! ✨`);
    console.log(`Arquivo unificado salvo em: ${path.resolve(OUTPUT_FILE_PATH)}`);

} catch (error) {
    console.error('\n❌ Ocorreu um erro durante a execução:');
    console.error(error.message);
    process.exit(1); // Encerra o script com um código de erro
}