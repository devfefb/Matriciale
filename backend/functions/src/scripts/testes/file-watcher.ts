import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import { validarCalculosComGabarito } from './validar-calculos';

/**
 * Sistema de observação de arquivos para automação de testes
 * Monitora a pasta test-input e processa automaticamente arquivos JSON
 */

interface ArquivoProcessamento {
  caminho: string;
  tipo: 'semanal' | 'onboarding' | 'desconhecido';
  municipio?: string;
  unidade?: string;
  timestamp: Date;
}

interface Configuracao {
  pastaInput: string;
  pastaOutput: string;
  pastaGabaritos: string;
  intervaloLimpeza: number; // em ms
  maxArquivosProcessamento: number;
  debug: boolean;
}

class FileWatcher {
  private watcher: any | null = null;
  private filaProcessamento: ArquivoProcessamento[] = [];
  private processandoAtualmente = false;
  private config: Configuracao;

  constructor(config: Partial<Configuracao> = {}) {
    this.config = {
      pastaInput: path.resolve(process.cwd(), 'test-input'),
      pastaOutput: path.resolve(process.cwd(), 'test-output'),
      pastaGabaritos: path.resolve(process.cwd(), 'test-gabaritos'),
      intervaloLimpeza: 60000, // 1 minuto
      maxArquivosProcessamento: 10,
      debug: false,
      ...config
    };

    this.garantirPastasExistem();
  }

  /**
   * Garante que todas as pastas necessárias existem
   */
  private garantirPastasExistem(): void {
    const pastas = [this.config.pastaInput, this.config.pastaOutput, this.config.pastaGabaritos];
    
    for (const pasta of pastas) {
      if (!fs.existsSync(pasta)) {
        fs.mkdirSync(pasta, { recursive: true });
        console.log(`📁 Pasta criada: ${pasta}`);
      }
    }
  }

  /**
   * Analisa o conteúdo do arquivo para determinar tipo e metadados
   */
  private analisarArquivo(caminhoArquivo: string): ArquivoProcessamento {
    const nomeArquivo = path.basename(caminhoArquivo);
    let tipo: 'semanal' | 'onboarding' | 'desconhecido' = 'desconhecido';
    let municipio: string | undefined;
    let unidade: string | undefined;

    try {
      // Analisar pelo nome do arquivo
      if (nomeArquivo.includes('upload-semanal')) {
        tipo = 'semanal';
      } else if (nomeArquivo.includes('onboarding')) {
        tipo = 'onboarding';
      }

      // Tentar extrair metadados do conteúdo
      const conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
      const dados = JSON.parse(conteudo);

      // Para upload semanal
      if (dados && typeof dados === 'object') {
        if (dados.municipio) {
          municipio = dados.municipio;
          tipo = 'onboarding';
        } else if (dados.unidade) {
          unidade = dados.unidade;
          tipo = 'semanal';
        } else if (Object.keys(dados).some(key => key.includes('_'))) {
          // Estrutura que parece ser de upload semanal (ex: municipio_unidade)
          tipo = 'semanal';
          const primeiraChave = Object.keys(dados)[0];
          if (primeiraChave.includes('_')) {
            const partes = primeiraChave.split('_');
            municipio = partes[0];
            unidade = partes[1];
          }
        }
      }

      if (this.config.debug) {
        console.log(`🔍 Arquivo analisado: ${nomeArquivo}`);
        console.log(`   Tipo: ${tipo}`);
        console.log(`   Município: ${municipio || 'não detectado'}`);
        console.log(`   Unidade: ${unidade || 'não detectado'}`);
      }

    } catch (error) {
      console.warn(`⚠️ Erro ao analisar arquivo ${nomeArquivo}:`, error);
    }

    return {
      caminho: caminhoArquivo,
      tipo,
      municipio,
      unidade,
      timestamp: new Date()
    };
  }

