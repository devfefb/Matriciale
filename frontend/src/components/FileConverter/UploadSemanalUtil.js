// uploadSemanalUtils.js
import * as XLSX from 'xlsx';

// Função melhorada para extrair nome da unidade do arquivo
export const extrairNomeUnidade = (nomeArquivo) => {
  console.log(`🔍 [EXTRAÇÃO] Processando arquivo: ${nomeArquivo}`);

  // Padrões ordenados por especificidade (mais específicos primeiro)
  const patterns = [
    // Novos formatos: "Balancete CAF 20251123" ou "Movimentação CAF 20251123"
    /(?:balancete|movimenta[cç][aã]o|moviment)\s+([A-Za-z0-9]+)\s+\d{8}/i,

    // Formatos existentes: "movimentacao CAF" ou "balancete CAF"
    /movimentac[aã]o\s+([A-Za-z0-9]+)/i,
    /balancete\s+([A-Za-z0-9]+)/i,
    /moviment\s+([A-Za-z0-9]+)/i,

    // Formatos com datas: "CAF 01-06" ou "CAF_01-06"
    /([A-Za-z0-9]+)\s+\d{2}-\d{2}/i,
    /([A-Za-z0-9]+)[-_]\d{2}-\d{2}/i,

    // Formatos com datas: "CAF 01/06"
    /([A-Za-z0-9]+)\s*\d{2}\/\d{2}/i,

    // Formato com data YYYYMMDD no final: "CAF 20251123"
    /([A-Za-z0-9]+)\s+\d{8}/i,

    // Último recurso: pegar qualquer sequência alfanumérica
    /([A-Za-z0-9]+)$/i
  ];

  for (const pattern of patterns) {
    const match = nomeArquivo.match(pattern);
    if (match && match[1] && match[1].length >= 2) {
      const unidade = match[1].toUpperCase().trim();
      console.log(`✅ [EXTRAÇÃO] Unidade encontrada: ${unidade} (padrão: ${pattern})`);
      return unidade;
    }
  }

  const fallback = nomeArquivo.replace(/\.(xlsx|xls|csv)$/i, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'DESCONHECIDO';
  console.log(`⚠️ [EXTRAÇÃO] Usando fallback: ${fallback}`);
  return fallback;
};

// Função para determinar tipo do arquivo
export const determinarTipoArquivo = (nomeArquivo) => {
  const nome = nomeArquivo.toLowerCase();
  if (nome.includes('movimentac') || nome.includes('moviment')) {
    return 'movimentacao';
  } else if (nome.includes('balancete') || nome.includes('balance')) {
    return 'balancete';
  }
  return null;
};

// Função para extrair data do nome do arquivo (formato YYYYMMDD)
export const extrairDataDoNomeArquivo = (nomeArquivo) => {
  console.log(`📅 [EXTRAÇÃO DATA] Processando arquivo: ${nomeArquivo}`);

  // Padrão para data no formato YYYYMMDD (ex: 20251123)
  const patternData = /\d{8}/;
  const match = nomeArquivo.match(patternData);

  if (match) {
    const dataStr = match[0];
    const ano = dataStr.substring(0, 4);
    const mes = dataStr.substring(4, 6);
    const dia = dataStr.substring(6, 8);

    // Validar se é uma data válida
    const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    if (data.getFullYear() == ano &&
      data.getMonth() == parseInt(mes) - 1 &&
      data.getDate() == parseInt(dia)) {
      const dataFormatada = `${dia}/${mes}/${ano}`;
      console.log(`✅ [EXTRAÇÃO DATA] Data encontrada: ${dataFormatada} (formato YYYYMMDD: ${dataStr})`);
      return {
        dataFormatada,
        dataOriginal: dataStr,
        dataObjeto: data
      };
    } else {
      console.log(`⚠️ [EXTRAÇÃO DATA] Data inválida encontrada: ${dataStr}`);
    }
  }

  // Tentar outros formatos de data comuns
  const patternDDMMYYYY = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/;
  const matchDDMMYYYY = nomeArquivo.match(patternDDMMYYYY);
  if (matchDDMMYYYY) {
    const dia = matchDDMMYYYY[1];
    const mes = matchDDMMYYYY[2];
    const ano = matchDDMMYYYY[3];
    const dataFormatada = `${dia}/${mes}/${ano}`;
    console.log(`✅ [EXTRAÇÃO DATA] Data encontrada: ${dataFormatada} (formato DD/MM/YYYY)`);
    return {
      dataFormatada,
      dataOriginal: `${dia}${mes}${ano}`,
      dataObjeto: new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
    };
  }

  console.log(`⚠️ [EXTRAÇÃO DATA] Nenhuma data encontrada no nome do arquivo`);
  return null;
};

// Função para identificar o tipo da unidade
export const identificarTipoUnidade = (nomeUnidade) => {
  const nome = nomeUnidade.toUpperCase().trim();
  if (nome === 'CAF' || nome.includes('CENTRAL')) {
    return { nome: nomeUnidade, tipo: 'CAF', esCAF: true };
  }
  if (nome.includes('FARMACIA')) {
    return { nome: nomeUnidade, tipo: 'FARMACIA', esCAF: false };
  }
  if (nome.includes('UBS') || nome.includes('PSF') || nome.includes('ESF')) {
    return { nome: nomeUnidade, tipo: 'UBS', esCAF: false };
  }
  if (nome.includes('OLAVO') || nome.includes('CONSULTORIO')) {
    return { nome: nomeUnidade, tipo: 'CONSULTORIO', esCAF: false };
  }
  return { nome: nomeUnidade, tipo: 'OUTROS', esCAF: false };
};

// Função para classificar uma movimentação individual
export const classificarMovimentacao = (movimentacao) => {
  const historico = (movimentacao.historico || '').toUpperCase().trim();
  const entradas = parseFloat(movimentacao.entradas) || 0;
  const saidas = parseFloat(movimentacao.saidas) || 0;

  let tp;
  if (historico.includes('SALDO ANTERIOR')) {
    tp = 'A';
  } else if (entradas > 0) {
    tp = 'E';
  } else if (saidas > 0) {
    tp = 'S';
  } else {
    tp = 'A';
  }

  let tipo_mov;
  switch (tp) {
    case 'A':
      tipo_mov = 'AA';
      break;
    case 'E':
      tipo_mov = classificarEntrada(historico, movimentacao.documento);
      break;
    case 'S':
      tipo_mov = classificarSaida(historico);
      break;
    default:
      tipo_mov = 'AA';
  }

  let qtdmov;
  if (tp === 'E') {
    qtdmov = entradas;
  } else if (tp === 'S') {
    qtdmov = -saidas;
  } else {
    qtdmov = 0;
  }

  return { ...movimentacao, tp, tipo_mov, qtdmov };
};

// Função para classificar entradas
export const classificarEntrada = (historico, documento) => {
  if (historico.includes('DOAÇÃO') || historico.includes('DOACAO')) return 'ED';
  if (historico.includes('TRANSFERENCIA ENTRE MUNICIPIOS') || historico.includes('EMPRESTIMO')) return 'EP';
  if (historico.includes('CAF') || historico.includes('FARMACIA CENTRAL')) return 'ET';
  if (historico.includes('UBS') || historico.includes('PSF') || historico.includes('PRONTO ATENDIMENTO')) return 'EU';
  if (historico.includes('ACERTO') || historico.includes('AJUSTE') || historico.includes('QUEBRA')) return 'EX';
  return 'EA';
};

// Função para classificar saídas
export const classificarSaida = (historico) => {
  if (historico.includes('DOAÇÃO') || historico.includes('DOACAO')) return 'SD';
  if (historico.includes('CAF') || historico.includes('FARMACIA')) return 'ST';
  if (historico.includes('UBS') || historico.includes('PSF') || historico.includes('PRONTO ATENDIMENTO')) return 'SU';
  if (historico.includes('VENCIDO') || historico.includes('VALIDADE')) return 'SV';
  if (historico.includes('ACERTO') || historico.includes('AJUSTE') || historico.includes('QUEBRA')) return 'SX';
  return 'SA';
};

// Função para calcular movimentação semanal por tipo de unidade
export const calcularMovimentacaoSemanal = (movimentacoes, unidadeInfo) => {
  if (unidadeInfo.esCAF) {
    return calcularMovimentacaoCAF(movimentacoes);
  } else {
    return calcularMovimentacaoFarmacia(movimentacoes);
  }
};

// Lógica específica para CAF
export const calcularMovimentacaoCAF = (movimentacoes) => {
  console.log(`🏭 [CAF] Aplicando lógica específica da CAF`);
  let total = 0;
  for (const mov of movimentacoes) {
    if (!mov.saidas || mov.saidas === 0) continue;
    if (!mov.observacao || mov.observacao.trim() === '') continue;
    if (mov.historico.toLowerCase().includes('farmacia')) continue;
    total += mov.saidas;
    console.log(`✅ [CAF] Considerando: ${mov.saidas} - ${mov.historico}`);
  }
  console.log(`🏭 [CAF] Total movimentação: ${total}`);
  return total;
};

// Lógica para farmácias: apenas SA + SU
export const calcularMovimentacaoFarmacia = (movimentacoes) => {
  console.log(`🏥 [FARMACIA] Aplicando lógica SA + SU`);
  let total = 0;
  for (const mov of movimentacoes) {
    if (mov.tipo_mov === 'SA' || mov.tipo_mov === 'SU') {
      total += Math.abs(mov.qtdmov);
      console.log(`✅ [FARMACIA] ${mov.tipo_mov}: ${Math.abs(mov.qtdmov)} - ${mov.historico}`);
    }
  }
  console.log(`🏥 [FARMACIA] Total movimentação: ${total}`);
  return total;
};

// Função para verificar se uma unidade tem ambos os arquivos
export const verificarArquivosCompletos = (arquivosUnidade) => {
  return arquivosUnidade && arquivosUnidade.balancete && arquivosUnidade.movimentacao;
};

// Função para processar arquivo de balancete
export const processarArquivoBalancete = (arquivo, unidade) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, {
          type: 'binary',
          cellDates: true,
          dateNF: 'dd/mm/yyyy'
        });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const itensMovimentados = [];
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        console.log(`📊 [BALANCETE] Processando linhas de 1 até ${range.e.r + 1} (total: ${range.e.r + 1} linhas)`);
        let linhaAtual = 0;
        while (linhaAtual <= range.e.r) {
          const getCell = (col) => {
            const cell = worksheet[XLSX.utils.encode_cell({ r: linhaAtual, c: col })];
            return cell ? cell.v : null;
          };
          const primeiraColuna = getCell(0);
          if (!primeiraColuna) {
            linhaAtual++;
            continue;
          }
          const qtdEntradas = parseFloat(getCell(6)) || 0;
          const qtdSaidas = parseFloat(getCell(8)) || 0;
          if (qtdEntradas > 0 || qtdSaidas > 0) {
            const item = {
              cod_sistemico_item: getCell(0)?.toString() || '',
              descricao_item: getCell(1)?.toString() || '',
              tipo_unid_item: getCell(3)?.toString() || '',
              qtd_periodo_inicial: parseFloat(getCell(4)) || 0,
              valor_item_periodo_inicial: parseFloat(getCell(5)) || 0,
              qtd_entradas_periodo: qtdEntradas,
              valor_entradas_periodo: parseFloat(getCell(7)) || 0,
              qtd_saidas_periodo: qtdSaidas,
              valor_saidas_periodo: parseFloat(getCell(9)) || 0,
              qtd_periodo_final: parseFloat(getCell(10)) || 0,
              valor_unitario_periodo_final: parseFloat(getCell(11)) || 0,
              valor_item_periodo_final: parseFloat(getCell(12)) || 0,
              movimentacoes: []
            };
            console.log(`📋 [BALANCETE] Item ${itensMovimentados.length + 1}: ${item.descricao_item} (${item.cod_sistemico_item})`);
            itensMovimentados.push(item);
          } else {
            console.log(`⏭️ [BALANCETE] Item ignorado (sem movimentação): ${getCell(1)?.toString() || 'N/A'}`);
          }
          linhaAtual++;
        }
        console.log(`📊 [BALANCETE] ${itensMovimentados.length} itens movimentados encontrados para ${unidade}`);
        resolve(itensMovimentados);
      } catch (error) {
        reject(new Error(`Erro ao processar balancete: ${error.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo de balancete'));
    reader.readAsBinaryString(arquivo);
  });
};

// Função para processar arquivo de movimentação
export const processarArquivoMovimentacao = (arquivo, unidade, itens) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, {
          type: 'binary',
          cellDates: true,
          dateNF: 'dd/mm/yyyy'
        });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        let periodo = null;
        let indiceItemAtual = 0;
        const range = XLSX.utils.decode_range(worksheet['!ref']);

        const extrairDataMovimentacao = (cellValue) => {
          if (cellValue !== null && cellValue !== undefined) {
            if (typeof cellValue === 'number' && cellValue > 1) {
              const excelBaseDate = new Date(1899, 11, 30);
              const data = new Date(excelBaseDate.getTime() + cellValue * 24 * 60 * 60 * 1000);
              const dia = String(data.getDate()).padStart(2, '0');
              const mes = String(data.getMonth() + 1).padStart(2, '0');
              const ano = data.getFullYear();
              return `${dia}/${mes}/${ano}`;
            } else if (cellValue instanceof Date) {
              const dataCorrigida = new Date(cellValue);
              const dia = String(dataCorrigida.getDate()).padStart(2, '0');
              const mes = String(dataCorrigida.getMonth() + 1).padStart(2, '0');
              const ano = dataCorrigida.getFullYear();
              return `${dia}/${mes}/${ano}`;
            } else {
              return String(cellValue);
            }
          }
          return '';
        };

        const calcularPeriodo = (dataSaldoAnterior) => {
          const match = dataSaldoAnterior.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (!match) {
            console.error('❌ Formato de data inválido:', dataSaldoAnterior);
            return { periodo_inicio: 'Data inválida', periodo_fim: 'Data inválida' };
          }
          const dia = parseInt(match[1]);
          const mes = parseInt(match[2]) - 1;
          const ano = parseInt(match[3]);
          const periodoInicio = new Date(ano, mes, dia);
          periodoInicio.setDate(periodoInicio.getDate() + 1);
          const periodoFim = new Date(periodoInicio);
          periodoFim.setDate(periodoFim.getDate() + 6);
          const formatarData = (data) => {
            const d = String(data.getDate()).padStart(2, '0');
            const m = String(data.getMonth() + 1).padStart(2, '0');
            const a = data.getFullYear();
            return `${d}/${m}/${a}`;
          };
          return { periodo_inicio: formatarData(periodoInicio), periodo_fim: formatarData(periodoFim) };
        };

        const mapearLinhaMovimentacao = (rowNum) => {
          const getCell = (col) => {
            const cell = worksheet[XLSX.utils.encode_cell({ r: rowNum, c: col })];
            return cell ? cell.v : null;
          };
          const dataCell = getCell(0);
          let dataMovimentacao = '';
          if (dataCell !== null && dataCell !== undefined) {
            dataMovimentacao = extrairDataMovimentacao(dataCell);
          }
          return {
            data_movimentacao: dataMovimentacao,
            historico: getCell(1)?.toString() || '',
            documento: getCell(2) || null,
            requisicao: getCell(3)?.toString() || '',
            entradas: parseFloat(getCell(4)) || null,
            saidas: parseFloat(getCell(5)) || 0,
            estoque: parseFloat(getCell(6)) || 0,
            observacao: getCell(7)?.toString() || ''
          };
        };

        console.log(`📈 [MOVIMENTAÇÃO] Processando ${itens.length} itens...`);
        let linhaAtual = 0;
        while (linhaAtual <= range.e.r && indiceItemAtual < itens.length) {
          const getCell = (col) => {
            const cell = worksheet[XLSX.utils.encode_cell({ r: linhaAtual, c: col })];
            return cell ? cell.v : null;
          };
          const primeiraColuna = getCell(0);
          if (!primeiraColuna) {
            linhaAtual++;
            continue;
          }
          const historico = getCell(1)?.toString() || '';
          if (historico === 'SALDO ANTERIOR') {
            console.log(`📋 [MOVIMENTAÇÃO] Processando item ${indiceItemAtual + 1}/${itens.length}: ${itens[indiceItemAtual].descricao_item}`);
            if (!periodo) {
              console.log(`🔍 [MOVIMENTAÇÃO] Valor bruto da primeira coluna:`, primeiraColuna, typeof primeiraColuna);
              const dataSaldoAnterior = extrairDataMovimentacao(primeiraColuna);
              console.log(`📅 [MOVIMENTAÇÃO] Data extraída:`, dataSaldoAnterior);
              periodo = calcularPeriodo(dataSaldoAnterior);
              console.log(`📅 [MOVIMENTAÇÃO] Período identificado: ${periodo.periodo_inicio} a ${periodo.periodo_fim}`);
            }
            const movimentacao = mapearLinhaMovimentacao(linhaAtual);
            itens[indiceItemAtual].movimentacoes.push(movimentacao);
            linhaAtual++;
            while (linhaAtual <= range.e.r) {
              const proximaPrimeiraColuna = getCell(0);
              if (!proximaPrimeiraColuna) {
                linhaAtual++;
                continue;
              }
              const proximoHistorico = getCell(1)?.toString() || '';
              if (proximoHistorico === 'SALDO ANTERIOR') {
                break;
              }
              const movimentacaoItem = mapearLinhaMovimentacao(linhaAtual);
              itens[indiceItemAtual].movimentacoes.push(movimentacaoItem);
              linhaAtual++;
            }
            console.log(`✅ [MOVIMENTAÇÃO] Item ${indiceItemAtual + 1} processado: ${itens[indiceItemAtual].movimentacoes.length} movimentações`);
            indiceItemAtual++;
          } else {
            linhaAtual++;
          }
        }
        console.log(`📈 [MOVIMENTAÇÃO] Processado período ${periodo?.periodo_inicio} a ${periodo?.periodo_fim} para ${unidade}`);
        console.log(`📊 [MOVIMENTAÇÃO] Total de itens processados: ${indiceItemAtual}/${itens.length}`);
        if (indiceItemAtual < itens.length) {
          console.log(`⚠️ [MOVIMENTAÇÃO] ATENÇÃO: ${itens.length - indiceItemAtual} itens não foram processados!`);
          for (let i = indiceItemAtual; i < itens.length; i++) {
            console.log(`❌ [MOVIMENTAÇÃO] Item não processado: ${itens[i].descricao_item}`);
          }
        }
        resolve({ periodo, itens, unidade });
      } catch (error) {
        reject(new Error(`Erro ao processar movimentação: ${error.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo de movimentação'));
    reader.readAsBinaryString(arquivo);
  });
};

// Função para aplicar classificação de movimentações
export const aplicarClassificacaoMovimentacoes = async (resultado, nomeUnidade) => {
  console.log(`🔄 [CLASSIFICAÇÃO] Iniciando classificação para unidade: ${nomeUnidade}`);
  const unidadeInfo = identificarTipoUnidade(nomeUnidade);
  console.log(`🏥 [CLASSIFICAÇÃO] Tipo identificado: ${unidadeInfo.tipo} (CAF: ${unidadeInfo.esCAF})`);
  const itensClassificados = [];
  let totalMovimentacaoSemanal = 0;
  const estatisticasTipos = {};
  for (const item of resultado.itens) {
    console.log(`📦 [CLASSIFICAÇÃO] Processando item: ${item.descricao_item}`);
    const movimentacoesClassificadas = item.movimentacoes.map(mov => classificarMovimentacao(mov));
    const movimentacaoSemanal = calcularMovimentacaoSemanal(movimentacoesClassificadas, unidadeInfo);
    totalMovimentacaoSemanal += movimentacaoSemanal;
    movimentacoesClassificadas.forEach(mov => {
      estatisticasTipos[mov.tipo_mov] = (estatisticasTipos[mov.tipo_mov] || 0) + 1;
    });
    const itemClassificado = {
      ...item,
      movimentacoes: movimentacoesClassificadas,
      movimentacao_semanal_calculada: movimentacaoSemanal,
      total_movimentacoes: movimentacoesClassificadas.length
    };
    itensClassificados.push(itemClassificado);
    console.log(`✅ [CLASSIFICAÇÃO] ${item.descricao_item} → Mov. semanal: ${movimentacaoSemanal}`);
  }
  const estatisticas = {
    total_itens: itensClassificados.length,
    total_movimentacoes: itensClassificados.reduce((acc, item) => acc + item.movimentacoes.length, 0),
    tipos_movimentacao: estatisticasTipos,
    movimentacao_total_semanal: totalMovimentacaoSemanal,
    unidade_tipo: unidadeInfo.tipo
  };
  console.log(`📊 [CLASSIFICAÇÃO] Estatísticas finais:`, estatisticas);
  return { ...resultado, itens: itensClassificados, unidade_info: unidadeInfo, estatisticas };
};

// Função para testar conectividade com backend
export const testarConectividade = async () => {
  try {
    console.log('🔍 Testando conectividade com backend...');
    console.log('📡 Testando /api/test...');
    const testResponse = await fetch('/api/test');
    if (testResponse.ok) {
      const testResult = await testResponse.json();
      console.log('✅ Rota /api/test acessível:', testResult);
    } else {
      console.log('❌ Erro na rota /api/test:', testResponse.status, testResponse.statusText);
    }
    console.log('📡 Testando /api/upload/health...');
    const healthResponse = await fetch('/api/upload/health');
    if (healthResponse.ok) {
      const healthResult = await healthResponse.json();
      console.log('✅ Rota /api/upload/health acessível:', healthResult);
      return true;
    } else {
      console.log('❌ Erro na rota /api/upload/health:', healthResponse.status, healthResponse.statusText);
      const errorText = await healthResponse.text();
      console.log('📄 Resposta de erro:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro de rede ao testar backend:', error);
    return false;
  }
};

// Função para upload direto via Storage
export const salvarResultados = async (inventoryDataPorUnidade, files) => {
  try {
    const conectado = await testarConectividade();
    if (!conectado) {
      throw new Error('Backend não está acessível. Verifique se o servidor está rodando.');
    }
    console.log('🔗 NOVO FLUXO: Solicitando signed URLs para upload direto ao storage...');
    const arquivosParaUpload = Object.entries(inventoryDataPorUnidade).map(([unidade, inventoryData]) => ({
      nome_arquivo: `inventoryData${unidade}.json`,
      municipio: 'Palmares',
      unidade: unidade,
      tipo_arquivo: 'inventoryData',
      tamanho_estimado: JSON.stringify(inventoryData).length
    }));
    console.log('📋 Solicitando signed URLs para:', {
      total_arquivos: arquivosParaUpload.length,
      arquivos: arquivosParaUpload.map(a => `${a.unidade}/${a.nome_arquivo}`),
      tamanho_total_mb: (arquivosParaUpload.reduce((acc, a) => acc + a.tamanho_estimado, 0) / 1024 / 1024).toFixed(2)
    });

    console.log('🌐 Fazendo requisição para: /api/upload/solicitar-signed-urls');
    const signedUrlsResponse = await fetch('/api/upload/solicitar-signed-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ municipio: 'Palmares', arquivos: arquivosParaUpload })
    });
    if (!signedUrlsResponse.ok) {
      const errorText = await signedUrlsResponse.text();
      throw new Error(`Erro ao solicitar signed URLs: ${signedUrlsResponse.status} - ${errorText}`);
    }
    const signedUrlsResult = await signedUrlsResponse.json();
    console.log('✅ Signed URLs recebidas:', signedUrlsResult);
    if (signedUrlsResult.status !== 'success') {
      throw new Error(signedUrlsResult.message || 'Erro ao gerar signed URLs');
    }
    const urls = signedUrlsResult.data.urls;
    const environment = signedUrlsResult.data.environment;
    const storageType = signedUrlsResult.data.storage_type;
    console.log(`🔗 Enviando ${urls.length} arquivo(s) para ${storageType} (${environment})`);
    const resultadosUpload = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const unidade = Object.keys(inventoryDataPorUnidade)[i];
      const inventoryData = inventoryDataPorUnidade[unidade];
      console.log(`📤 Enviando ${url.nome_arquivo} para ${url.upload_url}`);
      console.log(`🔍 Storage Type: ${storageType}`);
      console.log(`🔍 URL tipo: ${typeof url.upload_url}, URL: ${url.upload_url}`);
      try {
        let uploadResponse;
        if (storageType === 'local_storage') {
          uploadResponse = await fetch(url.upload_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inventoryData)
          });
        } else {
          uploadResponse = await fetch(url.upload_url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inventoryData)
          });
        }
        if (uploadResponse.ok) {
          console.log(`✅ Upload concluído: ${url.nome_arquivo}`);
          if (storageType === 'local_storage') {
            const localResult = await uploadResponse.json();
            resultadosUpload.push({
              unidade: unidade,
              arquivo_original: url.nome_arquivo,
              arquivo_storage: localResult.data?.arquivo_path || url.arquivo_path,
              periodo: `${inventoryData.periodo_inicio} a ${inventoryData.periodo_fim}`,
              total_itens: inventoryData.itens.length,
              status: 'SALVO_STORAGE',
              upload_id: localResult.data?.upload_id || url.upload_id
            });
          } else {
            resultadosUpload.push({
              unidade: unidade,
              arquivo_original: url.nome_arquivo,
              arquivo_storage: url.arquivo_path,
              periodo: `${inventoryData.periodo_inicio} a ${inventoryData.periodo_fim}`,
              total_itens: inventoryData.itens.length,
              status: 'SALVO_STORAGE',
              upload_id: url.upload_id
            });
          }
        } else {
          const errorText = await uploadResponse.text();
          throw new Error(`Erro no upload de ${url.nome_arquivo}: ${uploadResponse.status} - ${errorText}`);
        }
      } catch (uploadError) {
        console.error(`❌ Erro no upload de ${url.nome_arquivo}:`, uploadError);
        console.error(`❌ Detalhes do erro:`, {
          name: uploadError.name,
          message: uploadError.message,
          stack: uploadError.stack,
          cause: uploadError.cause
        });
        throw new Error(`Falha no upload de ${url.nome_arquivo}: ${uploadError.message}`);
      }
    }
    console.log('🎉 Uploads de dados processados concluídos via storage!');
    console.log('📎 [ANEXOS] Iniciando upload dos documentos originais...');
    try {
      const unidades = Object.keys(inventoryDataPorUnidade);
      const anexosRequests = [];
      for (const unidade of unidades) {
        const arquivosUnidade = files[unidade];
        if (!arquivosUnidade) continue;
        if (arquivosUnidade.balancete) {
          anexosRequests.push({
            nome_arquivo: arquivosUnidade.balancete.name,
            municipio: 'Palmares',
            unidade,
            tipo_arquivo: 'attachments',
            tamanho_estimado: arquivosUnidade.balancete.size
          });
        }
        if (arquivosUnidade.movimentacao) {
          anexosRequests.push({
            nome_arquivo: arquivosUnidade.movimentacao.name,
            municipio: 'Palmares',
            unidade,
            tipo_arquivo: 'attachments',
            tamanho_estimado: arquivosUnidade.movimentacao.size
          });
        }
      }

      // ====================================================================
      // SERÁ REAPROVEITADO PARA FAZER UPLOAD DOS RELATÓRIOS DE MOVIMENTAÇÃO
      // ====================================================================
      // Este bloco é responsável por realizar o upload dos arquivos de anexos (balancete, movimentação, etc) das unidades para o backend, usando signed URLs:
      // 1. Se não há anexos para enviar, apenas loga e não faz nada.
      // 2. Caso haja anexos:
      //    a) Solicita (para o backend) as signed URLs para upload, enviando os metadados dos arquivos (nome, tipo, unidade, etc).
      //    b) Valida se a resposta veio ok e se o status é "success".
      //    c) Recebe as signed URLs de upload específicas para cada anexo.
      //    d) Para cada anexo:
      //       - Localiza o arquivo correspondente no objeto `files`.
      //       - Se não encontra, registra o erro.
      //       - Se encontra, faz o upload:
      //         • Se for ambiente local, faz um POST para a rota local com o arquivo no body.
      //         • Se for cloud, faz um PUT para a signed URL retornada.
      //       - Caso upload falhe, salva o erro; caso tenha sucesso, registra o arquivo enviado.
      //    e) Ao final, loga um resumo dos uploads feitos (sucessos e falhas), mas não interrompe o processamento principal em caso de erro.
      // if (anexosRequests.length === 0) {
      //   console.log('📎 [ANEXOS] Nenhum anexo para enviar');
      // } else {
      //   console.log(`📎 [ANEXOS] Solicitando signed URLs para ${anexosRequests.length} anexos:`, anexosRequests.map(a => `${a.unidade}/${a.nome_arquivo}`));
      //   const signedAnexosResp = await fetch('/api/upload/solicitar-signed-urls', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ municipio: 'Palmares', arquivos: anexosRequests })
      //   });
      //   if (!signedAnexosResp.ok) {
      //     const errorText = await signedAnexosResp.text();
      //     const errorMsg = `Erro ao solicitar URLs de anexos: ${signedAnexosResp.status} - ${errorText}`;
      //     console.error('❌ [ANEXOS]', errorMsg);
      //     throw new Error(errorMsg);
      //   }
      //   const signedAnexos = await signedAnexosResp.json();
      //   console.log('📎 [ANEXOS] Resposta signed URLs:', signedAnexos);
      //   if (signedAnexos.status !== 'success') {
      //     const errorMsg = signedAnexos.message || 'Erro ao gerar signed URLs para anexos';
      //     console.error('❌ [ANEXOS]', errorMsg);
      //     throw new Error(errorMsg);
      //   }
      //   const anexosUrls = signedAnexos.data.urls;
      //   console.log(`📎 [ANEXOS] Recebidas ${anexosUrls.length} URLs. Iniciando uploads...`);
      //   const anexosEnviados = [];
      //   const anexosFalhados = [];
      //   for (let i = 0; i < anexosUrls.length; i++) {
      //     const urlInfo = anexosUrls[i];
      //     const requestInfo = anexosRequests[i];
      //     const unidade = requestInfo.unidade;
      //     const fileName = requestInfo.nome_arquivo;
      //     const arquivosUnidade = files[unidade] || {};
      //     const fileToSend = [arquivosUnidade.balancete, arquivosUnidade.movimentacao]
      //       .find(f => f && f.name === fileName);
      //     if (!fileToSend) {
      //       console.warn(`⚠️ [ANEXOS] Arquivo não encontrado: ${fileName}`);
      //       anexosFalhados.push({ arquivo: fileName, erro: 'Arquivo não encontrado' });
      //       continue;
      //     }
      //     console.log(`📤 [ANEXOS] Enviando ${fileToSend.name} (${(fileToSend.size / 1024).toFixed(2)} KB) para ${urlInfo.upload_url}`);
      //     try {
      //       let uploadResp;
      //       if (storageType === 'local_storage') {
      //         console.log(`📁 [ANEXOS] Modo local - POST com raw body`);
      //         uploadResp = await fetch(urlInfo.upload_url, {
      //           method: 'POST',
      //           headers: {
      //             'Content-Type': 'application/octet-stream',
      //             'x-filename': fileToSend.name
      //           },
      //           body: fileToSend
      //         });
      //       } else {
      //         console.log(`☁️ [ANEXOS] Modo cloud - PUT com signed URL`);
      //         uploadResp = await fetch(urlInfo.upload_url, {
      //           method: 'PUT',
      //           headers: { 'Content-Type': 'application/octet-stream' },
      //           body: fileToSend
      //         });
      //       }
      //       if (!uploadResp.ok) {
      //         const errorText = await uploadResp.text();
      //         const errorMsg = `Falha upload ${fileToSend.name}: ${uploadResp.status} - ${errorText}`;
      //         console.error(`❌ [ANEXOS]`, errorMsg);
      //         anexosFalhados.push({ arquivo: fileToSend.name, erro: errorMsg });
      //       } else {
      //         console.log(`✅ [ANEXOS] Anexo enviado com sucesso: ${fileToSend.name}`);
      //         try {
      //           const respData = await uploadResp.json();
      //           console.log(`📄 [ANEXOS] Resposta do servidor:`, respData);
      //           anexosEnviados.push({
      //             arquivo: fileToSend.name,
      //             unidade,
      //             arquivo_path: respData.data?.arquivo_path
      //           });
      //         } catch {
      //           anexosEnviados.push({ arquivo: fileToSend.name, unidade });
      //         }
      //       }
      //     } catch (uploadError) {
      //       const errorMsg = uploadError instanceof Error ? uploadError.message : 'Erro desconhecido';
      //       console.error(`❌ [ANEXOS] Erro no upload de ${fileToSend.name}:`, uploadError);
      //       anexosFalhados.push({ arquivo: fileToSend.name, erro: errorMsg });
      //     }
      //   }
      //   console.log(`📊 [ANEXOS] Resumo do upload de anexos:`);
      //   console.log(`   ✅ Enviados com sucesso: ${anexosEnviados.length}`);
      //   console.log(`   ❌ Falhados: ${anexosFalhados.length}`);
      //   if (anexosEnviados.length > 0) {
      //     console.log(`   📁 Anexos enviados:`, anexosEnviados);
      //   }
      //   if (anexosFalhados.length > 0) {
      //     console.error(`   ⚠️ Anexos falhados:`, anexosFalhados);
      //     const errosMsg = anexosFalhados.map(f => `${f.arquivo}: ${f.erro}`).join('\n');
      //     console.warn(`⚠️ [ANEXOS] Alguns anexos não foram enviados:\n${errosMsg}`);
      //   }
      // }
    } catch (anexosError) {
      const errorMsg = anexosError instanceof Error ? anexosError.message : 'Erro desconhecido';
      console.error('❌ [ANEXOS] Erro geral no upload de anexos:', anexosError);
      console.warn(`⚠️ [ANEXOS] Upload de anexos falhou, mas processamento principal continua. Erro: ${errorMsg}`);
    }
    return {
      municipio: 'Palmares',
      arquivos_processados: resultadosUpload.length,
      arquivos_salvos_storage: resultadosUpload.length,
      environment: environment,
      storage_type: storageType,
      resultados: resultadosUpload,
      processamento_status: 'EM_BACKGROUND',
      timestamp: new Date().toISOString(),
      metodo_upload: 'SIGNED_URLS_STORAGE_DIRETO'
    };
  } catch (error) {
    console.error('❌ Erro no novo fluxo de storage:', error);
    throw new Error(`Falha no upload via storage: ${error.message}`);
  }
};