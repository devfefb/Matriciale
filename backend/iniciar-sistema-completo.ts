#!/usr/bin/env node

/**
 * Script de inicialização do Sistema Completo de Gestão de Estoque Farmacêutico
 * Demonstra o fluxo completo automatizado: upload → extração → processamento → resultado
 */

import * as path from 'path';
import * as fs from 'fs';
import { iniciarObservador } from './functions/src/scripts/testes/file-watcher';

interface ConfiguracaoSistema {
  municipio: string;
  unidades: string[];
  diretorioBase: string;
  modoDemonstração: boolean;
  intervaloLimpeza: number;
}

class SistemaEstoqueFarmaceutico {
  private configuracao: ConfiguracaoSistema;
  private observador: any;

  constructor(config: Partial<ConfiguracaoSistema> = {}) {
    this.configuracao = {
      municipio: 'municipio_exemplo',
      unidades: ['CAF', 'ESF3', 'Olavo'],
      diretorioBase: path.resolve('./backend'),
      modoDemonstração: false,
      intervaloLimpeza: 300000, // 5 minutos
      ...config
    };

    this.validarEstrutura();
  }

  /**
   * Valida e cria estrutura de pastas necessária
   */
  private validarEstrutura(): void {
    const pastas = [
      path.join(this.configuracao.diretorioBase, 'test-input'),
      path.join(this.configuracao.diretorioBase, 'test-output'),
      path.join(this.configuracao.diretorioBase, 'test-gabaritos'),
      path.join(this.configuracao.diretorioBase, 'test-output', 'processados'),
      path.join(this.configuracao.diretorioBase, 'test-output', 'erros'),
      path.join(this.configuracao.diretorioBase, 'test-output', 'backup')
    ];

    for (const pasta of pastas) {
      if (!fs.existsSync(pasta)) {
        fs.mkdirSync(pasta, { recursive: true });
        console.log(`📁 Pasta criada: ${pasta}`);
      }
    }
  }

  /**
   * Inicializa o sistema completo
   */
  public async iniciar(): Promise<void> {
    console.log('🚀 Iniciando Sistema de Gestão de Estoque Farmacêutico');
    console.log('='.repeat(80));
    console.log(`🏢 Município: ${this.configuracao.municipio}`);
    console.log(`🏥 Unidades: ${this.configuracao.unidades.join(', ')}`);
    console.log(`📁 Diretório base: ${this.configuracao.diretorioBase}`);
    console.log('='.repeat(80));

    try {
      // Configurar observador de arquivos
      const configObservador = {
        pastaInput: path.join(this.configuracao.diretorioBase, 'test-input'),
        pastaOutput: path.join(this.configuracao.diretorioBase, 'test-output'),
        pastaGabaritos: path.join(this.configuracao.diretorioBase, 'test-gabaritos'),
        debug: true,
        intervaloLimpeza: this.configuracao.intervaloLimpeza
      };

      this.observador = await iniciarObservador(configObservador);

      console.log('✅ Sistema iniciado com sucesso!');
      console.log('\n📋 COMO USAR O SISTEMA:');
      console.log('1. 🖱️  Use as interfaces drag & drop no frontend para fazer upload');
      console.log('2. 📁 Ou coloque arquivos JSON diretamente em test-input/');
      console.log('3. ⚙️  O sistema processará automaticamente');
      console.log('4. 📊 Verifique resultados em test-output/');
      console.log('5. 🔍 Relatórios detalhados incluem comparação com gabaritos');

      if (this.configuracao.modoDemonstração) {
        console.log('\n🎭 Modo demonstração ativo - gerando arquivo de exemplo...');
        await this.gerarArquivoExemplo();
      }

      console.log('\n🔄 Sistema em execução. Pressione Ctrl+C para parar.');

    } catch (error) {
      console.error('❌ Erro ao iniciar sistema:', error);
      throw error;
    }
  }

