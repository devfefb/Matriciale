import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const UploadSemanal = () => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState({});
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState(null);
  const [calcResult, setCalcResult] = useState(null);
  const fileInputRef = useRef(null);

  // Função melhorada para extrair nome da unidade do arquivo
  const extrairNomeUnidade = useCallback((nomeArquivo) => {
    console.log(`🔍 [EXTRAÇÃO] Processando arquivo: ${nomeArquivo}`);
    
    // Patterns específicos baseados no padrão mencionado:
    // "Movimentação CAF 01-06.xlsx", "Balancete Olavo 01-06.xlsx", etc.
    const patterns = [
      /movimentac[aã]o\s+([A-Za-z0-9]+)/i,     // "Movimentação CAF"
      /balancete\s+([A-Za-z0-9]+)/i,           // "Balancete Olavo"
      /moviment\s+([A-Za-z0-9]+)/i,            // "Moviment CAF"
      /([A-Za-z0-9]+)\s+\d{2}-\d{2}/i,         // "CAF 01-06" (qualquer coisa antes da data)
      /([A-Za-z0-9]+)[-_]\d{2}-\d{2}/i,        // "CAF-01-06"
      /([A-Za-z0-9]+)\s*\d{2}\/\d{2}/i,        // "CAF 01/06"
      /([A-Za-z0-9]+)$/i                       // Fallback para nome simples
    ];
    
    for (const pattern of patterns) {
      const match = nomeArquivo.match(pattern);
      if (match && match[1] && match[1].length >= 2) {
        const unidade = match[1].toUpperCase().trim();
        console.log(`✅ [EXTRAÇÃO] Unidade encontrada: ${unidade}`);
        return unidade;
      }
    }
    
    // Se não encontrou padrão, usar o nome base limpo
    const fallback = nomeArquivo.replace(/\.(xlsx|xls|csv)$/i, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'DESCONHECIDO';
    console.log(`⚠️ [EXTRAÇÃO] Usando fallback: ${fallback}`);
    return fallback;
  }, []);

  // Função para determinar tipo do arquivo
  const determinarTipoArquivo = useCallback((nomeArquivo) => {
    const nome = nomeArquivo.toLowerCase();
    if (nome.includes('movimentac') || nome.includes('moviment')) {
      return 'movimentacao';
    } else if (nome.includes('balancete') || nome.includes('balance')) {
      return 'balancete';
    }
    return null;
  }, []);

  // Handlers para drag & drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  }, []);

  // Função principal para lidar com arquivos
  const handleFiles = useCallback((fileList) => {
    setError(null);

    const validFiles = fileList.filter(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      return ['xlsx', 'xls', 'csv'].includes(extension);
    });

    if (validFiles.length === 0 && fileList.length > 0) {
      setError('Por favor, selecione arquivos Excel (.xlsx, .xls) ou CSV (.csv)');
      return;
    }

    // Processar cada arquivo
    const newFilesToAdd = {};
    const errors = [];

    validFiles.forEach(file => {
      const unidade = extrairNomeUnidade(file.name);
      const tipo = determinarTipoArquivo(file.name);

      if (!tipo) {
        errors.push(`Não foi possível identificar o tipo do arquivo: ${file.name}. Use 'movimentacao' ou 'balancete' no nome.`);
        return;
      }

      if (!unidade || unidade === 'DESCONHECIDO') {
        errors.push(`Não foi possível identificar a unidade no arquivo: ${file.name}`);
        return;
      }

      // Inicializar unidade se não existir
      if (!newFilesToAdd[unidade]) {
        newFilesToAdd[unidade] = {};
      }

      newFilesToAdd[unidade][tipo] = file;
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    // Atualizar estado com validação de unidades
    setFiles(prevFiles => {
      const updatedFiles = { ...prevFiles };
      
      // Adicionar novos arquivos
      Object.keys(newFilesToAdd).forEach(unidade => {
        if (!updatedFiles[unidade]) {
          updatedFiles[unidade] = {};
        }
        
        // Verificar se já existe arquivo do mesmo tipo para a unidade
        Object.keys(newFilesToAdd[unidade]).forEach(tipo => {
          updatedFiles[unidade][tipo] = newFilesToAdd[unidade][tipo];
        });
      });

      return updatedFiles;
    });
  }, [extrairNomeUnidade, determinarTipoArquivo]);

  // Nova função para aplicar classificação de movimentações
  const aplicarClassificacaoMovimentacoes = useCallback(async (resultado, nomeUnidade) => {
    console.log(`🔄 [CLASSIFICAÇÃO] Iniciando classificação para unidade: ${nomeUnidade}`);
    
    // Identificar tipo da unidade
    const unidadeInfo = identificarTipoUnidade(nomeUnidade);
    console.log(`🏥 [CLASSIFICAÇÃO] Tipo identificado: ${unidadeInfo.tipo} (CAF: ${unidadeInfo.esCAF})`);
    
    const itensClassificados = [];
    let totalMovimentacaoSemanal = 0;
    const estatisticasTipos = {};
    
    for (const item of resultado.itens) {
      console.log(`📦 [CLASSIFICAÇÃO] Processando item: ${item.descricao_item}`);
      
      // Classificar cada movimentação do item
      const movimentacoesClassificadas = item.movimentacoes.map(mov => classificarMovimentacao(mov));
      
      // Calcular movimentação semanal baseada no tipo da unidade
      const movimentacaoSemanal = calcularMovimentacaoSemanal(movimentacoesClassificadas, unidadeInfo);
      
      totalMovimentacaoSemanal += movimentacaoSemanal;
      
      // Contabilizar estatísticas
      movimentacoesClassificadas.forEach(mov => {
        estatisticasTipos[mov.tipo_mov] = (estatisticasTipos[mov.tipo_mov] || 0) + 1;
      });
      
      // Item enriquecido com classificações
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
    
    return {
      ...resultado,
      itens: itensClassificados,
      unidade_info: unidadeInfo,
      estatisticas
    };
  }, []);

  // Função para identificar o tipo da unidade
  const identificarTipoUnidade = useCallback((nomeUnidade) => {
    const nome = nomeUnidade.toUpperCase().trim();
    
    if (nome === 'CAF' || nome.includes('CENTRAL')) {
      return {
        nome: nomeUnidade,
        tipo: 'CAF',
        esCAF: true
      };
    }

    if (nome.includes('FARMACIA')) {
      return {
        nome: nomeUnidade,
        tipo: 'FARMACIA',
        esCAF: false
      };
    }

    if (nome.includes('UBS') || nome.includes('PSF') || nome.includes('ESF')) {
      return {
        nome: nomeUnidade,
        tipo: 'UBS',
        esCAF: false
      };
    }

    if (nome.includes('OLAVO') || nome.includes('CONSULTORIO')) {
      return {
        nome: nomeUnidade,
        tipo: 'CONSULTORIO',
        esCAF: false
      };
    }

    return {
      nome: nomeUnidade,
      tipo: 'OUTROS',
      esCAF: false
    };
  }, []);

  // Função para classificar uma movimentação individual
  const classificarMovimentacao = useCallback((movimentacao) => {
    const historico = (movimentacao.historico || '').toUpperCase().trim();
    const entradas = parseFloat(movimentacao.entradas) || 0;
    const saidas = parseFloat(movimentacao.saidas) || 0;
    
    // 1. Determinar TP (primeiro nível)
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

    // 2. Determinar TIPO (segundo nível)
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

    // 3. Calcular QTDMOV
    let qtdmov;
    if (tp === 'E') {
      qtdmov = entradas; // Positivo
    } else if (tp === 'S') {
      qtdmov = -saidas; // Negativo
    } else {
      qtdmov = 0;
    }

    return {
      ...movimentacao,
      tp,
      tipo_mov,
      qtdmov
    };
  }, []);

  // Função para classificar entradas
  const classificarEntrada = useCallback((historico, documento) => {
    if (historico.includes('DOAÇÃO') || historico.includes('DOACAO')) {
      return 'ED';
    }
    if (historico.includes('TRANSFERENCIA ENTRE MUNICIPIOS') || historico.includes('EMPRESTIMO')) {
      return 'EP';
    }
    if (historico.includes('CAF') || historico.includes('FARMACIA CENTRAL')) {
      return 'ET';
    }
    if (historico.includes('UBS') || historico.includes('PSF') || historico.includes('PRONTO ATENDIMENTO')) {
      return 'EU';
    }
    if (historico.includes('ACERTO') || historico.includes('AJUSTE') || historico.includes('QUEBRA')) {
      return 'EX';
    }
    return 'EA'; // Padrão: compra
  }, []);

  // Função para classificar saídas
  const classificarSaida = useCallback((historico) => {
    if (historico.includes('DOAÇÃO') || historico.includes('DOACAO')) {
      return 'SD';
    }
    if (historico.includes('CAF') || historico.includes('FARMACIA')) {
      return 'ST';
    }
    if (historico.includes('UBS') || historico.includes('PSF') || historico.includes('PRONTO ATENDIMENTO')) {
      return 'SU'; // CRÍTICO para cálculo!
    }
    if (historico.includes('VENCIDO') || historico.includes('VALIDADE')) {
      return 'SV';
    }
    if (historico.includes('ACERTO') || historico.includes('AJUSTE') || historico.includes('QUEBRA')) {
      return 'SX';
    }
    return 'SA'; // Padrão: dispensação para pacientes (MAIS IMPORTANTE!)
  }, []);

  // Função para calcular movimentação semanal por tipo de unidade
  const calcularMovimentacaoSemanal = useCallback((movimentacoes, unidadeInfo) => {
    if (unidadeInfo.esCAF) {
      return calcularMovimentacaoCAF(movimentacoes);
    } else {
      return calcularMovimentacaoFarmacia(movimentacoes);
    }
  }, []);

  // Lógica específica para CAF
  const calcularMovimentacaoCAF = useCallback((movimentacoes) => {
    console.log(`🏭 [CAF] Aplicando lógica específica da CAF`);
    
    let total = 0;
    for (const mov of movimentacoes) {
      // 1. Verificar se saida tem valor
      if (!mov.saidas || mov.saidas === 0) continue;
      
      // 2. Verificar se observacao não está vazia
      if (!mov.observacao || mov.observacao.trim() === '') continue;
      
      // 3. Verificar se historico NÃO contém "farmacia"
      if (mov.historico.toLowerCase().includes('farmacia')) continue;
      
      // Se passou todos os filtros, somar
      total += mov.saidas;
      console.log(`✅ [CAF] Considerando: ${mov.saidas} - ${mov.historico}`);
    }
    
    console.log(`🏭 [CAF] Total movimentação: ${total}`);
    return total;
  }, []);

  // Lógica para farmácias: apenas SA + SU
  const calcularMovimentacaoFarmacia = useCallback((movimentacoes) => {
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
  }, []);

  // Função para verificar se uma unidade tem ambos os arquivos
  const verificarArquivosCompletos = useCallback((arquivosUnidade) => {
    return arquivosUnidade && arquivosUnidade.balancete && arquivosUnidade.movimentacao;
  }, []);

  // Função para validar se pode processar
  const podeProcessar = useCallback(() => {
    const unidades = Object.keys(files);
    if (unidades.length === 0) return false;
    
    // Verificar se há pelo menos uma unidade com ambos os arquivos
    const unidadesCompletas = unidades.filter(unidade => verificarArquivosCompletos(files[unidade]));
    return unidadesCompletas.length > 0;
  }, [files, verificarArquivosCompletos]);

  // Função para processar arquivos
  const processarArquivos = useCallback(async () => {
    if (!podeProcessar()) {
      setError('É necessário ter pelo menos um balancete E uma movimentação da mesma unidade para processar');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    
    try {
      const resultados = {};
      const unidades = Object.keys(files);
      let processedCount = 0;
      
      const unidadesCompletas = unidades.filter(unidade => verificarArquivosCompletos(files[unidade]));
      
      if (unidadesCompletas.length === 0) {
        throw new Error('Nenhuma unidade possui ambos os arquivos (balancete + movimentação)');
      }

      setProgress(10);
      console.log(`📦 Processando ${unidadesCompletas.length} unidades completas seguindo script.cjs...`);
      
      // Processar cada unidade completa seguindo exatamente o script.cjs
      const inventoryDataPorUnidade = {};
      
      for (let i = 0; i < unidadesCompletas.length; i++) {
        const unidade = unidadesCompletas[i];
        const arquivosUnidade = files[unidade];
        
        setProgress(10 + (i / unidadesCompletas.length) * 70);
        console.log(`⚙️ Processando unidade: ${unidade}`);
        
        try {
          // 1. Processar planilha balancete (encontrar itens movimentados)
          console.log('📋 Processando planilha balancete...');
          const itens = await processarArquivoBalancete(arquivosUnidade.balancete, unidade);
          console.log(`✅ ${itens.length} itens movimentados encontrados no balancete`);
          
          // 2. Processar planilha movimentação (período + movimentações)
          console.log('📊 Processando planilha movimentacao...');
          const resultado = await processarArquivoMovimentacao(arquivosUnidade.movimentacao, unidade, itens);
          
          // 3. NOVA ETAPA: Aplicar classificação e cálculo de movimentação semanal
          console.log('🔄 Aplicando classificação de movimentações e lógica específica da unidade...');
          const resultadoClassificado = await aplicarClassificacaoMovimentacoes(resultado, unidade);
          
          // 4. Montar objeto final inventoryData com classificações aplicadas
          const inventoryData = {
            periodo_inicio: resultadoClassificado.periodo.periodo_inicio,
            periodo_fim: resultadoClassificado.periodo.periodo_fim,
            unidade: resultadoClassificado.unidade || unidade,
            unidade_info: resultadoClassificado.unidade_info, // Nova informação sobre tipo da unidade
            itens: resultadoClassificado.itens,
            estatisticas_classificacao: resultadoClassificado.estatisticas, // Estatísticas de classificação
            versao_processamento: '2.0.0' // Marca que usa nova lógica
          };
          
          console.log(`📅 Período de apuração: ${inventoryData.periodo_inicio} a ${inventoryData.periodo_fim}`);
          console.log(`📦 Total de itens processados: ${inventoryData.itens.length}`);
          
          inventoryDataPorUnidade[unidade] = inventoryData;
          
        } catch (error) {
          console.error(`❌ Erro ao processar unidade ${unidade}:`, error);
          throw new Error(`Erro na unidade ${unidade}: ${error.message}`);
        }
      }
      
      setProgress(80);
      console.log('📤 Enviando inventoryData para backend...');
      
      // Enviar dados processados para o backend
      const dadosBackend = await salvarResultados(inventoryDataPorUnidade);
      
      setProgress(90);
      
                // Estruturar dados de resposta
          const resultadosFinais = {
            status: 'sucesso',
            municipio: dadosBackend.municipio || 'Palmares',
            arquivos_gerados: dadosBackend.arquivos_gerados || [],
            unidades_processadas: dadosBackend.unidades_processadas || Object.keys(inventoryDataPorUnidade),
            total_unidades: dadosBackend.total_unidades || Object.keys(inventoryDataPorUnidade).length,
            data_processamento: dadosBackend.timestamp || new Date().toISOString(),
            caminho_diretorio: dadosBackend.caminho,
            // Usar dados do backend se disponíveis, caso contrário extrair do inventoryData
            arquivos_processados: dadosBackend.arquivos_processados || Object.keys(inventoryDataPorUnidade).length,
            environment: dadosBackend.environment || 'development',
            storage_type: dadosBackend.storage_type || 'local_filesystem',
            resultados: dadosBackend.resultados || Object.entries(inventoryDataPorUnidade).map(([unidade, data]) => ({
              unidade,
              arquivo_original: `inventoryData${unidade}.json`,
              arquivo_salvo: dadosBackend.caminho ? `${dadosBackend.caminho}/inventoryData${unidade}.json` : `inventoryData${unidade}.json`,
              periodo: `${data.periodo_inicio} a ${data.periodo_fim}`,
              total_itens: data.itens.length
            })),
            resumo_por_unidade: dadosBackend.resumo_por_unidade || Object.fromEntries(
              Object.entries(inventoryDataPorUnidade).map(([unidade, data]) => [
                unidade,
                {
                  periodo: `${data.periodo_inicio} a ${data.periodo_fim}`,
                  total_itens: data.itens.length
                }
              ])
            ),
            formato_script_cjs: true
          };
      
      setProgress(100);
      setProcessedData(resultadosFinais);
      
    } catch (err) {
      console.error('Erro ao processar arquivos:', err);
      setError(`Erro ao processar arquivos: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [files, podeProcessar, verificarArquivosCompletos]);

  // Função para processar arquivo de balancete - CONFORME balanceteUtils.cjs
  const processarArquivoBalancete = useCallback(async (arquivo, unidade) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // Configurar XLSX para interpretar datas corretamente
          const workbook = XLSX.read(e.target.result, { 
            type: 'binary',
            cellDates: true,  // Força conversão de números seriais para Date
            dateNF: 'dd/mm/yyyy' // Formato de data
          });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Processar conforme balanceteUtils.cjs (linha por linha, similar ao ExcelJS)
          const itensMovimentados = [];
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          
          console.log(`📊 [BALANCETE] Processando linhas de 1 até ${range.e.r + 1} (total: ${range.e.r + 1} linhas)`);
          
          let linhaAtual = 0; // Equivale ao script original que começa em 1
          
          while (linhaAtual <= range.e.r) {
            // Função para obter célula (índice baseado em 0)
            const getCell = (col) => {
              const cell = worksheet[XLSX.utils.encode_cell({ r: linhaAtual, c: col })];
              return cell ? cell.v : null;
            };
            
            // Verifica se a linha tem dados na primeira coluna
            const primeiraColuna = getCell(0);
            if (!primeiraColuna) {
              linhaAtual++;
              continue;
            }
            
            // Extrai os valores das colunas (equivale às colunas do script original)
            const qtdEntradas = parseFloat(getCell(6)) || 0; // 7ª coluna (row.getCell(7))
            const qtdSaidas = parseFloat(getCell(8)) || 0;   // 9ª coluna (row.getCell(9))
            
            // Verifica se o item teve movimentação
            if (qtdEntradas > 0 || qtdSaidas > 0) {
              const item = {
                cod_sistemico_item: getCell(0)?.toString() || '',              // row.getCell(1)
                descricao_item: getCell(1)?.toString() || '',                  // row.getCell(2)
                // 3ª coluna é ignorada (em branco)
                tipo_unid_item: getCell(3)?.toString() || '',                  // row.getCell(4)
                qtd_periodo_inicial: parseFloat(getCell(4)) || 0,              // row.getCell(5)
                valor_item_periodo_inicial: parseFloat(getCell(5)) || 0,       // row.getCell(6)
                qtd_entradas_periodo: qtdEntradas,                             // row.getCell(7)
                valor_entradas_periodo: parseFloat(getCell(7)) || 0,           // row.getCell(8)
                qtd_saidas_periodo: qtdSaidas,                                 // row.getCell(9)
                valor_saidas_periodo: parseFloat(getCell(9)) || 0,             // row.getCell(10)
                qtd_periodo_final: parseFloat(getCell(10)) || 0,               // row.getCell(11)
                valor_unitario_periodo_final: parseFloat(getCell(11)) || 0,    // row.getCell(12)
                valor_item_periodo_final: parseFloat(getCell(12)) || 0,        // row.getCell(13)
                movimentacoes: [] // Será preenchido pelo processamento de movimentação
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
  }, []);

  // Função para processar arquivo de movimentação - CONFORME script.cjs
  const processarArquivoMovimentacao = useCallback(async (arquivo, unidade, itens) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // Configurar XLSX para interpretar datas corretamente
          const workbook = XLSX.read(e.target.result, { 
            type: 'binary',
            cellDates: true,  // Força conversão de números seriais para Date
            dateNF: 'dd/mm/yyyy' // Formato de data
          });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          let periodo = null;
          let indiceItemAtual = 0;
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          
          // Função para extrair data da movimentação - ADAPTADA para XLSX (em vez de ExcelJS)
          const extrairDataMovimentacao = (cellValue) => {
            if (cellValue !== null && cellValue !== undefined) {
              // XLSX pode retornar datas como números seriais do Excel
              if (typeof cellValue === 'number' && cellValue > 1) {
                // Converter número serial do Excel para Date
                // Excel usa 1 de janeiro de 1900 como dia 1, mas há um bug histórico
                const excelBaseDate = new Date(1899, 11, 30); // 30 de dezembro de 1899
                const data = new Date(excelBaseDate.getTime() + cellValue * 24 * 60 * 60 * 1000);
                
                const dia = String(data.getDate()).padStart(2, '0');
                const mes = String(data.getMonth() + 1).padStart(2, '0');
                const ano = data.getFullYear();
                return `${dia}/${mes}/${ano}`;
              } else if (cellValue instanceof Date) {
                // Se já é uma instância de Date
                const dataCorrigida = new Date(cellValue);
                
                const dia = String(dataCorrigida.getDate()).padStart(2, '0');
                const mes = String(dataCorrigida.getMonth() + 1).padStart(2, '0');
                const ano = dataCorrigida.getFullYear();
                return `${dia}/${mes}/${ano}`;
              } else {
                // Se é string, tentar converter ou retornar como está
                return String(cellValue);
              }
            }
            return '';
          };
          
          // Função para calcular período - CONFORME movimentacaoUtils.cjs
          const calcularPeriodo = (dataSaldoAnterior) => {
            // Usando regex para extrair DD/MM/YYYY
            const match = dataSaldoAnterior.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (!match) {
              console.error('❌ Formato de data inválido:', dataSaldoAnterior);
              return { periodo_inicio: 'Data inválida', periodo_fim: 'Data inválida' };
            }
            
            const dia = parseInt(match[1]);
            const mes = parseInt(match[2]) - 1; // JavaScript usa mês 0-based
            const ano = parseInt(match[3]);
            
            // Usa a data exata do saldo anterior como base
            const periodoInicio = new Date(ano, mes, dia);
            // Adiciona um dia para compensar (conforme script original)
            periodoInicio.setDate(periodoInicio.getDate() + 1);
            
            // Período fim é 6 dias após o período início
            const periodoFim = new Date(periodoInicio);
            periodoFim.setDate(periodoFim.getDate() + 6);
            
            const formatarData = (data) => {
              const d = String(data.getDate()).padStart(2, '0');
              const m = String(data.getMonth() + 1).padStart(2, '0');
              const a = data.getFullYear();
              return `${d}/${m}/${a}`;
            };
            
            return {
              periodo_inicio: formatarData(periodoInicio),
              periodo_fim: formatarData(periodoFim)
            };
          };
          
          // Função para mapear linha de movimentação - CONFORME movimentacaoUtils.cjs
          const mapearLinhaMovimentacao = (rowNum) => {
            const getCell = (col) => {
              const cell = worksheet[XLSX.utils.encode_cell({ r: rowNum, c: col })];
              return cell ? cell.v : null;
            };
            
            // Extrair data usando a mesma função
            const dataCell = getCell(0);
            let dataMovimentacao = '';
            
            // Verifica se a célula tem valor (equivale ao script original)
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
          
          // CONFORME movimentacaoUtils.cjs: começar da linha 1 (pula cabeçalho assumindo primeira linha)
          console.log(`📈 [MOVIMENTAÇÃO] Processando ${itens.length} itens...`);
          let linhaAtual = 0; // Equivale ao script original
          
          while (linhaAtual <= range.e.r && indiceItemAtual < itens.length) {
            // Função para obter célula
            const getCell = (col) => {
              const cell = worksheet[XLSX.utils.encode_cell({ r: linhaAtual, c: col })];
              return cell ? cell.v : null;
            };
            
            // Verifica se a linha tem dados na primeira coluna
            const primeiraColuna = getCell(0);
            if (!primeiraColuna) {
              linhaAtual++;
              continue;
            }
            
            const historico = getCell(1)?.toString() || '';
            
            // Se encontrou "SALDO ANTERIOR", processa o período e avança para o próximo item
            if (historico === 'SALDO ANTERIOR') {
              console.log(`📋 [MOVIMENTAÇÃO] Processando item ${indiceItemAtual + 1}/${itens.length}: ${itens[indiceItemAtual].descricao_item}`);
              
              // Extrai período apenas na primeira ocorrência
              if (!periodo) {
                console.log(`🔍 [MOVIMENTAÇÃO] Valor bruto da primeira coluna:`, primeiraColuna, typeof primeiraColuna);
                const dataSaldoAnterior = extrairDataMovimentacao(primeiraColuna);
                console.log(`📅 [MOVIMENTAÇÃO] Data extraída:`, dataSaldoAnterior);
                periodo = calcularPeriodo(dataSaldoAnterior);
                console.log(`📅 [MOVIMENTAÇÃO] Período identificado: ${periodo.periodo_inicio} a ${periodo.periodo_fim}`);
              }
              
              // Processa a linha do saldo anterior
              const movimentacao = mapearLinhaMovimentacao(linhaAtual);
              itens[indiceItemAtual].movimentacoes.push(movimentacao);
              
              // Processa as próximas linhas até encontrar outro "SALDO ANTERIOR" ou fim da planilha
              linhaAtual++;
              while (linhaAtual <= range.e.r) {
                const proximaPrimeiraColuna = getCell(0);
                
                if (!proximaPrimeiraColuna) {
                  linhaAtual++;
                  continue;
                }
                
                const proximoHistorico = getCell(1)?.toString() || '';
                
                // Se encontrou outro "SALDO ANTERIOR", para de processar este item
                if (proximoHistorico === 'SALDO ANTERIOR') {
                  break; // Não incrementa linhaAtual aqui, para processar no próximo loop
                }
                
                // Adiciona a movimentação ao item atual
                const movimentacaoItem = mapearLinhaMovimentacao(linhaAtual);
                itens[indiceItemAtual].movimentacoes.push(movimentacaoItem);
                
                linhaAtual++;
              }
              
              console.log(`✅ [MOVIMENTAÇÃO] Item ${indiceItemAtual + 1} processado: ${itens[indiceItemAtual].movimentacoes.length} movimentações`);
              
              // Avança para o próximo item
              indiceItemAtual++;
            } else {
              linhaAtual++;
            }
          }
          
          console.log(`📈 [MOVIMENTAÇÃO] Processado período ${periodo?.periodo_inicio} a ${periodo?.periodo_fim} para ${unidade}`);
          console.log(`📊 [MOVIMENTAÇÃO] Total de itens processados: ${indiceItemAtual}/${itens.length}`);
          
          // Verificar se todos os itens foram processados
          if (indiceItemAtual < itens.length) {
            console.log(`⚠️ [MOVIMENTAÇÃO] ATENÇÃO: ${itens.length - indiceItemAtual} itens não foram processados!`);
            // Mostrar quais itens não foram processados
            for (let i = indiceItemAtual; i < itens.length; i++) {
              console.log(`❌ [MOVIMENTAÇÃO] Item não processado: ${itens[i].descricao_item}`);
            }
          }
          
          resolve({
            periodo,
            itens,
            unidade: unidade // Adicionar campo da unidade
          });
          
        } catch (error) {
          reject(new Error(`Erro ao processar movimentação: ${error.message}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo de movimentação'));
      reader.readAsBinaryString(arquivo);
    });
  }, []);



     // Função para testar conectividade com backend
   const testarConectividade = useCallback(async () => {
     try {
       console.log('🔍 Testando conectividade com backend...');
       
       // Primeiro teste: rota geral
       console.log('📡 Testando /api/test...');
       const testResponse = await fetch('/api/test');
       if (testResponse.ok) {
         const testResult = await testResponse.json();
         console.log('✅ Rota /api/test acessível:', testResult);
       } else {
         console.log('❌ Erro na rota /api/test:', testResponse.status, testResponse.statusText);
       }
       
       // Segundo teste: rota específica de upload
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
   }, []);

  // NOVO: Função para upload direto via Storage (sem JSON no corpo da requisição)
  const salvarResultados = useCallback(async (inventoryDataPorUnidade) => {
    try {
      // Primeiro testar conectividade
      const conectado = await testarConectividade();
      if (!conectado) {
        throw new Error('Backend não está acessível. Verifique se o servidor está rodando.');
      }

      console.log('🔗 NOVO FLUXO: Solicitando signed URLs para upload direto ao storage...');
      
      // Preparar lista de arquivos para solicitar signed URLs (dados processados JSON)
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
      
      // Solicitar signed URLs
      console.log('🌐 Fazendo requisição para: /api/upload/solicitar-signed-urls');
      
      const signedUrlsResponse = await fetch('/api/upload/solicitar-signed-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          municipio: 'Palmares',
          arquivos: arquivosParaUpload
        })
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
      
      // Fazer upload de cada arquivo usando as signed URLs
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
            // Upload local: usar URL local com JSON no corpo
            uploadResponse = await fetch(url.upload_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(inventoryData)
            });
          } else {
            // Upload cloud: usar signed URL diretamente
            uploadResponse = await fetch(url.upload_url, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(inventoryData)
            });
          }
          
          if (uploadResponse.ok) {
            console.log(`✅ Upload concluído: ${url.nome_arquivo}`);
            
            if (storageType === 'local_storage') {
              // Para local, pegar resposta do endpoint local
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
              // Para cloud, usar dados da signed URL
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

      // ===================== NOVO: Upload dos anexos originais =====================
      console.log('📎 [ANEXOS] Iniciando upload dos documentos originais...');
      try {
        const unidades = Object.keys(inventoryDataPorUnidade);
        const anexosRequests = [];
        
        // Mapear arquivos para requests
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

        if (anexosRequests.length === 0) {
          console.log('📎 [ANEXOS] Nenhum anexo para enviar');
        } else {
          console.log(`📎 [ANEXOS] Solicitando signed URLs para ${anexosRequests.length} anexos:`, anexosRequests.map(a => `${a.unidade}/${a.nome_arquivo}`));
          
          const signedAnexosResp = await fetch('/api/upload/solicitar-signed-urls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ municipio: 'Palmares', arquivos: anexosRequests })
          });
          
          if (!signedAnexosResp.ok) {
            const errorText = await signedAnexosResp.text();
            const errorMsg = `Erro ao solicitar URLs de anexos: ${signedAnexosResp.status} - ${errorText}`;
            console.error('❌ [ANEXOS]', errorMsg);
            throw new Error(errorMsg);
          }
          
          const signedAnexos = await signedAnexosResp.json();
          console.log('📎 [ANEXOS] Resposta signed URLs:', signedAnexos);
          
          if (signedAnexos.status !== 'success') {
            const errorMsg = signedAnexos.message || 'Erro ao gerar signed URLs para anexos';
            console.error('❌ [ANEXOS]', errorMsg);
            throw new Error(errorMsg);
          }

          const anexosUrls = signedAnexos.data.urls;
          console.log(`📎 [ANEXOS] Recebidas ${anexosUrls.length} URLs. Iniciando uploads...`);

          const anexosEnviados = [];
          const anexosFalhados = [];

          for (let i = 0; i < anexosUrls.length; i++) {
            const urlInfo = anexosUrls[i];
            const requestInfo = anexosRequests[i];
            const unidade = requestInfo.unidade;
            const fileName = requestInfo.nome_arquivo;
            const arquivosUnidade = files[unidade] || {};
            
            // Encontrar o File correspondente
            const fileToSend = [arquivosUnidade.balancete, arquivosUnidade.movimentacao]
              .find(f => f && f.name === fileName);
            
            if (!fileToSend) {
              console.warn(`⚠️ [ANEXOS] Arquivo não encontrado: ${fileName}`);
              anexosFalhados.push({ arquivo: fileName, erro: 'Arquivo não encontrado' });
              continue;
            }

            console.log(`📤 [ANEXOS] Enviando ${fileToSend.name} (${(fileToSend.size / 1024).toFixed(2)} KB) para ${urlInfo.upload_url}`);

            try {
              let uploadResp;
              
              if (storageType === 'local_storage') {
                console.log(`📁 [ANEXOS] Modo local - POST com raw body`);
                uploadResp = await fetch(urlInfo.upload_url, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/octet-stream', // Usar sempre octet-stream para anexos
                    'x-filename': fileToSend.name
                  },
                  body: fileToSend
                });
              } else {
                console.log(`☁️ [ANEXOS] Modo cloud - PUT com signed URL`);
                uploadResp = await fetch(urlInfo.upload_url, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/octet-stream'
                  },
                  body: fileToSend
                });
              }
              
              if (!uploadResp.ok) {
                const errorText = await uploadResp.text();
                const errorMsg = `Falha upload ${fileToSend.name}: ${uploadResp.status} - ${errorText}`;
                console.error(`❌ [ANEXOS]`, errorMsg);
                anexosFalhados.push({ arquivo: fileToSend.name, erro: errorMsg });
              } else {
                console.log(`✅ [ANEXOS] Anexo enviado com sucesso: ${fileToSend.name}`);
                
                // Tentar ler resposta se houver
                try {
                  const respData = await uploadResp.json();
                  console.log(`📄 [ANEXOS] Resposta do servidor:`, respData);
                  anexosEnviados.push({ 
                    arquivo: fileToSend.name, 
                    unidade, 
                    arquivo_path: respData.data?.arquivo_path 
                  });
                } catch {
                  // Resposta vazia ou não-JSON (normal para signed URLs)
                  anexosEnviados.push({ arquivo: fileToSend.name, unidade });
                }
              }
            } catch (uploadError) {
              const errorMsg = uploadError instanceof Error ? uploadError.message : 'Erro desconhecido';
              console.error(`❌ [ANEXOS] Erro no upload de ${fileToSend.name}:`, uploadError);
              anexosFalhados.push({ arquivo: fileToSend.name, erro: errorMsg });
            }
          }

          // Resumo final
          console.log(`📊 [ANEXOS] Resumo do upload de anexos:`);
          console.log(`   ✅ Enviados com sucesso: ${anexosEnviados.length}`);
          console.log(`   ❌ Falhados: ${anexosFalhados.length}`);
          
          if (anexosEnviados.length > 0) {
            console.log(`   📁 Anexos enviados:`, anexosEnviados);
          }
          
          if (anexosFalhados.length > 0) {
            console.error(`   ⚠️ Anexos falhados:`, anexosFalhados);
            // Exibir aviso ao usuário mas não bloquear o fluxo
            const errosMsg = anexosFalhados.map(f => `${f.arquivo}: ${f.erro}`).join('\n');
            console.warn(`⚠️ [ANEXOS] Alguns anexos não foram enviados:\n${errosMsg}`);
          }
        }
      } catch (anexosError) {
        const errorMsg = anexosError instanceof Error ? anexosError.message : 'Erro desconhecido';
        console.error('❌ [ANEXOS] Erro geral no upload de anexos:', anexosError);
        // Não bloqueia o processamento principal, mas registra o erro
        console.warn(`⚠️ [ANEXOS] Upload de anexos falhou, mas processamento principal continua. Erro: ${errorMsg}`);
      }
      
      // Retornar dados no formato esperado
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
  }, []);

  const limparArquivos = useCallback(() => {
    setFiles({});
    setProcessedData(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Remover arquivo específico
  const removerArquivo = useCallback((unidade, tipo) => {
    setFiles(prevFiles => {
      const newFiles = { ...prevFiles };
      if (newFiles[unidade]) {
        delete newFiles[unidade][tipo];
        // Se a unidade não tem mais arquivos, remove ela também
        if (Object.keys(newFiles[unidade]).length === 0) {
          delete newFiles[unidade];
        }
      }
      return newFiles;
    });
  }, []);

  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    },
    title: {
      color: '#333',
      textAlign: 'center',
      marginBottom: '10px'
    },
    description: {
      backgroundColor: '#f8f9fa',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #e9ecef'
    },
    dropZone: {
      border: '2px dashed #007bff',
      borderRadius: '8px',
      padding: '40px 20px',
      textAlign: 'center',
      backgroundColor: isDragActive ? '#e3f2fd' : '#f8f9ff',
      marginBottom: '20px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    dropZoneActive: {
      borderColor: '#0056b3',
      backgroundColor: '#e3f2fd'
    },
    browseBtn: {
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px',
      marginTop: '10px'
    },
    filesList: {
      backgroundColor: '#fff',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px'
    },
    unitFiles: {
      border: '1px solid #ddd',
      borderRadius: '5px',
      padding: '15px',
      marginBottom: '15px'
    },
    unitComplete: {
      backgroundColor: '#d4edda',
      borderColor: '#28a745'
    },
    unitIncomplete: {
      backgroundColor: '#fff3cd',
      borderColor: '#ffc107'
    },
    fileItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid #eee'
    },
    fileType: {
      fontWeight: 'bold',
      color: '#666'
    },
    removeBtn: {
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      padding: '4px 8px',
      borderRadius: '3px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    actionButtons: {
      display: 'flex',
      gap: '10px',
      marginTop: '15px'
    },
    processBtn: {
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px'
    },
    clearBtn: {
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px'
    },
    progressContainer: {
      margin: '20px 0',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px'
    },
    progressBar: {
      width: '100%',
      height: '20px',
      backgroundColor: '#e9ecef',
      borderRadius: '10px',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#007bff',
      transition: 'width 0.3s ease'
    },
    errorContainer: {
      backgroundColor: '#f8d7da',
      border: '1px solid #f5c6cb',
      color: '#721c24',
      padding: '15px',
      borderRadius: '5px',
      margin: '20px 0',
      whiteSpace: 'pre-line'
    },
    resultContainer: {
      backgroundColor: '#d1ecf1',
      border: '1px solid #bee5eb',
      padding: '15px',
      borderRadius: '5px',
      margin: '20px 0'
    },
    successMessage: {
      color: '#0c5460',
      fontWeight: 'bold'
    }
  };

  // Botão "Calcular" - verifica completude no bucket e executa validação com gabarito
  const handleCalcular = useCallback(async () => {
    const municipio = 'Palmares';
    setCalcError(null);
    setCalcResult(null);
    setCalcLoading(true);
    try {
      // 1) Verificar completude
      const resp = await api.get('/upload/check-completeness', { params: { municipio } });
      const data = resp?.data?.data;
      if (!data) {
        throw new Error('Resposta inválida do endpoint de completude');
      }
      if (!data.complete) {
        const faltando = (data.missing_units || []).join(', ');
        const msg = `Ainda faltam unidades com JSON no storage para ${municipio}. Faltando: ${faltando || 'desconhecidas'}.`;
        setCalcError(msg);
        return;
      }

      // 2) Executar validação com gabarito (não altera banco)
      const validar = await api.post('/upload/validar-calculos');
      setCalcResult(validar?.data?.data || null);
    } catch (e) {
      setCalcError(e?.response?.data?.message || e.message || 'Erro ao executar cálculo');
    } finally {
      setCalcLoading(false);
    }
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Upload Semanal - Movimentação e Balancete</h1>
      <div style={styles.description}>
        <p>
          Faça upload dos arquivos de <strong>movimentação</strong> e <strong>balancete</strong> para processamento semanal.
          <br />
          📋 <strong>Importante:</strong> Cada unidade precisa de AMBOS os arquivos (movimentação + balancete) para ser processada.
          <br />
          📁 Os arquivos devem conter o nome da unidade no filename (ex: movimentacaoCAF.xlsx, balanceteCAF.xlsx).
          <br />
          🔄 Você pode adicionar arquivos um por vez ou múltiplos de uma vez.
        </p>
      </div>
      
      <div 
        style={{
          ...styles.dropZone,
          ...(isDragActive ? styles.dropZoneActive : {})
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div>
          <p>Arraste e solte seus arquivos aqui (.xlsx, .xls, .csv)</p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Múltiplos arquivos aceitos - movimentação e balancete por unidade
          </p>
          <button 
            style={styles.browseBtn}
            onClick={handleBrowseClick}
            disabled={isProcessing}
          >
            Escolher Arquivos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
            multiple
          />
        </div>
      </div>

      {Object.keys(files).length > 0 && (
        <div style={styles.filesList}>
          <h3>Arquivos Selecionados:</h3>
          {Object.entries(files).map(([unidade, arquivos]) => {
            const temBalancete = !!arquivos.balancete;
            const temMovimentacao = !!arquivos.movimentacao;
            const estaCompleto = temBalancete && temMovimentacao;
            
            return (
              <div 
                key={unidade} 
                style={{
                  ...styles.unitFiles,
                  ...(estaCompleto ? styles.unitComplete : styles.unitIncomplete)
                }}
              >
                <h4>
                  Unidade: {unidade} 
                  {estaCompleto ? ' ✅' : ' ⚠️'}
                </h4>
                
                <div style={{ marginTop: '10px' }}>
                  {temBalancete && (
                    <div style={styles.fileItem}>
                      <span>
                        <span style={styles.fileType}>Balancete:</span> {arquivos.balancete.name}
                      </span>
                      <button 
                        style={styles.removeBtn}
                        onClick={() => removerArquivo(unidade, 'balancete')}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  
                  {temMovimentacao && (
                    <div style={styles.fileItem}>
                      <span>
                        <span style={styles.fileType}>Movimentação:</span> {arquivos.movimentacao.name}
                      </span>
                      <button 
                        style={styles.removeBtn}
                        onClick={() => removerArquivo(unidade, 'movimentacao')}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  
                  {!temBalancete && (
                    <div style={{ ...styles.fileItem, color: '#856404' }}>
                      <span style={styles.fileType}>Balancete:</span> Arquivo necessário
                    </div>
                  )}
                  
                  {!temMovimentacao && (
                    <div style={{ ...styles.fileItem, color: '#856404' }}>
                      <span style={styles.fileType}>Movimentação:</span> Arquivo necessário
                    </div>
                  )}
                </div>
                
                {!estaCompleto && (
                  <p style={{ color: '#856404', marginTop: '10px', fontSize: '14px' }}>
                    ⚠️ Para processar esta unidade, adicione os arquivos que faltam
                  </p>
                )}
              </div>
            );
          })}
          
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
            <p>
              <strong>Status:</strong> {
                Object.values(files).filter(arquivos => verificarArquivosCompletos(arquivos)).length
              } unidade(s) pronta(s) para processamento
            </p>
          </div>
          
          <div style={styles.actionButtons}>
            <button 
              style={{
                ...styles.processBtn,
                opacity: podeProcessar() ? 1 : 0.5,
                cursor: podeProcessar() ? 'pointer' : 'not-allowed'
              }}
              onClick={processarArquivos}
              disabled={isProcessing || !podeProcessar()}
            >
              {isProcessing ? 'Processando...' : 'Processar Arquivos'}
            </button>
            <button 
              style={styles.clearBtn}
              onClick={limparArquivos}
              disabled={isProcessing}
            >
              Limpar Todos
            </button>
          </div>
        </div>
      )}

      {/* Botão Calcular global (bucket) */}
      <div style={{ marginTop: '20px', padding: '16px', border: '1px solid #e9ecef', borderRadius: '8px', background: '#fff' }}>
        <h3 style={{ marginTop: 0 }}>Cálculo Global (Bucket)</h3>
        <p style={{ color: '#6c757d', marginTop: '6px' }}>
          Verifica se todas as unidades possuem JSON no bucket. Se completo, roda a validação com gabarito e não altera o banco.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            style={{ ...styles.processBtn, backgroundColor: '#17a2b8' }}
            onClick={handleCalcular}
            disabled={calcLoading}
          >
            {calcLoading ? 'Validando...' : 'Calcular (Bucket)'}
          </button>
          {calcError && (
            <span style={{ color: '#dc3545' }}>{calcError}</span>
          )}
        </div>

        {calcResult && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#e8f5e8', border: '1px solid #28a745', borderRadius: '8px' }}>
            <div style={{ fontWeight: 'bold', color: '#155724' }}>Validação executada</div>
            <div style={{ fontSize: '14px', color: '#155724' }}>
              Data: {new Date(calcResult?.data_validacao || Date.now()).toLocaleString('pt-BR')}
            </div>
            <div style={{ marginTop: '6px', fontSize: '14px' }}>
              <div><strong>Perfeitos (100%):</strong> {calcResult?.resumo?.perfeitos ?? calcResult?.estatisticas?.perfeitos ?? 0}</div>
              <div><strong>Taxa de acerto geral:</strong> {(calcResult?.resumo?.taxa_acerto_geral ?? calcResult?.estatisticas?.taxa_acerto_geral ?? 0).toFixed ? (calcResult?.resumo?.taxa_acerto_geral ?? calcResult?.estatisticas?.taxa_acerto_geral).toFixed(2) : (calcResult?.resumo?.taxa_acerto_geral ?? calcResult?.estatisticas?.taxa_acerto_geral)}</div>
              <div><strong>Ignorados semana 2025_22:</strong> {calcResult?.resumo?.ignorados_semana_2025_22 ?? calcResult?.estatisticas?.ignorados_semana_2025_22 ?? 0}</div>
            </div>
          </div>
        )}
      </div>

      {isProcessing && (
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div 
              style={{
                ...styles.progressFill,
                width: `${progress}%`
              }}
            />
          </div>
          <p style={{ textAlign: 'center', marginTop: '10px' }}>
            Processando... {Math.round(progress)}%
          </p>
        </div>
      )}

      {error && (
        <div style={styles.errorContainer}>
          <h3>Erro:</h3>
          <p>{error}</p>
        </div>
      )}

      {processedData && (
        <div style={styles.resultContainer}>
          <div>
            <h2>Processamento Concluído</h2>
            <p style={styles.successMessage}>
              ✅ Arquivos processados e salvos em test-input/ para validação automática
            </p>
          </div>
                     <div style={{ marginTop: '15px' }}>
             <h3>Resumo do Processamento:</h3>
             <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px', border: '1px solid #28a745' }}>
               <p><strong>🏛️ Município:</strong> {processedData.municipio}</p>
               <p><strong>📊 Arquivos Processados:</strong> {processedData.arquivos_processados}</p>
               <p><strong>🕒 Data/Hora:</strong> {new Date(processedData.data_processamento).toLocaleString('pt-BR')}</p>
               
               {/* Informações sobre o ambiente e storage */}
               <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                 <p><strong>🌍 Ambiente:</strong> <span style={{ color: '#007bff', fontWeight: 'bold' }}>{processedData.environment}</span></p>
                 <p><strong>💾 Storage:</strong> <span style={{ color: '#6f42c1', fontWeight: 'bold' }}>{processedData.storage_type}</span></p>
               </div>

               {processedData.arquivos_gerados && processedData.arquivos_gerados.length > 0 && (
                 <div style={{ marginTop: '10px' }}>
                   <p><strong>📁 Arquivos Gerados:</strong></p>
                   <ul style={{ fontSize: '14px', color: '#666' }}>
                     {processedData.arquivos_gerados.map((arquivo, index) => (
                       <li key={index}><code>{arquivo}</code></li>
                     ))}
                   </ul>
                 </div>
               )}
               
               {/* Mostrar resultados detalhados por unidade */}
               {processedData.resultados && processedData.resultados.length > 0 && (
                 <div style={{ marginTop: '15px' }}>
                   <h4>Detalhes por Arquivo:</h4>
                   <div style={{ display: 'grid', gap: '10px' }}>
                     {processedData.resultados.map((resultado, index) => (
                       <div key={index} style={{ 
                         padding: '10px', 
                         backgroundColor: '#f8f9fa', 
                         borderRadius: '5px',
                         border: '1px solid #dee2e6'
                       }}>
                         <h5 style={{ margin: '0 0 5px 0', color: '#495057' }}>{resultado.unidade}</h5>
                         <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                           📅 {resultado.periodo} • 📦 {resultado.total_itens} itens
                         </p>
                         <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#868e96' }}>
                           💾 {resultado.arquivo_salvo}
                         </p>
                         {resultado.url && processedData.environment === 'production' && (
                           <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
                             <a href={resultado.url} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                               🔗 Ver arquivo no Storage
                             </a>
                           </p>
                         )}
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>
             
             {processedData.resumo_por_unidade && Object.keys(processedData.resumo_por_unidade).length > 0 && (
               <div style={{ marginTop: '15px' }}>
                 <h4>Detalhes por Unidade:</h4>
                 <div style={{ display: 'grid', gap: '10px' }}>
                   {Object.entries(processedData.resumo_por_unidade).map(([unidade, dados]) => (
                     <div key={unidade} style={{ 
                       padding: '10px', 
                       backgroundColor: '#f8f9fa', 
                       borderRadius: '5px',
                       border: '1px solid #dee2e6'
                     }}>
                       <h5 style={{ margin: '0 0 5px 0', color: '#495057' }}>{unidade}</h5>
                       <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                         📅 {dados.periodo} • 📦 {dados.total_itens} itens
                       </p>
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

export default UploadSemanal;