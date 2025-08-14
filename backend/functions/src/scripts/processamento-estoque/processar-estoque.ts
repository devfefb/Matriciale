import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Inicializa Firebase Admin se não estiver inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Interfaces para tipagem
interface ItemMovimentacao {
  cod_sistemico_item: string;
  descricao_item: string;
  qtd_periodo_final: number;
  [key: string]: any;
}

interface DadosUnidade {
  periodo_inicio: string;
  periodo_fim: string;
  itens: ItemMovimentacao[];
}

interface EstoqueCalculado {
  descricao_item: string;
  estoque_proprio: number;
  estoque_geral: number;
  unidades_contribuindo: string[];
}

/**
 * Carrega dados de movimentação de um arquivo JSON
 */
function carregarDadosUnidade(caminhoArquivo: string): DadosUnidade {
  try {
    const dados = fs.readFileSync(caminhoArquivo, 'utf8');
    return JSON.parse(dados);
  } catch (error) {
    console.error(`❌ Erro ao carregar arquivo ${caminhoArquivo}:`, error);
    throw error;
  }
}

/**
 * Calcula o estoque consolidado para todos os medicamentos
 */
function calcularEstoqueConsolidado(
  dadosCAF: DadosUnidade,
  dadosESF3: DadosUnidade,
  dadosOlavo: DadosUnidade
): Map<string, EstoqueCalculado> {
  console.log('🔄 Calculando estoque consolidado...');
  
  const estoqueConsolidado = new Map<string, EstoqueCalculado>();
  
  // Processa CAF (estoque próprio)
  console.log('📊 Processando dados da CAF...');
  for (const item of dadosCAF.itens) {
    const estoqueItem: EstoqueCalculado = {
      descricao_item: item.descricao_item,
      estoque_proprio: item.qtd_periodo_final,
      estoque_geral: item.qtd_periodo_final, // Inicializa com o valor da CAF
      unidades_contribuindo: ['CAF']
    };
    estoqueConsolidado.set(item.descricao_item, estoqueItem);
  }
  
  // Processa ESF3 (adiciona ao estoque geral)
  console.log('📊 Processando dados da ESF3...');
  for (const item of dadosESF3.itens) {
    const estoqueExistente = estoqueConsolidado.get(item.descricao_item);
    
    if (estoqueExistente) {
      // Medicamento já existe na CAF, adiciona ao estoque geral
      estoqueExistente.estoque_geral += item.qtd_periodo_final;
      estoqueExistente.unidades_contribuindo.push('ESF3');
    } else {
      // Medicamento não existe na CAF, cria registro com estoque próprio = 0
      const estoqueItem: EstoqueCalculado = {
        descricao_item: item.descricao_item,
        estoque_proprio: 0,
        estoque_geral: item.qtd_periodo_final,
        unidades_contribuindo: ['ESF3']
      };
      estoqueConsolidado.set(item.descricao_item, estoqueItem);
    }
  }
  
  // Processa Olavo (adiciona ao estoque geral)
  console.log('📊 Processando dados da Olavo...');
  for (const item of dadosOlavo.itens) {
    const estoqueExistente = estoqueConsolidado.get(item.descricao_item);
    
    if (estoqueExistente) {
      // Medicamento já existe, adiciona ao estoque geral
      estoqueExistente.estoque_geral += item.qtd_periodo_final;
      estoqueExistente.unidades_contribuindo.push('Olavo');
    } else {
      // Medicamento não existe na CAF, cria registro com estoque próprio = 0
      const estoqueItem: EstoqueCalculado = {
        descricao_item: item.descricao_item,
        estoque_proprio: 0,
        estoque_geral: item.qtd_periodo_final,
        unidades_contribuindo: ['Olavo']
      };
      estoqueConsolidado.set(item.descricao_item, estoqueItem);
    }
  }
  
  console.log(`✅ Estoque consolidado calculado para ${estoqueConsolidado.size} medicamentos`);
  return estoqueConsolidado;
}

/**
 * Busca medicamento no banco de dados pelo nome
 */
async function buscarMedicamentoPorNome(
  unidadeRef: admin.firestore.DocumentReference,
  nomeMedicamento: string
): Promise<admin.firestore.DocumentSnapshot | null> {
  try {
    const medicamentosSnapshot = await unidadeRef
      .collection('medicamentos_unidade')
      .where('nome', '==', nomeMedicamento)
      .limit(1)
      .get();
    
    return medicamentosSnapshot.empty ? null : medicamentosSnapshot.docs[0];
  } catch (error) {
    console.error(`❌ Erro ao buscar medicamento "${nomeMedicamento}":`, error);
    return null;
  }
}

/**
 * Atualiza o estoque de um medicamento no banco de dados
 */
async function atualizarEstoqueMedicamento(
  medicamentoRef: admin.firestore.DocumentReference,
  estoqueCalculado: EstoqueCalculado
): Promise<boolean> {
  try {
    await medicamentoRef.update({
      estoque_proprio: estoqueCalculado.estoque_proprio,
      estoque_geral: estoqueCalculado.estoque_geral,
      unidades_contribuindo: estoqueCalculado.unidades_contribuindo,
      data_atualizacao_estoque: new Date()
    });
    
    console.log(`✅ Estoque atualizado para "${estoqueCalculado.descricao_item}": próprio=${estoqueCalculado.estoque_proprio}, geral=${estoqueCalculado.estoque_geral}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao atualizar estoque para "${estoqueCalculado.descricao_item}":`, error);
    return false;
  }
}