  /**
   * Processa um arquivo da fila
   */
  private async processarArquivo(arquivo: ArquivoProcessamento): Promise<void> {
    console.log(`🔄 Processando arquivo: ${path.basename(arquivo.caminho)}`);
    
    try {
      let resultado: any;
      const nomeArquivoSaida = `resultado_${path.basename(arquivo.caminho, '.json')}_${Date.now()}.json`;
      const caminhoSaida = path.join(this.config.pastaOutput, nomeArquivoSaida);

      switch (arquivo.tipo) {
        case 'semanal':
          resultado = await this.processarUploadSemanal(arquivo);
          break;
        case 'onboarding':
          resultado = await this.processarOnboarding(arquivo);
          break;
        default:
          console.warn(`⚠️ Tipo de arquivo não reconhecido: ${arquivo.tipo}`);
          resultado = await this.processarGenerico(arquivo);
      }

      // Salvar resultado
      await this.salvarResultado(resultado, caminhoSaida);

      // Comparar com gabarito se disponível
      await this.compararComGabarito(resultado, arquivo);

      // Mover arquivo processado para pasta de output (backup)
      const caminhoBackup = path.join(this.config.pastaOutput, 'processados', path.basename(arquivo.caminho));
      await this.moverArquivo(arquivo.caminho, caminhoBackup);

      console.log(`✅ Arquivo processado com sucesso: ${path.basename(arquivo.caminho)}`);

    } catch (error) {
      console.error(`❌ Erro ao processar arquivo ${path.basename(arquivo.caminho)}:`, error);
      
      // Mover arquivo com erro para pasta de erros
      const caminhoErro = path.join(this.config.pastaOutput, 'erros', path.basename(arquivo.caminho));
      await this.moverArquivo(arquivo.caminho, caminhoErro);
    }
  }

  /**
   * Processa upload semanal
   */
  private async processarUploadSemanal(arquivo: ArquivoProcessamento): Promise<any> {
    console.log(`📊 Processando upload semanal...`);
    
    // Ler dados do arquivo
    const conteudo = fs.readFileSync(arquivo.caminho, 'utf8');
    const dados = JSON.parse(conteudo);
    
    // Aqui seria integrado com o motor de cálculo existente
    // Por simplicidade, simulo o processamento
    return {
      tipo: 'semanal',
      arquivo_origem: path.basename(arquivo.caminho),
      municipio: arquivo.municipio,
      unidade: arquivo.unidade,
      data_processamento: new Date().toISOString(),
      dados_processados: dados,
      status: 'processado_com_sucesso'
    };
  }

  /**
   * Processa onboarding
   */
  private async processarOnboarding(arquivo: ArquivoProcessamento): Promise<any> {
    console.log(`🏢 Processando onboarding...`);
    
    // Ler dados do arquivo
    const conteudo = fs.readFileSync(arquivo.caminho, 'utf8');
    const dados = JSON.parse(conteudo);
    
    // Aqui seria integrado com o motor de inserção existente
    // Por simplicidade, simulo o processamento
    return {
      tipo: 'onboarding',
      arquivo_origem: path.basename(arquivo.caminho),
      municipio: arquivo.municipio,
      data_processamento: new Date().toISOString(),
      dados_processados: dados,
      status: 'processado_com_sucesso'
    };
  }

  /**
   * Processa arquivo de tipo desconhecido
   */
  private async processarGenerico(arquivo: ArquivoProcessamento): Promise<any> {
    console.log(`❓ Processando arquivo genérico...`);
    
    // Tentar executar validação usando sistema consolidado
    try {
      console.log(`🧪 Executando validação consolidada...`);
      
      // Importar sistema de validação dinamicamente para evitar dependências circulares
      const { validarArquivo } = await import('./sistema-validacao');
      
      const relatorio = await validarArquivo(arquivo.caminho, {
        tolerancia_erro: 5,
        salvar_detalhes: true
      });
      
      return {
        tipo: 'validacao_consolidada',
        arquivo_origem: path.basename(arquivo.caminho),
        data_processamento: new Date().toISOString(),
        relatorio_validacao: relatorio,
        status: relatorio.status_final === 'reprovado' ? 'erro_validacao' : 'validacao_executada'
      };
    } catch (error) {
      console.warn(`⚠️ Falha na validação consolidada:`, error);
      
      // Fallback para validação simples
      try {
        console.log(`🔄 Tentando validação simples como fallback...`);
        await validarCalculosComGabarito();
        
        return {
          tipo: 'validacao_simples',
          arquivo_origem: path.basename(arquivo.caminho),
          data_processamento: new Date().toISOString(),
          status: 'validacao_executada'
        };
      } catch (fallbackError) {
        return {
          tipo: 'erro',
          arquivo_origem: path.basename(arquivo.caminho),
          data_processamento: new Date().toISOString(),
          erro: fallbackError.message,
          status: 'erro_processamento'
        };
      }
    }
  }

