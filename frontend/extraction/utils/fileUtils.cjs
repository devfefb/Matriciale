const fs = require('fs').promises;
const path = require('path');

/**
 * Verifica se um arquivo existe
 * @param {string} caminhoArquivo - Caminho do arquivo
 * @returns {boolean} True se o arquivo existe
 */
async function arquivoExiste(caminhoArquivo) {
    try {
        await fs.access(caminhoArquivo);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Lista arquivos .xlsx em um diretório
 * @param {string} diretorio - Caminho do diretório
 * @returns {Array} Array com nomes dos arquivos .xlsx
 */
async function listarArquivosXlsx(diretorio) {
    try {
        const arquivos = await fs.readdir(diretorio);
        return arquivos.filter(arquivo => arquivo.toLowerCase().endsWith('.xlsx'));
    } catch (error) {
        console.error(`Erro ao listar arquivos em ${diretorio}:`, error.message);
        return [];
    }
}

/**
 * Encontra arquivos específicos no diretório de entrada
 * @param {string} diretorioInput - Diretório de entrada
 * @returns {Object} Objeto com caminhos dos arquivos encontrados
 */
async function encontrarArquivosEntrada(diretorioInput) {
    const arquivos = await listarArquivosXlsx(diretorioInput);
    
    const arquivosEncontrados = {
        balancete: null,
        movimentacao: null
    };
    
    for (const arquivo of arquivos) {
        const nomeArquivo = arquivo.toLowerCase();
        
        if (nomeArquivo.toLowerCase().includes('balancete')) {
            arquivosEncontrados.balancete = path.join(diretorioInput, arquivo);
        } else if (nomeArquivo.toLowerCase().includes('movimentacao') || nomeArquivo.toLowerCase().includes('movimentação')) {
            arquivosEncontrados.movimentacao = path.join(diretorioInput, arquivo);
        }
    }
    
    return arquivosEncontrados;
}

/**
 * Valida se os arquivos necessários foram encontrados
 * @param {Object} arquivos - Objeto com caminhos dos arquivos
 * @returns {Object} Objeto com resultado da validação
 */
async function validarArquivos(arquivos) {
    const resultado = {
        valido: true,
        erros: []
    };
    
    if (!arquivos.balancete) {
        resultado.valido = false;
        resultado.erros.push('Arquivo de balancete não encontrado');
    } else if (!(await arquivoExiste(arquivos.balancete))) {
        resultado.valido = false;
        resultado.erros.push(`Arquivo balancete não existe: ${arquivos.balancete}`);
    }
    
    if (!arquivos.movimentacao) {
        resultado.valido = false;
        resultado.erros.push('Arquivo de movimentacoes não encontrado');
    } else if (!(await arquivoExiste(arquivos.movimentacao))) {
        resultado.valido = false;
        resultado.erros.push(`Arquivo movimentacao não existe: ${arquivos.movimentacao}`);
    }
    
    return resultado;
}

/**
 * Salva dados em arquivo JSON
 * @param {Object} dados - Dados a serem salvos
 * @param {string} caminhoArquivo - Caminho do arquivo de saída
 */
async function salvarDados(dados, caminhoArquivo) {
    try {
        const diretorio = path.dirname(caminhoArquivo);
        await fs.mkdir(diretorio, { recursive: true });
        
        await fs.writeFile(caminhoArquivo, JSON.stringify(dados, null, 2), 'utf8');
        console.log(`Dados salvos em: ${caminhoArquivo}`);
    } catch (error) {
        console.error('Erro ao salvar dados:', error.message);
        throw error;
    }
}

module.exports = {
    arquivoExiste,
    listarArquivosXlsx,
    encontrarArquivosEntrada,
    validarArquivos,
    salvarDados
}; 