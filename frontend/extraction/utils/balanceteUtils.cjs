const ExcelJS = require('exceljs');

/**
 * Processa a planilha balancete e extrai itens movimentados
 * @param {string} caminhoArquivo - Caminho para o arquivo balancete.xlsx
 * @returns {Array} Array de itens movimentados
 */
async function processarBalancete(caminhoArquivo) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(caminhoArquivo);
    
    const worksheet = workbook.getWorksheet(1); // Primeira planilha
    const itensMovimentados = [];
    
    // Pula o cabeçalho (assumindo que a primeira linha é cabeçalho)
    let linhaAtual = 1;
    
    while (linhaAtual <= worksheet.rowCount) {
        const row = worksheet.getRow(linhaAtual);
        
        // Verifica se a linha tem dados
        if (!row.getCell(1).value) {
            linhaAtual++;
            continue;
        }
        
        // Extrai os valores das colunas
        const qtdEntradas = parseFloat(row.getCell(7).value) || 0; // 7ª coluna
        const qtdSaidas = parseFloat(row.getCell(9).value) || 0;   // 9ª coluna
        
        // Verifica se o item teve movimentação
        if (qtdEntradas > 0 || qtdSaidas > 0) {
            const item = {
                cod_sistemico_item: row.getCell(1).value?.toString() || '',
                descricao_item: row.getCell(2).value?.toString() || '',
                // 3ª coluna é ignorada (em branco)
                tipo_unid_item: row.getCell(4).value?.toString() || '',
                qtd_periodo_inicial: parseFloat(row.getCell(5).value) || 0,
                valor_item_periodo_inicial: parseFloat(row.getCell(6).value) || 0,
                qtd_entradas_periodo: qtdEntradas,
                valor_entradas_periodo: parseFloat(row.getCell(8).value) || 0,
                qtd_saidas_periodo: qtdSaidas,
                valor_saidas_periodo: parseFloat(row.getCell(10).value) || 0,
                qtd_periodo_final: parseFloat(row.getCell(11).value) || 0,
                valor_unitario_periodo_final: parseFloat(row.getCell(12).value) || 0,
                valor_item_periodo_final: parseFloat(row.getCell(13).value) || 0,
                movimentacoes: [] // Será preenchido posteriormente
            };
            
            itensMovimentados.push(item);
        }
        
        linhaAtual++;
    }
    
    return itensMovimentados;
}

/**
 * Mapeia as colunas da planilha balancete para o objeto item
 * @param {ExcelJS.Row} row - Linha da planilha
 * @returns {Object} Objeto item mapeado
 */
function mapearLinhaBalancete(row) {
    return {
        cod_sistemico_item: row.getCell(1).value?.toString() || '',
        descricao_item: row.getCell(2).value?.toString() || '',
        // 3ª coluna é ignorada
        tipo_unid_item: row.getCell(4).value?.toString() || '',
        qtd_periodo_inicial: parseFloat(row.getCell(5).value) || 0,
        valor_item_periodo_inicial: parseFloat(row.getCell(6).value) || 0,
        qtd_entradas_periodo: parseFloat(row.getCell(7).value) || 0,
        valor_entradas_periodo: parseFloat(row.getCell(8).value) || 0,
        qtd_saidas_periodo: parseFloat(row.getCell(9).value) || 0,
        valor_saidas_periodo: parseFloat(row.getCell(10).value) || 0,
        qtd_periodo_final: parseFloat(row.getCell(11).value) || 0,
        valor_unitario_periodo_final: parseFloat(row.getCell(12).value) || 0,
        valor_item_periodo_final: parseFloat(row.getCell(13).value) || 0,
        movimentacoes: []
    };
}

module.exports = {
    processarBalancete,
    mapearLinhaBalancete
}; 