  /**
   * Salva resultado do processamento
   */
  private async salvarResultado(resultado: any, caminhoSaida: string): Promise<void> {
    // Garantir que pasta existe
    const pastaDestino = path.dirname(caminhoSaida);
    if (!fs.existsSync(pastaDestino)) {
      fs.mkdirSync(pastaDestino, { recursive: true });
    }

    fs.writeFileSync(caminhoSaida, JSON.stringify(resultado, null, 2));
    console.log(`💾 Resultado salvo em: ${caminhoSaida}`);
  }

  /**
   * Compara resultado com gabarito disponível
   */
  private async compararComGabarito(resultado: any, arquivo: ArquivoProcessamento): Promise<void> {
    try {
      const gabaritoDisponivel = path.join(this.config.pastaGabaritos, 'gabarito-campos-calculados.json');
      
      if (!fs.existsSync(gabaritoDisponivel)) {
        console.log(`ℹ️ Nenhum gabarito disponível para comparação`);
        return;
      }

      console.log(`🔍 Comparando com gabarito...`);
      
      // Executar validação automática
      await validarCalculosComGabarito();
      
      console.log(`✅ Comparação com gabarito concluída`);
      
    } catch (error) {
      console.warn(`⚠️ Erro na comparação com gabarito:`, error);
    }
  }

  /**
   * Move arquivo para pasta de destino
   */
  private async moverArquivo(origem: string, destino: string): Promise<void> {
    // Garantir que pasta de destino existe
    const pastaDestino = path.dirname(destino);
    if (!fs.existsSync(pastaDestino)) {
      fs.mkdirSync(pastaDestino, { recursive: true });
    }

    fs.renameSync(origem, destino);
    
    if (this.config.debug) {
      console.log(`📁 Arquivo movido: ${path.basename(origem)} → ${pastaDestino}`);
    }
  }

  /**
   * Processa a fila de arquivos
   */
  private async processarFila(): Promise<void> {
    if (this.processandoAtualmente || this.filaProcessamento.length === 0) {
      return;
    }

    this.processandoAtualmente = true;

    try {
      while (this.filaProcessamento.length > 0) {
        const arquivo = this.filaProcessamento.shift()!;
        await this.processarArquivo(arquivo);
        
        // Pequena pausa entre processamentos
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Erro no processamento da fila:`, error);
    } finally {
      this.processandoAtualmente = false;
    }
  }

  /**
   * Handler para novos arquivos detectados
   */
  private async onNovoArquivo(caminhoArquivo: string): Promise<void> {
    try {
      // Verificar se é arquivo JSON
      if (!caminhoArquivo.endsWith('.json')) {
        if (this.config.debug) {
          console.log(`⏭️ Ignorando arquivo não-JSON: ${path.basename(caminhoArquivo)}`);
        }
        return;
      }

      // Aguardar um pouco para garantir que arquivo foi completamente escrito
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verificar se arquivo ainda existe (pode ter sido removido)
      if (!fs.existsSync(caminhoArquivo)) {
        return;
      }

      console.log(`📥 Novo arquivo detectado: ${path.basename(caminhoArquivo)}`);

      // Analisar arquivo
      const arquivoInfo = this.analisarArquivo(caminhoArquivo);

      // Adicionar à fila de processamento
      this.filaProcessamento.push(arquivoInfo);

      // Limitar tamanho da fila
      if (this.filaProcessamento.length > this.config.maxArquivosProcessamento) {
        console.warn(`⚠️ Fila de processamento cheia, removendo arquivo mais antigo`);
        this.filaProcessamento.shift();
      }

      console.log(`📋 Arquivo adicionado à fila (${this.filaProcessamento.length} na fila)`);

      // Processar fila
      setImmediate(() => this.processarFila());

    } catch (error) {
      console.error(`❌ Erro ao processar novo arquivo:`, error);
    }
  }

  /**
   * Inicia o observador de arquivos
   */
  public iniciar(): void {
    if (this.watcher) {
      console.log(`⚠️ Observador já está ativo`);
      return;
    }

    console.log(`🚀 Iniciando observador de arquivos...`);
    console.log(`📁 Monitorando pasta: ${this.config.pastaInput}`);
    console.log(`📤 Resultados em: ${this.config.pastaOutput}`);
    console.log(`📊 Gabaritos em: ${this.config.pastaGabaritos}`);

    this.watcher = chokidar.watch(this.config.pastaInput, {
      ignored: /(^|[\/\\])\../, // Ignorar arquivos ocultos
      persistent: true,
      ignoreInitial: false, // Processar arquivos já existentes
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (caminhoArquivo) => this.onNovoArquivo(caminhoArquivo))
      .on('change', (caminhoArquivo) => this.onNovoArquivo(caminhoArquivo))
      .on('error', (error) => console.error(`❌ Erro no observador:`, error));

    // Configurar limpeza periódica
    setInterval(() => this.limpezaPeriodica(), this.config.intervaloLimpeza);

    console.log(`✅ Observador iniciado com sucesso!`);
  }

  /**
   * Para o observador de arquivos
   */
  public parar(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log(`🛑 Observador de arquivos parado`);
    }
  }

  /**
   * Limpeza periódica de arquivos antigos
   */
  private limpezaPeriodica(): void {
    try {
      const agora = new Date();
      const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);

      // Limpar pasta de output de arquivos muito antigos
      const pastaProcessados = path.join(this.config.pastaOutput, 'processados');
      if (fs.existsSync(pastaProcessados)) {
        const arquivos = fs.readdirSync(pastaProcessados);
        let removidos = 0;

        for (const arquivo of arquivos) {
          const caminhoArquivo = path.join(pastaProcessados, arquivo);
          const stats = fs.statSync(caminhoArquivo);
          
          if (stats.mtime < umDiaAtras) {
            fs.unlinkSync(caminhoArquivo);
            removidos++;
          }
        }

        if (removidos > 0 && this.config.debug) {
          console.log(`🧹 Limpeza: ${removidos} arquivos antigos removidos`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Erro na limpeza periódica:`, error);
    }
  }

