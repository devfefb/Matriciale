const fs = require('fs');
const pdfParse = require('pdf-parse');
const moment = require('moment');

class MovimentacaoProcessor {
  constructor(logger) {
    this.logger = logger;
    this.unidadeIdMap = new Map();
    this.currentUnidadeId = 1;
  }

  async processFiles(filePaths) {
    const allMovimentacoes = [];
    let totalMovimentacoes = 0;
    let periodoInicio = null;
    let periodoFim = null;

    for (const filePath of filePaths) {
      this.logger.info(`Processando movimentação: ${filePath}`);
      
      try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        
        const extractedData = this.extractMovimentacaoFromPDF(data.text);
        const unidade = this.extractUnidadeFromFilename(filePath);
        
        // Converter para formato padronizado
        const movimentacoes = this.convertToStandardFormat(extractedData, unidade);
        
        allMovimentacoes.push(...movimentacoes);
        totalMovimentacoes += movimentacoes.length;
        
        // Atualizar período
        movimentacoes.forEach(mov => {
          const data = moment(mov.data_movimentacao);
          if (!periodoInicio || data.isBefore(periodoInicio)) {
            periodoInicio = data;
          }
          if (!periodoFim || data.isAfter(periodoFim)) {
            periodoFim = data;
          }
        });
        
        this.logger.info(`${movimentacoes.length} movimentações processadas de ${unidade}`);
        
      } catch (error) {
        this.logger.error(`Erro ao processar ${filePath}: ${error.message}`);
      }
    }