  /**
   * Gera arquivo de exemplo para demonstração
   */
  private async gerarArquivoExemplo(): Promise<void> {
    const exemploUploadSemanal = {
      tipo: 'semanal',
      municipio: this.configuracao.municipio,
      data_upload: new Date().toISOString(),
      unidades: {
        [this.configuracao.municipio + '_' + this.configuracao.unidades[0]]: {
          municipio: this.configuracao.municipio,
          unidade: this.configuracao.unidades[0],
          arquivos: {
            balancete: {
              nome: `balancete_${this.configuracao.unidades[0]}_exemplo.xlsx`,
              processado: true
            },
            movimentacao: {
              nome: `movimentacao_${this.configuracao.unidades[0]}_exemplo.xlsx`,
              processado: true
            }
          }
        }
      },
      metadados: {
        total_unidades: 1,
        periodo: new Date().toISOString().split('T')[0],
        versao_sistema: '1.0.0'
      }
    };

    const nomeArquivo = `upload-semanal-exemplo-${Date.now()}.json`;
    const caminhoArquivo = path.join(this.configuracao.diretorioBase, 'test-input', nomeArquivo);

    fs.writeFileSync(caminhoArquivo, JSON.stringify(exemploUploadSemanal, null, 2));
    console.log(`📄 Arquivo de exemplo criado: ${nomeArquivo}`);
    console.log('⏳ Aguarde processamento automático...');
  }

  /**
   * Para o sistema graciosamente
   */
  public parar(): void {
    if (this.observador) {
      this.observador.parar();
      console.log('🛑 Sistema parado');
    }
  }

  /**
   * Retorna status atual do sistema
   */
  public getStatus(): {
    configuracao: ConfiguracaoSistema;
    observador_ativo: boolean;
    timestamp: string;
    detalhes_observador?: any;
  } {
    const status = {
      configuracao: this.configuracao,
      observador_ativo: !!this.observador,
      timestamp: new Date().toISOString()
    };

    if (this.observador) {
      return {
        ...status,
        detalhes_observador: this.observador.getStatus()
      };
    }

    return status;
  }
}

/**
 * Função principal
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse argumentos
  const config: Partial<ConfiguracaoSistema> = {};
  let mostrarAjuda = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--municipio':
        config.municipio = args[i + 1];
        i++;
        break;
      case '--unidades':
        config.unidades = args[i + 1].split(',');
        i++;
        break;
      case '--diretorio':
        config.diretorioBase = path.resolve(args[i + 1]);
        i++;
        break;
      case '--demo':
        config.modoDemonstração = true;
        break;
      case '--help':
        mostrarAjuda = true;
        break;
    }
  }

  if (mostrarAjuda) {
    console.log(`
Sistema de Gestão de Estoque Farmacêutico - Ambiente de Teste Local

Uso: node iniciar-sistema-completo.js [opções]

Opções:
  --municipio <nome>        Nome do município (padrão: municipio_exemplo)
  --unidades <lista>        Unidades separadas por vírgula (padrão: CAF,ESF3,Olavo)
  --diretorio <pasta>       Diretório base (padrão: ./backend)
  --demo                    Ativa modo demonstração com arquivo de exemplo
  --help                    Mostra esta ajuda

Exemplos:
  node iniciar-sistema-completo.js --demo
  node iniciar-sistema-completo.js --municipio "sao_paulo" --unidades "Central,UBS1,UBS2"
  node iniciar-sistema-completo.js --diretorio "/caminho/para/dados" --demo

Fluxo do Sistema:
  1. 📁 Monitora pasta test-input/ automaticamente
  2. 🔍 Identifica tipo de arquivo (semanal/onboarding)
  3. ⚙️  Processa usando scripts generalizados
  4. 🧪 Executa validações automáticas
  5. 📊 Compara com gabaritos disponíveis
  6. 💾 Salva resultados em test-output/
  7. 🧹 Limpa arquivos processados automaticamente

Estrutura de Pastas:
  test-input/         ← Coloque arquivos JSON aqui
  test-output/        ← Resultados aparecem aqui
  test-gabaritos/     ← Gabaritos para comparação
  test-output/backup/ ← Backup dos arquivos processados
    `);
    process.exit(0);
  }

  try {
    const sistema = new SistemaEstoqueFarmaceutico(config);
    
    // Handlers para encerramento gracioso
    process.on('SIGINT', () => {
      console.log('\n🛑 Encerrando sistema...');
      sistema.parar();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Encerrando sistema...');
      sistema.parar();
      process.exit(0);
    });

    // Iniciar sistema
    await sistema.iniciar();

    // Exibir status periodicamente em modo debug
    setInterval(() => {
      const status = sistema.getStatus();
      console.log(`\n💓 Status do sistema: ${new Date().toLocaleTimeString('pt-BR')}`);
      
      if (status.detalhes_observador) {
        const obs = status.detalhes_observador as any;
        console.log(`   📦 Fila de processamento: ${obs.fila_processamento}`);
        console.log(`   ⚙️  Processando atualmente: ${obs.processando_atualmente ? 'Sim' : 'Não'}`);
      }
    }, 60000); // A cada minuto

  } catch (error) {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

export { SistemaEstoqueFarmaceutico };
export default SistemaEstoqueFarmaceutico;
