import { db } from '../../config/firebase';
import { calcularProximoIndiceAnoSemana } from '../utils/utils';

/**
 * Interface para os dados de um item processado do inventoryData
 */
interface ItemProcessado {
  cod_sistemico_item: string;
  descricao_item: string;
  qtd_periodo_final: number;
  qtd_saidas_periodo: number;
  movimentacao_semanal_calculada?: number;
}

/**
 * Interface para o inventoryData completo
 */
interface InventoryData {
  periodo_inicio: string;
  periodo_fim: string;
  unidade: string;
  itens: ItemProcessado[];
}

/**
 * Atualiza estoque e movimentação semanal para todos os medicamentos de uma unidade
 * 
 * @param inventoryData - Dados processados do inventário
 * @param municipioId - ID do município no Firestore
 * @returns Objeto com estatísticas do processamento
 */
export async function atualizarEstoqueEMovimentacaoSemanal(
  inventoryData: InventoryData,
  municipioId: string
): Promise<{
  sucesso: boolean;
  medicamentos_atualizados: number;
  medicamentos_zerados: number;
  medicamentos_nao_encontrados: number;
  semana_calculada: string;
  erro?: string;
}> {
  try {
    console.log(`🔄 Iniciando atualização de estoque e movimentação semanal...`);
    console.log(`📍 Município: ${municipioId}, Unidade: ${inventoryData.unidade}`);
    console.log(`📅 Período: ${inventoryData.periodo_inicio} a ${inventoryData.periodo_fim}`);

    // 1. Buscar referência da unidade no Firestore
    const municipioRef = db.collection('municipio').doc(municipioId);
    const unidadeRef = municipioRef.collection('unidades').doc(inventoryData.unidade);

    // Verificar se a unidade existe
    const unidadeDoc = await unidadeRef.get();
    if (!unidadeDoc.exists) {
      throw new Error(`Unidade ${inventoryData.unidade} não encontrada no município ${municipioId}`);
    }

    // 2. Buscar todos os medicamentos da unidade
    const medicamentosSnapshot = await unidadeRef.collection('medicamentos_unidade').get();
    console.log(`📦 Total de medicamentos na unidade: ${medicamentosSnapshot.size}`);

    // 3. Encontrar o maior índice ano_semana existente em TODOS os medicamentos
    let maiorIndiceExistente = '';
    const todosIndices: string[] = [];
    
    medicamentosSnapshot.docs.forEach(doc => {
      const medicamento = doc.data();
      if (medicamento.movimentacoes_semanais) {
        const indices = Object.keys(medicamento.movimentacoes_semanais);
        todosIndices.push(...indices);
      }
    });

    // Ordenar e pegar o maior (mais recente)
    if (todosIndices.length > 0) {
      todosIndices.sort();
      maiorIndiceExistente = todosIndices[todosIndices.length - 1];
      console.log(`📊 Maior índice existente encontrado: ${maiorIndiceExistente}`);
    }

    // 4. Calcular o próximo índice sequencial
    const movimentacoesBase = maiorIndiceExistente ? { [maiorIndiceExistente]: 0 } : {};
    const indiceAnoSemana = calcularProximoIndiceAnoSemana(movimentacoesBase);
    console.log(`📊 Próximo índice sequencial calculado: ${indiceAnoSemana}`);

    // 5. Criar mapa de medicamentos processados para busca rápida
    // MUDANÇA: Agora usa descricao_item como chave para melhor correspondência
    const medicamentosProcessadosMap = new Map<string, ItemProcessado>();
    console.log(`\n📦 Criando mapa com ${inventoryData.itens.length} itens do JSON`);

    // Função auxiliar para normalizar nome (limpar e padronizar)
    const normalizarNome = (nome: string): string => {
      return nome
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' '); // Normalizar espaços múltiplos
    };

    inventoryData.itens.forEach(item => {
      const nomeNormalizado = normalizarNome(item.descricao_item);
      medicamentosProcessadosMap.set(nomeNormalizado, item);
    });

    // Debug: Mostrar amostra dos nomes no mapa
    console.log('📋 Amostra de nomes no mapa (normalizados):');
    Array.from(medicamentosProcessadosMap.keys()).slice(0, 3).forEach(key => {
      console.log(`   ${key}`);
    });

    // Debug: Mostrar amostra dos nomes do Firestore
    console.log('\n📋 Amostra de nomes do Firestore (normalizados):');
    medicamentosSnapshot.docs.slice(0, 3).forEach(doc => {
      const nome = doc.data().nome || '';
      console.log(`   ${normalizarNome(nome)}`);
    });

    let medicamentosAtualizados = 0;
    let medicamentosZerados = 0;
    let medicamentosNaoEncontrados = 0;

    // 6. Iterar sobre todos os medicamentos da unidade
    console.log(`\n🔄 Processando ${medicamentosSnapshot.size} medicamentos do Firestore...\n`);

    for (const medicamentoDoc of medicamentosSnapshot.docs) {
      const medicamento = medicamentoDoc.data();
      const nomeMedicamento = medicamento.nome || '';
      const codItem = medicamento.cod_item;
      const nomeNormalizado = normalizarNome(nomeMedicamento);

      // Verificar se o medicamento foi processado (usando nome normalizado)
      const itemProcessado = medicamentosProcessadosMap.get(nomeNormalizado);

      let estoque: number | undefined;
      let movimentacaoSemanal: number;
      let foiEncontradoNoJSON: boolean;

      if (itemProcessado) {
        // Medicamento foi movimentado - usar dados do processamento
        estoque = itemProcessado.qtd_periodo_final || 0;
        movimentacaoSemanal = itemProcessado.movimentacao_semanal_calculada || itemProcessado.qtd_saidas_periodo || 0;
        foiEncontradoNoJSON = true;
        
        console.log(`  ✅ ${medicamento.nome} (${codItem}): Estoque=${estoque}, Mov=${movimentacaoSemanal}`);
        medicamentosAtualizados++;
      } else {
        // Medicamento NÃO foi movimentado - NÃO atualizar estoque
        estoque = undefined; // Não será incluído no update
        movimentacaoSemanal = 0;
        foiEncontradoNoJSON = false;
        
        console.log(`  ⚠️ ${medicamento.nome} (${codItem}): Não encontrado no JSON - Mantendo estoque atual, Mov=0`);
        medicamentosZerados++;
      }

      // 7. Preparar dados para atualização
      const movimentacoesSemanais = medicamento.movimentacoes_semanais || {};
      
      // Adicionar ou sobrescrever movimentação semanal no índice calculado
      movimentacoesSemanais[indiceAnoSemana] = movimentacaoSemanal;

      // 8. Atualizar documento no Firestore
      // IMPORTANTE: Se não foi encontrado no JSON, NÃO atualiza o campo estoque
      const dadosParaAtualizar: any = {
        movimentacoes_semanais: movimentacoesSemanais,
        data_atualizacao: new Date()
      };

      // Só adiciona estoque ao update se foi encontrado no JSON
      if (foiEncontradoNoJSON && estoque !== undefined) {
        dadosParaAtualizar.estoque = estoque;
      }

      await medicamentoDoc.ref.update(dadosParaAtualizar);
    }

    // 9. Verificar se há medicamentos no processamento que não existem no banco
    for (const item of inventoryData.itens) {
      const nomeItemNormalizado = normalizarNome(item.descricao_item);
      const existeNoBanco = medicamentosSnapshot.docs.some(
        doc => {
          const nomeBancoNormalizado = normalizarNome(doc.data().nome || '');
          return nomeBancoNormalizado === nomeItemNormalizado;
        }
      );
      
      if (!existeNoBanco) {
        console.log(`  ⚠️ AVISO: Medicamento ${item.descricao_item} (${item.cod_sistemico_item}) existe no processamento mas não no banco`);
        medicamentosNaoEncontrados++;
      }
    }

    console.log(`\n✅ Atualização concluída com sucesso!`);
    console.log(`📊 Estatísticas:`);
    console.log(`   - Medicamentos atualizados: ${medicamentosAtualizados}`);
    console.log(`   - Medicamentos zerados (não movimentados): ${medicamentosZerados}`);
    console.log(`   - Medicamentos não encontrados no banco: ${medicamentosNaoEncontrados}`);
    console.log(`   - Semana calculada: ${indiceAnoSemana}`);

    return {
      sucesso: true,
      medicamentos_atualizados: medicamentosAtualizados,
      medicamentos_zerados: medicamentosZerados,
      medicamentos_nao_encontrados: medicamentosNaoEncontrados,
      semana_calculada: indiceAnoSemana
    };

  } catch (error) {
    console.error('❌ Erro ao atualizar estoque e movimentação semanal:', error);
    return {
      sucesso: false,
      medicamentos_atualizados: 0,
      medicamentos_zerados: 0,
      medicamentos_nao_encontrados: 0,
      semana_calculada: '',
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Atualiza estoque e movimentação para múltiplas unidades
 * 
 * @param inventoryDataPorUnidade - Mapa de unidades e seus inventoryData
 * @param municipioId - ID do município no Firestore
 * @returns Array com resultados de cada unidade
 */
export async function atualizarMultiplasUnidades(
  inventoryDataPorUnidade: { [unidade: string]: InventoryData },
  municipioId: string
): Promise<Array<{
  unidade: string;
  sucesso: boolean;
  medicamentos_atualizados: number;
  medicamentos_zerados: number;
  medicamentos_nao_encontrados: number;
  semana_calculada: string;
  erro?: string;
}>> {
  const resultados = [];

  for (const [unidade, inventoryData] of Object.entries(inventoryDataPorUnidade)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processando unidade: ${unidade}`);
    console.log('='.repeat(60));

    const resultado = await atualizarEstoqueEMovimentacaoSemanal(inventoryData, municipioId);
    
    resultados.push({
      unidade,
      ...resultado
    });
  }

  return resultados;
}