    return {
      timestamp: new Date().toISOString(),
      total_movimentacoes: totalMovimentacoes,
      periodo_inicio: periodoInicio ? periodoInicio.format('YYYY-MM-DD') : null,
      periodo_fim: periodoFim ? periodoFim.format('YYYY-MM-DD') : null,
      movimentacoes: allMovimentacoes
    };
  }

  extractMovimentacaoFromPDF(pdfText) {
    const lines = pdfText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let prefeitura = '';
    let relatorio = '';
    const paginas = [];
    
    let currentPage = null;
    let currentProduto = null;
    let currentMovimentacao = [];
    let pageNumber = 0;

    // Função auxiliar para limpar e formatar números
    const parseNumber = (str) => {
      if (!str) return null;
      
      const strValue = str.toString().trim();
      const cleaned = strValue.replace(/[^\d.,]/g, '');
      if (cleaned === '') return null;
      
      if (cleaned.match(/^\d{1,3}(\.\d{3})+$/)) {
        return parseInt(cleaned.replace(/\./g, ''));
      }
      
      if (cleaned.match(/^\d+,\d{1,2}$/)) {
        return parseFloat(cleaned.replace(',', '.'));
      }
      
      if (cleaned.includes('.') && cleaned.includes(',')) {
        return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
      }
      
      if (cleaned.includes(',')) {
        const parts = cleaned.split(',');
        if (parts.length === 2 && parts[1].length <= 2) {
          return parseFloat(cleaned.replace(',', '.'));
        } else {
          return parseInt(cleaned.replace(/,/g, ''));
        }
      }
      
      if (cleaned.includes('.')) {
        if (cleaned.match(/\.\d{1,2}$/)) {
          return parseFloat(cleaned);
        }
        return parseInt(cleaned.replace(/\./g, ''));
      }
      
      return parseInt(cleaned);
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Extrair informações do cabeçalho
      if (line.toUpperCase().includes('PREFEITURA MUNICIPAL')) {
        const match = line.match(/PREFEITURA MUNICIPAL DE (.+)/i);
        if (match) {
          prefeitura = match[1].trim();
        } else {
          const nextLines = lines.slice(i + 1, i + 3);
          for (const nextLine of nextLines) {
            if (nextLine && !nextLine.includes('Relatório') && nextLine.length > 3) {
              prefeitura = nextLine.trim();
              break;
            }
          }
        }
      }
      
      if (line.includes('Relatório de Movimentação de Estoque')) {
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j];
          if (nextLine && (nextLine.includes('até') || nextLine.includes('de ') && nextLine.includes('/'))) {
            relatorio = nextLine.trim();
            break;
          }
        }
      }
      
      // Detectar início de nova página
      if (line.match(/Página\s*(\d+)/i)) {
        if (currentPage && currentProduto) {
          currentPage.Movimentacao = currentMovimentacao;
          paginas.push(currentPage);
        }
        
        const pageMatch = line.match(/Página\s*(\d+)/i);
        if (pageMatch) {
          pageNumber = parseInt(pageMatch[1]);
          currentPage = { Página: pageNumber };
          currentMovimentacao = [];
          currentProduto = null;
        }
      }
      
      // Detectar produtos
      const codigoNaLinha = line.match(/(\d{3}\.\d{3}\.\d{3})/);
      
      if (codigoNaLinha) {
        let nomeProduto = '';
        let codigoProduto = codigoNaLinha[1];
        let unidade = '';
        
        nomeProduto = line.replace(/\d{3}\.\d{3}\.\d{3}/, '').trim();
        
        if (nomeProduto.length < 5 || !nomeProduto.includes(' ')) {
          for (let j = Math.max(0, i - 2); j < Math.min(i + 3, lines.length); j++) {
            if (j !== i) {
              const adjacentLine = lines[j];
              if (adjacentLine && adjacentLine.includes(' - ') && adjacentLine.length > 10) {
                const cleanName = adjacentLine.replace(/\d{3}\.\d{3}\.\d{3}/, '').trim();
                if (cleanName.length > nomeProduto.length) {
                  nomeProduto = cleanName;
                }
              }
            }
          }
        }
        
        const unidadeMatch = line.match(/\b(CP|AMP|ML|TB|ENV|FR|COMP|CAPS|BISNAGA|TUBO|FRASCO)\b/i);
        if (unidadeMatch) {
          unidade = unidadeMatch[1].toUpperCase();
        } else {
          for (let j = i; j < Math.min(i + 3, lines.length); j++) {
            const unidadeProxima = lines[j].match(/\b(CP|AMP|ML|TB|ENV|FR|COMP|CAPS|BISNAGA|TUBO|FRASCO)\b/i);
            if (unidadeProxima) {
              unidade = unidadeProxima[1].toUpperCase();
              break;
            }
          }
        }
        
        nomeProduto = nomeProduto.replace(/^\s*-\s*/, '').replace(/\s*-\s*$/, '').trim();
        
        currentProduto = {
          Nome: nomeProduto,
          CodigoProduto: codigoProduto,
          Unidade: unidade
        };
        
        if (currentPage) {
          currentPage.Produto = currentProduto;
        }
      }
      
      // Detectar linhas de movimentação
      const dataMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/);
      if (dataMatch && currentPage) {
        const data = dataMatch[1];
        const restoDaLinha = line.substring(data.length).trim();
        
        let historico = '';
        let documento = null;
        let requisicao = null;
        let entrada = null;
        let saida = null;
        let estoque = null;
        let observacao = null;
        
        const partes = restoDaLinha.split(/\s+/);
        
        let historicoPartes = [];
        let j = 0;
        while (j < partes.length) {
          const parte = partes[j];
          if (parte.match(/^\d{7}\/\d{4}$/) || parte.match(/^\d{3,}$/)) {
            break;
          }
          historicoPartes.push(parte);
          j++;
        }
        historico = historicoPartes.join(' ');
        
        const docMatch = line.match(/(\d{7}\/\d{4})/);
        if (docMatch) {
          documento = docMatch[1];
        }
        
        const numerosNaLinha = line.match(/\b\d{1,6}(?:\.\d{3})*\b/g) || [];
        const numerosLimpos = numerosNaLinha
          .filter(num => !num.includes('/'))
          .filter(num => !documento || !documento.includes(num))
          .map(num => parseNumber(num))
          .filter(num => num !== null && !isNaN(num));
        
        if (historico.toUpperCase().includes('SALDO ANTERIOR')) {
          saida = 0;
          if (numerosLimpos.length > 0) {
            estoque = numerosLimpos[numerosLimpos.length - 1];
          }
        } else {
          if (numerosLimpos.length >= 2) {
            saida = numerosLimpos[numerosLimpos.length - 2];
            estoque = numerosLimpos[numerosLimpos.length - 1];
          } else if (numerosLimpos.length === 1) {
            estoque = numerosLimpos[0];
          }
        }
        
        for (let k = i + 1; k < Math.min(i + 3, lines.length); k++) {
          const nextLine = lines[k];
          if (nextLine && nextLine.includes('Transferência') && nextLine.includes('nº')) {
            const obsMatch = nextLine.match(/(Transferência nº \d+)/);
            if (obsMatch) {
              observacao = obsMatch[1];
              break;
            }
          }
        }
        
        const movimentacao = {
          Data: data,
          Histórico: historico || 'N/A',
          Documento: documento,
          Requisição: requisicao,
          Movimento: {
            Entrada: entrada,
            Saída: saida
          },
          Estoque: estoque,
          Observação: observacao
        };
        
        currentMovimentacao.push(movimentacao);
      }
    }
    
    if (currentPage && currentProduto) {
      currentPage.Movimentacao = currentMovimentacao;
      paginas.push(currentPage);
    }
    
    return {
      "PREFEITURA MUNICIPAL": prefeitura,
      "Relatório de Movimentação de Estoque": relatorio,
      "Paginas": paginas
    };
  }

  convertToStandardFormat(extractedData, unidade) {
    const movimentacoes = [];
    const unidadeId = this.getUnidadeId(unidade);

    if (!extractedData.Paginas) return movimentacoes;

    extractedData.Paginas.forEach(pagina => {
      if (!pagina.Produto || !pagina.Movimentacao) return;

      const produto = pagina.Produto;
      const classificacao = this.classifyItem(produto.Nome);

      pagina.Movimentacao.forEach(mov => {
        const dataMovimentacao = this.convertDate(mov.Data);
        const semana = this.getWeekString(dataMovimentacao);
        
        const tp = this.determineTp(mov);
        const tipo = this.determineTipo(mov, tp);
        const qtdmov = this.calculateQtdMov(mov, tp);

        // criacao do objeto movimentacao
        movimentacoes.push({
          id_unidade: unidadeId,
          unidade: unidade,
          codigo_item: produto.CodigoProduto,
          nome_item: produto.Nome,
          classificacao: classificacao,
          data_movimentacao: dataMovimentacao,
          semana: semana,
          tp: tp,
          tipo: tipo,
          qtdmov: qtdmov,
          estaju: mov.Estoque,
          historico: mov.Histórico,
          documento: mov.Documento,
          requisicao: mov.Requisição,
          observacao: mov.Observação
        });
      });
    });

    return movimentacoes;
  }

  getUnidadeId(unidade) {
    if (!this.unidadeIdMap.has(unidade)) {
      this.unidadeIdMap.set(unidade, this.currentUnidadeId++);
    }
    return this.unidadeIdMap.get(unidade);
  }

  extractUnidadeFromFilename(filePath) {
    const filename = filePath.split(/[/\\]/).pop();
    
    if (filename.includes('CAF')) return 'CAF';
    if (filename.includes('Olavo')) return 'Farmácia Olavo';
    if (filename.includes('ESF3')) return 'Farmácia ESF3';
    
    const match = filename.match(/Movimentação\s+(\w+)/i);
    return match ? `Farmácia ${match[1]}` : 'Unidade Desconhecida';
  }

  classifyItem(nome) {
    if (!nome) return 'Não Classificado';
    
    const desc = nome.toUpperCase();
    
    // Usar mesma lógica do BalanceteProcessor
    if (this.isRemume(desc)) return '1 REMUME';
    if (this.isAssistencial(desc)) return '2 ASSISTENCIAL';
    if (this.isJudicial(desc)) return '3 PROCESSO JUDICIAL';
    if (this.isFarmacologico(desc)) return '4 FARMACOLÓGICO';
    if (this.isMaterial(desc)) return '5 MATERIAL';
    if (this.isFraldaLeite(desc)) return '6 FRALDAS e/ou LEITES';
    
    return 'Não Classificado';
  }

  isRemume(desc) {
    const medicamentos = ['PARACETAMOL', 'DIPIRONA', 'AAS', 'IBUPROFENO', 'AMOXICILINA'];
    return medicamentos.some(med => desc.includes(med));
  }

  isAssistencial(desc) {
    return desc.includes('INSULINA') || desc.includes('ANTIPSICÓTICO');
  }

  isJudicial(desc) {
    return desc.includes('JUDICIAL') || desc.includes('MANDADO');
  }

  isFarmacologico(desc) {
    return desc.includes('INJETÁVEL') || desc.includes('AMPOLA');
  }

  isMaterial(desc) {
    const materiais = ['LUVA', 'AGULHA', 'SERINGA', 'GAZE'];
    return materiais.some(mat => desc.includes(mat));
  }

  isFraldaLeite(desc) {
    return desc.includes('FRALDA') || desc.includes('LEITE');
  }

  convertDate(dateStr) {
    if (!dateStr) return null;
    const date = moment(dateStr, 'DD/MM/YYYY');
    return date.isValid() ? date.format('YYYY-MM-DD') : null;
  }

  getWeekString(dateStr) {
    if (!dateStr) return null;
    const date = moment(dateStr);
    const year = date.year();
    const week = date.week();
    return `${year}_${week.toString().padStart(2, '0')} ${year}`;
  }

  determineTp(mov) {
    if (mov.Histórico && mov.Histórico.toUpperCase().includes('SALDO ANTERIOR')) {
      return 'A';
    }
    if (mov.Movimento.Entrada && mov.Movimento.Entrada > 0) {
      return 'E';
    }
    if (mov.Movimento.Saída && mov.Movimento.Saída > 0) {
      return 'S';
    }
    return 'S'; // Default para saídas
  }

  determineTipo(mov, tp) {
    const hist = (mov.Histórico || '').toUpperCase();
    
    if (tp === 'A') return 'AA';
    
    if (tp === 'E') {
      if (hist.includes('DOAÇÃO')) return 'ED';
      if (hist.includes('PREFEITURA MUNICIPAL') || hist.includes('TRANSFERENCIA ENTRE MUNICIPIOS')) return 'EP';
      if (hist.includes('FARMACIA')) return 'ET';
      if (hist.includes('UBS') || hist.includes('PRONTO ATENDIMENTO')) return 'EU';
      if (hist.includes('ACERTO') || hist.includes('QUEBRA')) return 'EX';
      if (mov.Documento && mov.Documento.includes('NF')) return 'EA';
      return 'EA'; // Default para entradas
    }
    
    if (tp === 'S') {
      if (hist.includes('VENCIDO') || hist.includes('PERDA POR VALIDADE')) return 'SV';
      if (hist.includes('DOAÇÃO')) return 'SD';
      if (hist.includes('FARMACIA')) return 'ST';
      if (hist.includes('UBS') || hist.includes('PRONTO ATENDIMENTO')) return 'SU';
      if (hist.includes('ACERTO') || hist.includes('QUEBRA')) return 'SX';
      return 'SA'; // Default para dispensação pacientes
    }
    
    return 'SA';
  }

  calculateQtdMov(mov, tp) {
    if (tp === 'A') return 0;
    if (tp === 'E' && mov.Movimento.Entrada) return Math.abs(mov.Movimento.Entrada);
    if (tp === 'S' && mov.Movimento.Saída) return -Math.abs(mov.Movimento.Saída);
    return 0;
  }
}

module.exports = MovimentacaoProcessor; 