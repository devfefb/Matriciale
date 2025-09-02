import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';

const UploadSemanal = () => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState({});
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
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
          
          // 3. Montar objeto final inventoryData exatamente como script.cjs + campo unidade
          const inventoryData = {
            periodo_inicio: resultado.periodo.periodo_inicio,
            periodo_fim: resultado.periodo.periodo_fim,
            unidade: resultado.unidade || unidade, // Campo explícito da unidade
            itens: resultado.itens
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

   // Função para salvar resultados no backend (nova estrutura otimizada)
   const salvarResultados = useCallback(async (inventoryDataPorUnidade) => {
     try {
       // Primeiro testar conectividade
       const conectado = await testarConectividade();
       if (!conectado) {
         throw new Error('Backend não está acessível. Verifique se o servidor está rodando.');
       }

       console.log('📤 Enviando inventoryData para o backend (estrutura otimizada)...');
       
       // Preparar dados na nova estrutura otimizada
       const arquivos = Object.entries(inventoryDataPorUnidade).map(([unidade, inventoryData]) => ({
         nome_arquivo: `inventoryData${unidade}.json`,
         content: inventoryData
       }));

       const dadosParaEnvio = {
         tipo: 'semanal',
         municipio: 'Palmares', // Nome correto do município
         data_processamento: new Date().toISOString(),
         arquivos: arquivos
       };
       
       console.log('📋 Dados preparados (estrutura otimizada):', {
         tipo: dadosParaEnvio.tipo,
         municipio: dadosParaEnvio.municipio,
         total_arquivos: dadosParaEnvio.arquivos.length,
         arquivos_nomes: dadosParaEnvio.arquivos.map(a => a.nome_arquivo),
         tamanho_total_mb: (JSON.stringify(dadosParaEnvio).length / 1024 / 1024).toFixed(2)
       });
       
       // Fazer requisição para o backend enviando JSON otimizado
       console.log('🌐 Fazendo requisição para: /api/upload/semanal');
       
       const response = await fetch('/api/upload/semanal', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(dadosParaEnvio)
       });
       
       console.log('📡 Resposta recebida:', {
         status: response.status,
         statusText: response.statusText,
         headers: Object.fromEntries(response.headers.entries())
       });
       
       // Verificar se a resposta tem conteúdo
       const responseText = await response.text();
       console.log('📄 Conteúdo da resposta:', responseText);
       
       if (!responseText) {
         throw new Error('Resposta vazia do servidor');
       }
       
       let result;
       try {
         result = JSON.parse(responseText);
       } catch (parseError) {
         console.error('❌ Erro ao fazer parse do JSON:', parseError);
         throw new Error(`Resposta inválida do servidor: ${responseText.substring(0, 200)}...`);
       }
       
       if (response.ok && result.status === 'success') {
         console.log('✅ Dados salvos com sucesso no backend:', result.data);
         return result.data;
       } else {
         throw new Error(result.message || `Erro HTTP ${response.status}: ${response.statusText}`);
       }
       
     } catch (error) {
       console.error('❌ Erro ao salvar no backend:', error);
       throw new Error(`Falha ao comunicar com o backend: ${error.message}`);
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