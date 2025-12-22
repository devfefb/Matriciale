import { bucket } from '../../config/firebase';
import { atualizarEstoqueEMovimentacaoSemanal } from '../inserir_semanas/atualizar-estoque-movimentacao';

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
 * ETAPA 1: Busca os JSONs de inventoryData do Cloud Storage e insere estoque + movimentação no Firestore
 * Esta função DEVE ser executada ANTES dos cálculos
 * 
 * @param municipio - Nome do município (ex: 'Palmares')
 * @param unidades - Array com nomes das unidades (ex: ['CAF', 'Olavo', 'ESF3'])
 * @returns Objeto com estatísticas do processamento
 */
export async function prepararDadosParaCalculos(
  municipio: string,
  unidades: string[]
): Promise<{
  sucesso: boolean;
  unidades_processadas: number;
  total_medicamentos_atualizados: number;
  total_medicamentos_zerados: number;
  resultados_por_unidade: Array<{
    unidade: string;
    sucesso: boolean;
    medicamentos_atualizados: number;
    medicamentos_zerados: number;
    semana_calculada: string;
    erro?: string;
  }>;
  erro?: string;
}> {
  try {
    console.log('🚀 [PREPARAR DADOS] Iniciando preparação de dados para cálculos...');
    console.log(`📍 Município: ${municipio}`);
    console.log(`🏥 Unidades: ${unidades.join(', ')}`);

    if (!bucket) {
      throw new Error('Cloud Storage não está configurado');
    }

    const resultadosPorUnidade = [];
    let totalMedicamentosAtualizados = 0;
    let totalMedicamentosZerados = 0;
    let unidadesProcessadas = 0;

    // Processar cada unidade
    for (const unidade of unidades) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🏥 Processando unidade: ${unidade}`);
      console.log('='.repeat(70));

      try {
        // 1. Buscar o JSON mais recente da unidade no Cloud Storage
        const inventoryData = await buscarInventoryDataDoBucket(municipio, unidade);

        if (!inventoryData) {
          console.log(`⚠️ Nenhum arquivo inventoryData encontrado para ${unidade}`);
          resultadosPorUnidade.push({
            unidade,
            sucesso: false,
            medicamentos_atualizados: 0,
            medicamentos_zerados: 0,
            semana_calculada: '',
            erro: 'Nenhum arquivo inventoryData encontrado'
          });
          continue;
        }

        console.log(`📥 Arquivo encontrado para ${unidade}`);
        console.log(`📅 Período: ${inventoryData.periodo_inicio} a ${inventoryData.periodo_fim}`);
        console.log(`📦 Total de itens: ${inventoryData.itens.length}`);

        // 2. Atualizar estoque e movimentação no Firestore
        const resultado = await atualizarEstoqueEMovimentacaoSemanal(inventoryData, municipio);

        if (resultado.sucesso) {
          totalMedicamentosAtualizados += resultado.medicamentos_atualizados;
          totalMedicamentosZerados += resultado.medicamentos_zerados;
          unidadesProcessadas++;
        }

        resultadosPorUnidade.push({
          unidade,
          sucesso: resultado.sucesso,
          medicamentos_atualizados: resultado.medicamentos_atualizados,
          medicamentos_zerados: resultado.medicamentos_zerados,
          semana_calculada: resultado.semana_calculada,
          erro: resultado.erro
        });

      } catch (error) {
        console.error(`❌ Erro ao processar unidade ${unidade}:`, error);
        resultadosPorUnidade.push({
          unidade,
          sucesso: false,
          medicamentos_atualizados: 0,
          medicamentos_zerados: 0,
          semana_calculada: '',
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('✅ Preparação de dados concluída!');
    console.log('='.repeat(70));
    console.log(`📊 Resumo:`);
    console.log(`   - Unidades processadas com sucesso: ${unidadesProcessadas}/${unidades.length}`);
    console.log(`   - Total de medicamentos atualizados: ${totalMedicamentosAtualizados}`);
    console.log(`   - Total de medicamentos zerados: ${totalMedicamentosZerados}`);

    return {
      sucesso: true,
      unidades_processadas: unidadesProcessadas,
      total_medicamentos_atualizados: totalMedicamentosAtualizados,
      total_medicamentos_zerados: totalMedicamentosZerados,
      resultados_por_unidade: resultadosPorUnidade
    };

  } catch (error) {
    console.error('❌ [PREPARAR DADOS] Erro fatal:', error);
    return {
      sucesso: false,
      unidades_processadas: 0,
      total_medicamentos_atualizados: 0,
      total_medicamentos_zerados: 0,
      resultados_por_unidade: [],
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Busca o arquivo inventoryData mais recente de uma unidade no Cloud Storage
 * 
 * @param municipio - Nome do município
 * @param unidade - Nome da unidade
 * @returns InventoryData ou null se não encontrado
 */
async function buscarInventoryDataDoBucket(
  municipio: string,
  unidade: string
): Promise<InventoryData | null> {
  try {
    if (!bucket) {
      throw new Error('Cloud Storage não está configurado');
    }

    // Caminho da pasta onde ficam os JSONs da unidade
    const prefixo = `uploads/${municipio}/${unidade}/inventoryData/`;
    
    console.log(`🔍 Buscando arquivos em: ${prefixo}`);

    // Listar todos os arquivos da pasta
    const [files] = await bucket.getFiles({ prefix: prefixo });

    if (files.length === 0) {
      console.log(`⚠️ Nenhum arquivo encontrado no caminho: ${prefixo}`);
      return null;
    }

    // Filtrar apenas arquivos JSON
    const jsonFiles = files.filter(file => file.name.endsWith('.json'));

    if (jsonFiles.length === 0) {
      console.log(`⚠️ Nenhum arquivo JSON encontrado no caminho: ${prefixo}`);
      return null;
    }

    // Ordenar por data de atualização (mais recente primeiro)
    // essa funcionalidade provavelmente dispensa que apaguemos os arquivos antigos, mas vamos manter por enquanto
    // penso que podemos manter, para evitar reprocessamento se necessário e manter um historico.
    // são arquivos bem pequenos, então não devemos ter problema de performance ou custo...
    jsonFiles.sort((a, b) => {
      const timeA = a.metadata.updated ? new Date(a.metadata.updated).getTime() : 0;
      const timeB = b.metadata.updated ? new Date(b.metadata.updated).getTime() : 0;
      return timeB - timeA;
    });

    // Pegar o arquivo mais recente
    const arquivoMaisRecente = jsonFiles[0];
    console.log(`📄 Arquivo mais recente: ${arquivoMaisRecente.name}`);

    // Baixar e parsear o JSON
    const [conteudo] = await arquivoMaisRecente.download();
    const inventoryData: InventoryData = JSON.parse(conteudo.toString());

    return inventoryData;

  } catch (error) {
    console.error(`❌ Erro ao buscar inventoryData para ${unidade}:`, error);
    throw error;
  }
}

/**
 * Busca as unidades disponíveis para um município no Cloud Storage
 * Útil para detectar automaticamente quais unidades têm dados
 * 
 * @param municipio - Nome do município
 * @returns Array com nomes das unidades encontradas
 */
export async function listarUnidadesDisponiveis(municipio: string): Promise<string[]> {
  try {
    if (!bucket) {
      throw new Error('Cloud Storage não está configurado');
    }

    const prefixo = `uploads/${municipio}/`;
    const [files] = await bucket.getFiles({ 
      prefix: prefixo,
      delimiter: '/'
    });

    // Extrair nomes de unidades dos caminhos
    const unidades = new Set<string>();
    
    for (const file of files) {
      const partes = file.name.split('/');
      if (partes.length >= 3) {
        const unidade = partes[2]; // uploads/Municipio/UNIDADE/...
        if (unidade && unidade !== '') {
          unidades.add(unidade);
        }
      }
    }

    const unidadesArray = Array.from(unidades);
    console.log(`🏥 Unidades encontradas para ${municipio}:`, unidadesArray);

    return unidadesArray;

  } catch (error) {
    console.error(`❌ Erro ao listar unidades:`, error);
    return [];
  }
}

