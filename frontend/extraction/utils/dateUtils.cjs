const moment = require('moment');

/**
 * Calcula o período de apuração baseado na data do saldo anterior
 * @param {string} dataSaldoAnterior - Data do saldo anterior no formato DD/MM/YYYY
 * @returns {Object} Objeto com periodo_inicio e periodo_fim
 */
function calcularPeriodoApuracao(dataSaldoAnterior) {
    // Converte a data do saldo anterior para moment
    const dataSaldo = moment(dataSaldoAnterior, 'DD/MM/YYYY');
    
    // Período início é um dia após o saldo anterior
    const periodoInicio = dataSaldo.clone().add(1, 'day');
    
    // Período fim é seis dias após o período início
    const periodoFim = periodoInicio.clone().add(6, 'days');
    
    return {
        periodo_inicio: periodoInicio.format('DD/MM/YYYY'),
        periodo_fim: periodoFim.format('DD/MM/YYYY')
    };
}

/**
 * Converte string de data para objeto Date
 * @param {string} dataString - Data no formato DD/MM/YYYY
 * @returns {Date} Objeto Date
 */
function parseData(dataString) {
    return moment(dataString, 'DD/MM/YYYY').toDate();
}

/**
 * Formata data para string DD/MM/YYYY
 * @param {Date} data - Objeto Date
 * @returns {string} Data formatada
 */
function formatarData(data) {
    return moment(data).format('DD/MM/YYYY');
}

module.exports = {
    calcularPeriodoApuracao,
    parseData,
    formatarData
}; 