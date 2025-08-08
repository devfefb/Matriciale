import * as fs from 'fs';
import * as path from 'path';
import { db } from '../config/firebase';
import * as readline from 'readline';

interface MovimentacaoSemanal {
  [key: string]: number;
}

interface Medicamento {
  nome: string;
  cod_item: string;
  classificacao: string;
  movimentacoes_semanais: MovimentacaoSemanal[];
}

interface Unidade {
  nome: string;
  medicamentos: Medicamento[];
}

interface Cidade {
  nome: string;
  unidades: Unidade[];
}

interface DadosCompletos {
  cidades: Cidade[];
}

interface MedicamentoFirebase {
  nome: string;
  cod_item: string;
  classificacao: string;
  mov_semanais: { [key: string]: number };
}

class InserirDadosService {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Transforma array de movimentações semanais em objeto
   */
  private transformarMovimentacoes(movimentacoes: MovimentacaoSemanal[]): { [key: string]: number } {
    const resultado: { [key: string]: number } = {};
    
    movimentacoes.forEach(mov => {
      Object.keys(mov).forEach(chave => {
        resultado[chave] = mov[chave];
      });
    });
    
    return resultado;
  }

  /**
   * Gera ID único para o medicamento
   */
  private gerarIdMedicamento(medicamento: Medicamento): string {
    return `${medicamento.cod_item}_${medicamento.nome.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
  }

  /**
   * Carrega dados do arquivo JSON
   */
  private async carregarDados(): Promise<DadosCompletos> {
    try {
      const caminhoArquivo = path.join(__dirname, '../../dados/extracao_movimentacoes_semanais.json');
      const dados = fs.readFileSync(caminhoArquivo, 'utf-8');
      return JSON.parse(dados) as DadosCompletos;
    } catch (error) {
      console.error('❌ Erro ao carregar arquivo de dados:', error);
      throw error;
    }
  }

  /**
   * Processa uma unidade específica
   */
  private async processarUnidade(cidade: Cidade, unidade: Unidade): Promise<void> {
    console.log(`\n🏥 Processando unidade: ${unidade.nome}`);
    console.log(`📊 Total de medicamentos: ${unidade.medicamentos.length}`);
    
    let sucessos = 0;
    let erros = 0;

    for (const medicamento of unidade.medicamentos) {
      try {
        const idMedicamento = this.gerarIdMedicamento(medicamento);
        
        const medicamentoFirebase: MedicamentoFirebase = {
          nome: medicamento.nome,
          cod_item: medicamento.cod_item,
          classificacao: medicamento.classificacao,
          mov_semanais: this.transformarMovimentacoes(medicamento.movimentacoes_semanais)
        };

        const caminhoDocumento = `municipios/${cidade.nome}/unidades/${unidade.nome}/medicamentos_unidade/${idMedicamento}`;
        
        await db.doc(caminhoDocumento).set(medicamentoFirebase);
        
        sucessos++;
        console.log(`✅ ${medicamento.nome} inserido com sucesso`);
        
      } catch (error) {
        erros++;
        console.error(`❌ Erro ao inserir ${medicamento.nome}:`, error);
      }
    }

    console.log(`\n📈 Resumo da unidade ${unidade.nome}:`);
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);
  }

  /**
   * Aguarda confirmação do usuário
   */
  private async aguardarConfirmacao(mensagem: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.rl.question(`${mensagem} (s/n): `, (resposta) => {
        const respostaLower = resposta.toLowerCase().trim();
        resolve(respostaLower === 's' || respostaLower === 'sim' || respostaLower === 'y' || respostaLower === 'yes');
      });
    });
  }

  /**
   * Executa o processo completo de inserção
   */
  public async executar(): Promise<void> {
    try {
      console.log('🚀 Iniciando processo de inserção de dados no Firebase...\n');
      
      // Carregar dados
      console.log('📂 Carregando dados do arquivo JSON...');
      const dados = await this.carregarDados();
      console.log('✅ Dados carregados com sucesso!\n');

      // Encontrar cidade Palmares
      const cidadePalmares = dados.cidades.find(cidade => 
        cidade.nome.toLowerCase().includes('palmares')
      );

      if (!cidadePalmares) {
        console.error('❌ Cidade Palmares não encontrada nos dados');
        return;
      }

      console.log(`🏙️ Cidade encontrada: ${cidadePalmares.nome}`);
      console.log(`🏥 Total de unidades: ${cidadePalmares.unidades.length}\n`);

      // Processar cada unidade
      for (const unidade of cidadePalmares.unidades) {
        await this.processarUnidade(cidadePalmares, unidade);
        
        const continuar = await this.aguardarConfirmacao(
          `\nUnidade ${unidade.nome} processada. Continuar para próxima unidade?`
        );
        
        if (!continuar) {
          console.log('⏹️ Processo interrompido pelo usuário');
          break;
        }
      }

      console.log('\n🎉 Processo de inserção concluído!');
      
    } catch (error) {
      console.error('❌ Erro durante o processo:', error);
    } finally {
      this.rl.close();
    }
  }
}

// Executar script se chamado diretamente
if (require.main === module) {
  const service = new InserirDadosService();
  service.executar().catch(console.error);
}

export default InserirDadosService;
