/**
 * Formata número com separador de milhar usando ponto (.)
 * @param {number|string} value - Valor a ser formatado
 * @param {boolean} formatAsCode - Se true, formata como código (000.000.000), caso contrário formata como quantidade (4.354)
 * @returns {string} - Número formatado
 */
export const formatNumber = (value, formatAsCode = false) => {
  if (value === null || value === undefined || value === '') {
    return formatAsCode ? '000.000.000' : '0';
  }

  // Remove espaços e caracteres não numéricos (exceto ponto e vírgula para decimais)
  let cleanValue = String(value).trim();
  
  // Se for string, tenta extrair apenas números
  if (typeof value === 'string') {
    // Remove tudo exceto dígitos
    cleanValue = cleanValue.replace(/\D/g, '');
    if (cleanValue === '') {
      return formatAsCode ? '000.000.000' : '0';
    }
  }

  // Converte para número
  const numValue = typeof cleanValue === 'string' ? parseInt(cleanValue, 10) : cleanValue;
  
  if (isNaN(numValue)) {
    return formatAsCode ? '000.000.000' : '0';
  }

  // Para formato de código (000.000.000)
  if (formatAsCode) {
    const numStr = Math.floor(Math.abs(numValue)).toString();
    // Adiciona zeros à esquerda se necessário para ter pelo menos 9 dígitos
    const padded = numStr.padStart(9, '0');
    // Formata: 000.000.000
    return padded.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // Para formato de quantidade (4.354)
  return Math.floor(Math.abs(numValue)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

