const fs = require('fs');
const pdfParse = require('pdf-parse');
const moment = require('moment');

class MovimentacaoProcessorLimited {
  constructor(logger, maxPages = 10) {
    this.logger = logger;
    this.maxPages = maxPages;
    this.logger.info(`[MOVIMENTACAO] Processador limitado inicializado - Máximo ${maxPages} páginas por PDF`);
  }

  async processFiles(filePaths) {
    const allMovimentacoes = [];
    let totalMovimentacoes = 0;
    let periodoInicio = null;
    let periodoFim = null;

    for (const filePath of filePaths) {
      this.logger.info(`[MOVIMENTACAO] Processando arquivo: ${filePath}`);
      
      try {
        const dataBuffer = fs.readFileSync(filePath);
        
        // Aplicar limitação de páginas durante o parsing
        const data = await pdfParse(dataBuffer, {
          max: this.maxPages, // Limitar número de páginas
        });
        
        this.logger.info(`[MOVIMENTACAO] PDF limitado a ${this.maxPages} páginas - Texto extraído: ${data.text.length} caracteres`);
        
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
        
        this.logger.info(`[MOVIMENTACAO] ${movimentacoes.length} movimentações processadas de ${unidade} (limitado a ${this.maxPages} páginas)`);
        
      } catch (error) {
        this.logger.error(`[MOVIMENTACAO] Erro ao processar ${filePath}: ${error.message}`);
      }
    }

    return {
      timestamp: new Date().toISOString(),
      total_movimentacoes: totalMovimentacoes,
      periodo_inicio: periodoInicio ? periodoInicio.format('YYYY-MM-DD') : null,
      periodo_fim: periodoFim ? periodoFim.format('YYYY-MM-DD') : null,
      limitacao_aplicada: `${this.maxPages} páginas por PDF`,
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
      
      // Detectar início de nova página - APLICAR LIMITAÇÃO AQUI
      if (line.match(/Página\s*(\d+)/i)) {
        const pageMatch = line.match(/Página\s*(\d+)/i);
        if (pageMatch) {
          const detectedPageNumber = parseInt(pageMatch[1]);
          
          // LIMITAÇÃO: Se ultrapassou o número máximo de páginas, parar o processamento
          if (detectedPageNumber > this.maxPages) {
            this.logger.warn(`[MOVIMENTACAO] Página ${detectedPageNumber} detectada - Limitando processamento a ${this.maxPages} páginas`);
            break;
          }
          
          if (currentPage && currentProduto) {
            currentPage.Movimentacao = currentMovimentacao;
            paginas.push(currentPage);
          }
          
          pageNumber = detectedPageNumber;
          currentPage = { Página: pageNumber };
          currentMovimentacao = [];
          currentProduto = null;
          
          this.logger.info(`[MOVIMENTACAO] Processando página ${pageNumber}/${this.maxPages}`);
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
      "Paginas": paginas,
      "Limitacao_Aplicada": `${this.maxPages} páginas`
    };
  }

  convertToStandardFormat(extractedData, unidade) {
    const movimentacoes = [];

    if (!extractedData.Paginas) return movimentacoes;

    extractedData.Paginas.forEach(pagina => {
      if (!pagina.Produto || !pagina.Movimentacao) return;

      const produto = pagina.Produto;

      pagina.Movimentacao.forEach(mov => {
        // Usar apenas os campos extraídos diretamente do PDF
        movimentacoes.push({
          unidade: unidade,
          codigo_item: produto.CodigoProduto,
          nome_item: produto.Nome,
          data_movimentacao: mov.Data,
          historico: mov.Histórico,
          documento: mov.Documento,
          requisicao: mov.Requisição,
          entradas: mov.Movimento.Entrada,
          saidas: mov.Movimento.Saída,
          estoque: mov.Estoque,
          observacao: mov.Observação
        });
      });
    });

    return movimentacoes;
  }

  extractUnidadeFromFilename(filePath) {
    const filename = filePath.split(/[/\\]/).pop();
    
    if (filename.includes('CAF')) return 'CAF';
    if (filename.includes('Olavo')) return 'Farmácia Olavo';
    if (filename.includes('ESF3')) return 'Farmácia ESF3';
    
    const match = filename.match(/Movimentação\s+(\w+)/i);
    return match ? `Farmácia ${match[1]}` : 'Unidade Desconhecida';
  }
}

module.exports = MovimentacaoProcessorLimited; 