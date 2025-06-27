const XLSX = require('xlsx');
const moment = require('moment');

class BalanceteProcessorLimited {
  constructor(logger, maxRows = 50) {
    this.logger = logger;
    this.maxRows = maxRows;
    this.logger.info(`[BALANCETE] Processador limitado inicializado - Máximo ${maxRows} linhas por planilha`);
    
    this.xlsxColumnMapping = [
      {
        "coluna": "A",
        "nome_coluna": "Código sistêmico do item",
        "nome_normalizado": "cod_sistemico_item",
        "tipo": "texto",
        "formato": "9 números e 2 pontos divisor de milhar (ex: 325.023.001)"
      },
      {
        "coluna": "B",
        "nome_coluna": "Descrição (nome) do item",
        "nome_normalizado": "descricao_item",
        "tipo": "texto"
      },
      {
        "coluna": "C",
        "nome_coluna": "Coluna em branco",
        "nome_normalizado": "coluna_branco",
        "tipo": "vazio"
      },
      {
        "coluna": "D",
        "nome_coluna": "Unidade do item",
        "nome_normalizado": "unidade_item",
        "tipo": "texto"
      },
      {
        "coluna": "E",
        "nome_coluna": "Quantidade período inicial",
        "nome_normalizado": "qtd_periodo_inicial",
        "tipo": "número"
      },
      {
        "coluna": "F",
        "nome_coluna": "Valor do item período inicial",
        "nome_normalizado": "valor_item_periodo_inicial",
        "tipo": "número"
      },
      {
        "coluna": "G",
        "nome_coluna": "Quantidade de entradas no período",
        "nome_normalizado": "qtd_entradas_periodo",
        "tipo": "número"
      },
      {
        "coluna": "H",
        "nome_coluna": "Valor de entradas no período",
        "nome_normalizado": "valor_entradas_periodo",
        "tipo": "número"
      },
      {
        "coluna": "I",
        "nome_coluna": "Quantidade de saídas no período",
        "nome_normalizado": "qtd_saidas_periodo",
        "tipo": "número"
      },
      {
        "coluna": "J",
        "nome_coluna": "Valor de saídas no período",
        "nome_normalizado": "valor_saidas_periodo",
        "tipo": "número"
      },
      {
        "coluna": "K",
        "nome_coluna": "Quantidade período final (estoque atual)",
        "nome_normalizado": "qtd_periodo_final",
        "tipo": "número"
      },
      {
        "coluna": "L",
        "nome_coluna": "Valor unitário do item período final",
        "nome_normalizado": "val_unit_periodo_final",
        "tipo": "número"
      },
      {
        "coluna": "M",
        "nome_coluna": "Valor do item período final",
        "nome_normalizado": "valor_item_periodo_final",
        "tipo": "número"
      }
    ];

    this.classificacoes = {
      'REMUME': '1 REMUME',
      'ASSISTENCIAL': '2 ASSISTENCIAL', 
      'JUDICIAL': '3 PROCESSO JUDICIAL',
      'FARMACOLÓGICO': '4 FARMACOLÓGICO',
      'MATERIAL': '5 MATERIAL',
      'FRALDAS': '6 FRALDAS e/ou LEITES',
      'LEITES': '6 FRALDAS e/ou LEITES'
    };
  }

  async processFiles(filePaths) {
    const allItems = [];
    let totalRegistros = 0;

    for (const filePath of filePaths) {
      this.logger.info(`[BALANCETE] Processando arquivo: ${filePath}`);
      
      try {
        const items = this.processXLSXFile(filePath);
        const unidade = this.extractUnidadeFromFilename(filePath);
        
        // Enriquecer dados com unidade e classificação
        const enrichedItems = items.map(item => ({
          ...item,
          unidade: unidade,
          classificacao: this.classifyItem(item.descricao_item),
          processado_em: new Date().toISOString(),
          limitado: true, // Indicador de que foi processado com limitação
          linhas_processadas: this.maxRows
        }));

        allItems.push(...enrichedItems);
        totalRegistros += enrichedItems.length;
        
        this.logger.info(`[BALANCETE] ${enrichedItems.length} itens processados de ${unidade} (limitado a ${this.maxRows} linhas)`);
        
      } catch (error) {
        this.logger.error(`[BALANCETE] Erro ao processar ${filePath}: ${error.message}`);
      }
    }

    return {
      timestamp: new Date().toISOString(),
      total_registros: totalRegistros,
      limitacao_aplicada: `${this.maxRows} linhas por planilha`,
      itens: allItems
    };
  }

  processXLSXFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Extrair dados como array de arrays
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      defval: '',
      raw: false 
    });

    this.logger.info(`[BALANCETE] Dados extraídos da planilha: ${rawData.length} linhas totais`);

    // Encontrar linha de início dos dados
    let startRow = 0;
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (row[0] && row[1] && row[0].toString().trim() !== '' && row[1].toString().trim() !== '') {
        startRow = i;
        break;
      }
    }

    this.logger.info(`[BALANCETE] Início dos dados detectado na linha ${startRow + 1}`);

    // APLICAR LIMITAÇÃO: Calcular linha final baseada na limitação
    const endRow = Math.min(startRow + this.maxRows, rawData.length);
    const totalLinhasProcessadas = endRow - startRow;
    
    this.logger.info(`[BALANCETE] Processando linhas ${startRow + 1} até ${endRow} (${totalLinhasProcessadas} linhas de ${rawData.length} totais)`);

    // Processar cada linha com limitação
    const processedData = [];
    for (let i = startRow; i < endRow; i++) {
      const row = rawData[i];
      
      if (!row[0] || !row[1] || row[0].toString().trim() === '' || row[1].toString().trim() === '') {
        continue;
      }

      const mappedRow = {};
      
      this.xlsxColumnMapping.forEach((colDef, index) => {
        const cellValue = row[index] || '';
        const normalizedName = colDef.nome_normalizado;
        
        let processedValue = cellValue;
        
        if (colDef.tipo === 'número' && cellValue !== '') {
          const numStr = cellValue.toString().replace(/[^\d.,-]/g, '');
          if (numStr !== '') {
            if (numStr.includes('.') && numStr.includes(',')) {
              processedValue = parseFloat(numStr.replace(/\./g, '').replace(',', '.'));
            } else if (numStr.includes(',')) {
              processedValue = parseFloat(numStr.replace(',', '.'));
            } else {
              processedValue = parseFloat(numStr);
            }
            
            if (isNaN(processedValue)) {
              processedValue = cellValue.toString();
            }
          } else {
            processedValue = null;
          }
        } else if (colDef.tipo === 'texto') {
          processedValue = cellValue.toString().trim();
        } else if (colDef.tipo === 'vazio') {
          processedValue = null;
        }
        
        mappedRow[normalizedName] = processedValue;
      });

      // Validação básica
      if (this.validateItem(mappedRow)) {
        processedData.push(mappedRow);
      }
    }

    this.logger.info(`[BALANCETE] ${processedData.length} itens válidos extraídos da planilha`);
    
    return processedData;
  }

  extractUnidadeFromFilename(filePath) {
    const filename = filePath.split(/[/\\]/).pop();
    
    if (filename.includes('CAF')) return 'CAF';
    if (filename.includes('Olavo')) return 'Farmácia Olavo';
    if (filename.includes('ESF3')) return 'Farmácia ESF3';
    
    // Extrair de outros padrões
    const match = filename.match(/Balancete\s+(\w+)/i);
    return match ? `Farmácia ${match[1]}` : 'Unidade Desconhecida';
  }

  classifyItem(descricao) {
    if (!descricao) return 'Não Classificado';
    
    const desc = descricao.toUpperCase();
    
    // Classificação hierárquica conforme orientações
    if (this.isRemume(desc)) return '1 REMUME';
    if (this.isAssistencial(desc)) return '2 ASSISTENCIAL';
    if (this.isJudicial(desc)) return '3 PROCESSO JUDICIAL';
    if (this.isFarmacologico(desc)) return '4 FARMACOLÓGICO';
    if (this.isMaterial(desc)) return '5 MATERIAL';
    if (this.isFraldaLeite(desc)) return '6 FRALDAS e/ou LEITES';
    
    return 'Não Classificado';
  }

  isRemume(desc) {
    const remumeMedicamentos = [
      'PARACETAMOL', 'DIPIRONA', 'AAS', 'IBUPROFENO', 'AMOXICILINA',
      'CAPTOPRIL', 'ENALAPRIL', 'METFORMINA', 'GLIBENCLAMIDA',
      'HIDROCLOROTIAZIDA', 'SINVASTATINA', 'OMEPRAZOL'
    ];
    return remumeMedicamentos.some(med => desc.includes(med));
  }

  isAssistencial(desc) {
    const assistencial = [
      'INSULINA', 'ANTIPSICÓTICO', 'ANTIEPILÉPTICO', 'ANTIDEPRESSIVO'
    ];
    return assistencial.some(med => desc.includes(med));
  }

  isJudicial(desc) {
    return desc.includes('JUDICIAL') || desc.includes('MANDADO');
  }

  isFarmacologico(desc) {
    return desc.includes('INJETÁVEL') || desc.includes('AMPOLA') || 
           desc.includes('SORO') || desc.includes('VACINA');
  }

  isMaterial(desc) {
    const materiais = [
      'LUVA', 'AGULHA', 'SERINGA', 'GAZE', 'ALGODÃO', 'ATADURA',
      'CATETER', 'SONDA', 'EQUIPO', 'LANCETA'
    ];
    return materiais.some(mat => desc.includes(mat));
  }

  isFraldaLeite(desc) {
    return desc.includes('FRALDA') || desc.includes('LEITE');
  }

  validateItem(item) {
    // Validações obrigatórias
    if (!item.cod_sistemico_item || !item.descricao_item) {
      this.logger.warn(`[BALANCETE] Item inválido: código ou descrição ausente`);
      return false;
    }

    // Validar formato do código
    if (!item.cod_sistemico_item.match(/^\d{3}\.\d{3}\.\d{3}$/)) {
      this.logger.warn(`[BALANCETE] Código inválido: ${item.cod_sistemico_item}`);
      return false;
    }

    return true;
  }
}

module.exports = BalanceteProcessorLimited; 