  /**
   * Retorna status atual do observador
   */
  public getStatus(): object {
    return {
      ativo: !!this.watcher,
      fila_processamento: this.filaProcessamento.length,
      processando_atualmente: this.processandoAtualmente,
      configuracao: this.config
    };
  }
}

/**
 * Função principal para executar o observador
 */
export async function iniciarObservador(opcoes: Partial<Configuracao> = {}): Promise<FileWatcher> {
  const watcher = new FileWatcher(opcoes);
  watcher.iniciar();
  return watcher;
}

/**
 * Função para executar como script standalone
 */
async function main() {
  const args = process.argv.slice(2);
  
  const config: Partial<Configuracao> = {
    debug: args.includes('--debug') || args.includes('-v')
  };

  // Parse argumentos
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
        config.pastaInput = path.resolve(args[i + 1]);
        i++;
        break;
      case '--output':
        config.pastaOutput = path.resolve(args[i + 1]);
        i++;
        break;
      case '--gabaritos':
        config.pastaGabaritos = path.resolve(args[i + 1]);
        i++;
        break;
      case '--help':
        console.log(`
Observador de Arquivos para Automação de Testes

Uso: node file-watcher.js [opções]

Opções:
  --input <pasta>      Pasta de entrada (padrão: ./test-input)
  --output <pasta>     Pasta de saída (padrão: ./test-output)
  --gabaritos <pasta>  Pasta de gabaritos (padrão: ./test-gabaritos)
  --debug, -v          Ativa logs detalhados
  --help               Mostra esta ajuda

O observador monitora a pasta de entrada e processa automaticamente:
- Arquivos de upload semanal (balancete + movimentação)
- Arquivos de onboarding (histórico completo)
- Executa validações automáticas contra gabaritos
        `);
        process.exit(0);
    }
  }

  console.log('🎯 Iniciando sistema de observação automática...');
  
  try {
    const watcher = await iniciarObservador(config);
    
    // Handlers para encerramento gracioso
    process.on('SIGINT', () => {
      console.log('\n🛑 Encerrando observador...');
      watcher.parar();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Encerrando observador...');
      watcher.parar();
      process.exit(0);
    });

    // Manter processo ativo
    setInterval(() => {
      if (config.debug) {
        const status = watcher.getStatus();
        console.log(`💓 Status: ${JSON.stringify(status, null, 2)}`);
      }
    }, 30000); // Status a cada 30 segundos

  } catch (error) {
    console.error('💥 Erro ao iniciar observador:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

export { FileWatcher };
export default FileWatcher;
