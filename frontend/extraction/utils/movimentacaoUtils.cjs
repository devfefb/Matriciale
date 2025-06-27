const ExcelJS = require('exceljs');
const moment = require('moment');

/**
 * Processa a planilha movimentacao e extrai período e movimentações
 * @param {string} caminhoArquivo - Caminho para o arquivo movimentacao.xlsx
 * @param {Array} itens - Array de itens do balancete
 * @returns {Object} Objeto com período e itens com movimentações
 */
async function processarMovimentacao(caminhoArquivo, itens) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(caminhoArquivo);
    
    const worksheet = workbook.getWorksheet(1); // Primeira planilha
    let periodo = null;
    let indiceItemAtual = 0;
    
    // Pula o cabeçalho (assumindo que a primeira linha é cabeçalho)
    let linhaAtual = 1;
    
    while (linhaAtual <= worksheet.rowCount && indiceItemAtual < itens.length) {
        const row = worksheet.getRow(linhaAtual);
        
        // Verifica se a linha tem dados
        if (!row.getCell(1).value) {
            linhaAtual++;
            continue;
        }
        
        const historico = row.getCell(2).value?.toString() || '';
        
        // Se encontrou "SALDO ANTERIOR", processa o período e avança para o próximo item
        if (historico === 'SALDO ANTERIOR') {
            // Extrai período apenas na primeira ocorrência
            if (!periodo) {
                const dataSaldoAnterior = extrairDataMovimentacao(row.getCell(1));
                periodo = calcularPeriodo(dataSaldoAnterior);
            }
            
            // Processa a linha do saldo anterior
            const movimentacao = mapearLinhaMovimentacao(row);
            itens[indiceItemAtual].movimentacoes.push(movimentacao);
            
            // Processa as próximas linhas até encontrar outro "SALDO ANTERIOR" ou fim da planilha
            linhaAtual++;
            while (linhaAtual <= worksheet.rowCount) {
                const proximaRow = worksheet.getRow(linhaAtual);
                
                if (!proximaRow.getCell(1).value) {
                    linhaAtual++;
                    continue;
                }
                
                const proximoHistorico = proximaRow.getCell(2).value?.toString() || '';
                
                // Se encontrou outro "SALDO ANTERIOR", para de processar este item
                if (proximoHistorico === 'SALDO ANTERIOR') {
                    break;
                }
                
                // Adiciona a movimentação ao item atual
                const movimentacaoItem = mapearLinhaMovimentacao(proximaRow);
                itens[indiceItemAtual].movimentacoes.push(movimentacaoItem);
                
                linhaAtual++;
            }
            
            // Avança para o próximo item
            indiceItemAtual++;
        } else {
            linhaAtual++;
        }
    }
    
    return {
        periodo,
        itens
    };
}

/**
 * Extrai a data de uma célula da planilha
 * @param {ExcelJS.Cell} cell - Célula da planilha
 * @returns {string} Data no formato DD/MM/YYYY
 */
function extrairDataMovimentacao(cell) {
    if (cell.value !== null && cell.value !== undefined) {
        if (cell.value instanceof Date) {
            // Adiciona um dia para compensar o problema do ExcelJS
            const dataCorrigida = new Date(cell.value);
            dataCorrigida.setDate(dataCorrigida.getDate() + 1);
            
            const dia = String(dataCorrigida.getDate()).padStart(2, '0');
            const mes = String(dataCorrigida.getMonth() + 1).padStart(2, '0');
            const ano = dataCorrigida.getFullYear();
            return `${dia}/${mes}/${ano}`;
        } else {
            return String(cell.value);
        }
    }
    return '';
}

/**
 * Calcula o período baseado na data do saldo anterior
 * @param {string} dataSaldoAnterior - Data do saldo anterior no formato DD/MM/YYYY
 * @returns {Object} Objeto com periodo_inicio e periodo_fim
 */
function calcularPeriodo(dataSaldoAnterior) {
    // Usa a data exata do saldo anterior como periodo_inicio
    const periodoInicio = moment(dataSaldoAnterior, 'DD/MM/YYYY');
    
    // Adiciona um dia ao período início para compensar o problema do ExcelJS
    periodoInicio.add(1, 'day');
    
    // Período fim é 6 dias após o período início
    const periodoFim = periodoInicio.clone().add(6, 'days');
    
    return {
        periodo_inicio: periodoInicio.format('DD/MM/YYYY'),
        periodo_fim: periodoFim.format('DD/MM/YYYY')
    };
}

/**
 * Mapeia uma linha da planilha movimentacao para objeto movimentacao
 * @param {ExcelJS.Row} row - Linha da planilha
 * @returns {Object} Objeto movimentacao mapeado
 */
function mapearLinhaMovimentacao(row) {
    // Pega o valor puro da célula da data sem nenhum processamento
    const dataCell = row.getCell(1);
    let dataMovimentacao = '';
    
    // Verifica se a célula tem valor
    if (dataCell.value !== null && dataCell.value !== undefined) {
        // Se for um objeto Date, converte para string no formato DD/MM/YYYY
        if (dataCell.value instanceof Date) {
            // Adiciona um dia para compensar o problema do ExcelJS
            const dataCorrigida = new Date(dataCell.value);
            dataCorrigida.setDate(dataCorrigida.getDate() + 1);
            
            const dia = String(dataCorrigida.getDate()).padStart(2, '0');
            const mes = String(dataCorrigida.getMonth() + 1).padStart(2, '0');
            const ano = dataCorrigida.getFullYear();
            dataMovimentacao = `${dia}/${mes}/${ano}`;
        } else {
            // Se não for Date, converte para string diretamente
            dataMovimentacao = String(dataCell.value);
        }
    }
    
    return {
        data_movimentacao: dataMovimentacao,
        historico: row.getCell(2).value?.toString() || '',
        documento: row.getCell(3).value?.toString() || null,
        requisicao: row.getCell(4).value?.toString() || '',
        entradas: parseFloat(row.getCell(5).value) || null,
        saidas: parseFloat(row.getCell(6).value) || 0,
        estoque: parseFloat(row.getCell(7).value) || 0,
        observacao: row.getCell(8).value?.toString() || ''
    };
}

/**
 * Encontra a primeira ocorrência de "SALDO ANTERIOR" na planilha
 * @param {string} caminhoArquivo - Caminho para o arquivo movimentacao.xlsx
 * @returns {string|null} Data do saldo anterior ou null se não encontrado
 */
async function encontrarDataSaldoAnterior(caminhoArquivo) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(caminhoArquivo);
    
    const worksheet = workbook.getWorksheet(1);
    
    // Pula o cabeçalho
    let linhaAtual = 2;
    
    while (linhaAtual <= worksheet.rowCount) {
        const row = worksheet.getRow(linhaAtual);
        
        if (!row.getCell(1).value) {
            linhaAtual++;
            continue;
        }
        
        const historico = row.getCell(2).value?.toString() || '';
        
        if (historico === 'SALDO ANTERIOR') {
            return row.getCell(1).value?.toString() || null;
        }
        
        linhaAtual++;
    }
    
    return null;
}

module.exports = {
    processarMovimentacao,
    mapearLinhaMovimentacao,
    encontrarDataSaldoAnterior
}; 