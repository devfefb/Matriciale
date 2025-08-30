import { db } from '../../config/firebase';
import { 
  MovimentacaoSemana, 
  DadosUnidade, 
  DadosPlanilha 
} from '../interfaces/interfaces-campos-banco';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

// --- CONFIGURAÇÕES ---
const SEMANA_ALVO = '2025_22';
const ARQUIVO_PLANILHA = path.join(__dirname, 'movimentacoes_unidades_2025_22.xlsx');

// --- FUNÇÕES DE LEITURA DA PLANILHA ---

/**
 * Lê a planilha Excel e extrai os dados das abas (cada aba = uma unidade)
 */
function lerPlanilhaMovimentacoes(): DadosPlanilha {
  try {
    console.log(`�� Lendo planilha: ${ARQUIVO_PLANILHA}`);
    
    if (!fs.existsSync(ARQUIVO_PLANILHA)) {
      throw new Error(`Arquivo não encontrado: ${ARQUIVO_PLANILHA}`);
    }

    const workbook = XLSX.readFile(ARQUIVO_PLANILHA);
    const unidades: DadosUnidade[] = [];

    // Processa cada aba da planilha (cada aba = uma unidade)
    for (const sheetName of workbook.SheetNames) {
      console.log(`📋 Processando aba/unidade: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      const movimentacoes: MovimentacaoSemana[] = [];

      // Processa cada linha da aba
      for (let i = 1; i < dados.length; i++) {
        const linha = dados[i];
        
        // Verifica se a linha tem dados válidos (nome e quantidade)
        if (linha && linha.length >= 2 && linha[0] && linha[1] !== undefined) {
          const nomeMedicamento = String(linha[0]).trim();
          const quantidade = Number(linha[1]);

          // Valida os dados
          if (nomeMedicamento && !isNaN(quantidade) && quantidade >= 0) {
            movimentacoes.push({
              nome_medicamento: nomeMedicamento,
              quantidade: quantidade
            });
          } else {
            console.warn(`⚠️ Linha ${i + 1} da aba ${sheetName}: dados inválidos - Nome: "${nomeMedicamento}", Quantidade: ${quantidade}`);
          }
        }
      }

      // Adiciona a unidade com o nome da aba
      unidades.push({
        nome_unidade: sheetName,
        movimentacoes: movimentacoes
      });

      console.log(`✅ Unidade ${sheetName}: ${movimentacoes.length} movimentações encontradas`);
    }

    console.log(`📊 Total de unidades processadas: ${unidades.length}`);
    return { unidades };

  } catch (error) {
    console.error('❌ Erro ao ler planilha:', error);
    throw error;
  }
}

// --- FUNÇÕES DE INSERÇÃO NO FIREBASE ---

/**
 * Busca um medicamento pelo nome em uma unidade específica
 */
async function buscarMedicamentoPorNome(
  unidadeRef: FirebaseFirestore.DocumentReference, 
  nomeMedicamento: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> {
  try {
    const medicamentosSnapshot = await unidadeRef
      .collection('medicamentos_unidade')
      .where('nome', '==', nomeMedicamento)
      .limit(1)
      .get();

    if (!medicamentosSnapshot.empty) {
      return medicamentosSnapshot.docs[0];
    }

    return null;
  } catch (error) {
    console.error(`❌ Erro ao buscar medicamento "${nomeMedicamento}":`, error);
    return null;
  }
}

/**
 * Insere movimentação semanal em um medicamento específico
 */
async function inserirMovimentacaoSemanal(
  medicamentoRef: FirebaseFirestore.DocumentReference,
  quantidade: number
): Promise<boolean> {
  try {
    const doc = await medicamentoRef.get();
    if (!doc.exists) {
      console.log(`❌ Medicamento não encontrado: ${medicamentoRef.id}`);
      return false;
    }

    const medicamento = doc.data();
    const movimentacoesAtuais = medicamento?.movimentacoes_semanais || {};

    // Adiciona a nova movimentação
    movimentacoesAtuais[SEMANA_ALVO] = quantidade;

    // Atualiza o documento
    await medicamentoRef.update({
      movimentacoes_semanais: movimentacoesAtuais,
      data_atualizacao: new Date()
    });

    console.log(`✅ Movimentação inserida: ${medicamento?.nome} - Semana ${SEMANA_ALVO}: ${quantidade}`);
    return true;

  } catch (error) {
    console.error(`❌ Erro ao inserir movimentação no medicamento ${medicamentoRef.id}:`, error);
    return false;
  }
}

/**
 * Processa uma unidade completa
 */
async function processarUnidade(dadosUnidade: DadosUnidade): Promise<{ sucessos: number; erros: number; naoEncontrados: number }> {
  try {
    console.log(`\n🏥 Processando unidade: ${dadosUnidade.nome_unidade}`);
    
    // Busca o município (assumindo que só temos Palmares por enquanto)
    const municipioRef = db.collection('municipio').doc('Palmares');
    const municipioDoc = await municipioRef.get();
    
    if (!municipioDoc.exists) {
      throw new Error(`Município Palmares não encontrado no banco de dados`);
    }

    // Busca a unidade específica
    const unidadeRef = municipioRef.collection('unidades').doc(dadosUnidade.nome_unidade);
    const unidadeDoc = await unidadeRef.get();
    
    if (!unidadeDoc.exists) {
      throw new Error(`Unidade ${dadosUnidade.nome_unidade} não encontrada no banco de dados`);
    }

    let sucessos = 0;
    let erros = 0;
    let naoEncontrados = 0;

    // Processa cada movimentação da unidade
    for (const movimentacao of dadosUnidade.movimentacoes) {
      try {
        // Busca o medicamento pelo nome
        const medicamentoDoc = await buscarMedicamentoPorNome(
          unidadeRef, 
          movimentacao.nome_medicamento
        );

        if (medicamentoDoc) {
          // Insere a movimentação
          const resultado = await inserirMovimentacaoSemanal(
            medicamentoDoc.ref, 
            movimentacao.quantidade
          );

          if (resultado) {
            sucessos++;
          } else {
            erros++;
          }
        } else {
          console.warn(`⚠️ Medicamento não encontrado: "${movimentacao.nome_medicamento}" na unidade ${dadosUnidade.nome_unidade}`);
          naoEncontrados++;
        }

      } catch (error) {
        console.error(`❌ Erro ao processar movimentação "${movimentacao.nome_medicamento}":`, error);
        erros++;
      }
    }

    console.log(`📊 Unidade ${dadosUnidade.nome_unidade}: ${sucessos} sucessos, ${erros} erros, ${naoEncontrados} não encontrados`);
    return { sucessos, erros, naoEncontrados };

  } catch (error) {
    console.error(`❌ Erro ao processar unidade ${dadosUnidade.nome_unidade}:`, error);
    return { sucessos: 0, erros: dadosUnidade.movimentacoes.length, naoEncontrados: 0 };
  }
}

// --- FUNÇÃO PRINCIPAL ---
export async function inserirMovimentacoesSemanais(): Promise<void> {
  try {
    console.log('�� Iniciando inserção de movimentações semanais...');
    console.log(`�� Semana alvo: ${SEMANA_ALVO}`);
    console.log(`�� Arquivo: ${ARQUIVO_PLANILHA}\n`);

    // Lê os dados da planilha
    const dadosPlanilha = lerPlanilhaMovimentacoes();
    
    if (dadosPlanilha.unidades.length === 0) {
      throw new Error('Nenhuma unidade encontrada na planilha');
    }

    let totalSucessos = 0;
    let totalErros = 0;
    let totalNaoEncontrados = 0;

    // Processa cada unidade
    for (const dadosUnidade of dadosPlanilha.unidades) {
      const resultado = await processarUnidade(dadosUnidade);
      totalSucessos += resultado.sucessos;
      totalErros += resultado.erros;
      totalNaoEncontrados += resultado.naoEncontrados;
    }

    // Exibe relatório final
    console.log('\n🎉 Processamento concluído!');
    console.log(`📊 Resumo final:`);
    console.log(`   ✅ Total de movimentações inseridas: ${totalSucessos}`);
    console.log(`   ❌ Total de erros: ${totalErros}`);
    console.log(`   ⚠️ Total de medicamentos não encontrados: ${totalNaoEncontrados}`);
    console.log(`   📈 Taxa de sucesso: ${((totalSucessos / (totalSucessos + totalErros + totalNaoEncontrados)) * 100).toFixed(2)}%`);

    if (totalNaoEncontrados > 0) {
      console.log(`\n�� Dica: Verifique se os nomes dos medicamentos na planilha correspondem exatamente aos nomes no banco de dados`);
    }

  } catch (error) {
    console.error('�� Erro fatal durante o processamento:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  inserirMovimentacoesSemanais()
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na execução do script:', error);
      process.exit(1);
    });
}