/**
 * Processa o estoque da CAF e atualiza o banco de dados
 */
export async function processarEstoqueCAF(): Promise<void> {
  try {
    console.log('🚀 Iniciando processamento de estoque da CAF...');
    
    // Caminhos dos arquivos JSON
    const caminhoCAF = path.join(__dirname, '../dados/2025_22/movimentacoesCAF.json');
    const caminhoESF3 = path.join(__dirname, '../dados/2025_22/movimentacoesESF3.json');
    const caminhoOlavo = path.join(__dirname, '../dados/2025_22/movimentacoesOlavo.json');
    
    // Verifica se os arquivos existem
    if (!fs.existsSync(caminhoCAF)) {
      throw new Error(`Arquivo CAF não encontrado: ${caminhoCAF}`);
    }
    if (!fs.existsSync(caminhoESF3)) {
      throw new Error(`Arquivo ESF3 não encontrado: ${caminhoESF3}`);
    }
    if (!fs.existsSync(caminhoOlavo)) {
      throw new Error(`Arquivo Olavo não encontrado: ${caminhoOlavo}`);
    }
    
    // Carrega dados das unidades
    console.log('📖 Carregando dados das unidades...');
    const dadosCAF = carregarDadosUnidade(caminhoCAF);
    const dadosESF3 = carregarDadosUnidade(caminhoESF3);
    const dadosOlavo = carregarDadosUnidade(caminhoOlavo);
    
    console.log(`📊 CAF: ${dadosCAF.itens.length} itens`);
    console.log(`📊 ESF3: ${dadosESF3.itens.length} itens`);
    console.log(`📊 Olavo: ${dadosOlavo.itens.length} itens`);
    
    // Calcula estoque consolidado
    const estoqueConsolidado = calcularEstoqueConsolidado(dadosCAF, dadosESF3, dadosOlavo);
    
    // Busca a unidade CAF no banco de dados
    console.log('🔍 Buscando unidade CAF no banco de dados...');
    const municipioRef = db.collection('municipio').doc('Palmares');
    const unidadeCAFRef = municipioRef.collection('unidades').doc('CAF');
    
    const unidadeCAFDoc = await unidadeCAFRef.get();
    if (!unidadeCAFDoc.exists) {
      throw new Error('Unidade CAF não encontrada no banco de dados');
    }
    
    // Processa cada medicamento
    console.log('🔄 Atualizando estoque dos medicamentos...');
    let sucessos = 0;
    let erros = 0;
    let naoEncontrados = 0;
    
    for (const [descricaoItem, estoqueCalculado] of estoqueConsolidado) {
      try {
        // Busca o medicamento na unidade CAF
        const medicamentoDoc = await buscarMedicamentoPorNome(unidadeCAFRef, descricaoItem);
        
        if (medicamentoDoc) {
          // Atualiza o estoque
          const resultado = await atualizarEstoqueMedicamento(
            medicamentoDoc.ref,
            estoqueCalculado
          );
          
          if (resultado) {
            sucessos++;
          } else {
            erros++;
          }
        } else {
          console.warn(`⚠️ Medicamento não encontrado na CAF: "${descricaoItem}"`);
          naoEncontrados++;
        }
      } catch (error) {
        console.error(`❌ Erro ao processar medicamento "${descricaoItem}":`, error);
        erros++;
      }
    }
    
    // Exibe estatísticas finais
    console.log('\n🎉 Processamento de estoque da CAF concluído!');
    console.log('📊 Estatísticas finais:');
    console.log(`   ✅ Sucessos: ${sucessos}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log(`   ⚠️ Não encontrados: ${naoEncontrados}`);
    console.log(`   📈 Taxa de sucesso: ${((sucessos / (sucessos + erros + naoEncontrados)) * 100).toFixed(2)}%`);
    
    // Salva log detalhado
    const logDetalhado = {
      data_processamento: new Date().toISOString(),
      periodo_referencia: {
        inicio: dadosCAF.periodo_inicio,
        fim: dadosCAF.periodo_fim
      },
      estatisticas: {
        total_medicamentos: estoqueConsolidado.size,
        sucessos,
        erros,
        naoEncontrados,
        taxaSucesso: ((sucessos / (sucessos + erros + naoEncontrados)) * 100).toFixed(2)
      },
      unidades_contribuindo: {
        caf: dadosCAF.itens.length,
        esf3: dadosESF3.itens.length,
        olavo: dadosOlavo.itens.length
      }
    };
    
    const logPath = path.join(__dirname, '../logs/processamento-estoque-caf.json');
    fs.writeFileSync(logPath, JSON.stringify(logDetalhado, null, 2));
    console.log(`📝 Log detalhado salvo em: ${logPath}`);
    
  } catch (error) {
    console.error('❌ Erro durante o processamento de estoque da CAF:', error);
    throw error;
  }
}

// Executa o script se for chamado diretamente
if (require.main === module) {
  processarEstoqueCAF()
    .then(() => {
      console.log('✅ Processamento concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no processamento:', error);
      process.exit(1);
    });
}
