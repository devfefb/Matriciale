import { db } from '../../config/firebase';

import { MedicamentoCalculado } from '../interfaces/interfaces-campos-calculados';
import { calcularCamposParaMedicamento } from '../core/calculosService';
import { prepararDadosParaCalculos, listarUnidadesDisponiveis } from '../core/preparar-dados-calculos';

// por enquanto executado com: npx ts-node "src/scripts/testes/[MAIN] executar-calculos.ts"

/**
 * Função principal para PREPARAR DADOS, CALCULAR e SALVAR os campos no Firestore.
 * 
 * FLUXO EM 2 ETAPAS:
 * 1. PREPARAÇÃO: Busca JSONs do Cloud Storage e insere estoque + movimentação no Firestore
 * 2. CÁLCULOS: Calcula os campos restantes com base nos dados já inseridos
 * 
 * @param municipioId - ID do município (ex: 'Palmares')
 * @param unidades - Array opcional com nomes das unidades. Se não fornecido, busca automaticamente
 */
export async function atualizarCamposCalculadosNoFirestore(
  municipioId: string, 
  unidades?: string[]
): Promise<any> {
  try {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║         INÍCIO DO PROCESSO DE ATUALIZAÇÃO DE CAMPOS              ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log(`📍 Município: ${municipioId}\n`);

    // ═══════════════════════════════════════════════════════════════════════
    // ETAPA 1: PREPARAÇÃO - Inserir estoque e movimentação do Cloud Storage
    // ═══════════════════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║  ETAPA 1: PREPARAÇÃO DOS DADOS (Estoque + Movimentação)          ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    // Se unidades não foram fornecidas, busca automaticamente do Cloud Storage
    if (!unidades || unidades.length === 0) {
      console.log('🔍 Buscando unidades disponíveis no Cloud Storage...');
      unidades = await listarUnidadesDisponiveis(municipioId);
      
      if (unidades.length === 0) {
        throw new Error(`Nenhuma unidade encontrada no Cloud Storage para ${municipioId}`);
      }
      
      console.log(`✅ Unidades encontradas: ${unidades.join(', ')}\n`);
    }

    // Preparar dados: buscar JSONs e inserir estoque + movimentação
    const resultadoPreparacao = await prepararDadosParaCalculos(municipioId, unidades);

    if (!resultadoPreparacao.sucesso) {
      throw new Error(`Erro na preparação de dados: ${resultadoPreparacao.erro}`);
    }

    console.log('\n✅ Etapa 1 concluída com sucesso!');
    console.log(`📊 Unidades processadas: ${resultadoPreparacao.unidades_processadas}`);
    console.log(`📊 Medicamentos atualizados: ${resultadoPreparacao.total_medicamentos_atualizados}`);
    console.log(`📊 Medicamentos zerados: ${resultadoPreparacao.total_medicamentos_zerados}\n`);

    // ═══════════════════════════════════════════════════════════════════════
    // ETAPA 2: CÁLCULOS - Calcular campos restantes
    // ═══════════════════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║  ETAPA 2: CÁLCULO DOS CAMPOS RESTANTES                            ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

      let totalProcessados = 0;
      let totalSucessos = 0;
      let totalErros = 0;

      // 1. Busca o município específico
      const municipioDoc = await db.collection('municipio').doc(municipioId).get();
      
      if (!municipioDoc.exists) {
        throw new Error(`Município com ID "${municipioId}" não encontrado`);
      }

      console.log(`Processando Município: ${municipioDoc.id}`);
      
      // 2. Busca unidades do município
      const unidadesSnapshot = await municipioDoc.ref.collection('unidades').get();

    // 2. Itera sobre Unidades
    for (const unidadeDoc of unidadesSnapshot.docs) {
      const medicamentosSnapshot = await unidadeDoc.ref.collection('medicamentos_unidade').get();
      console.log(`  Processando Unidade: ${unidadeDoc.id} (${medicamentosSnapshot.size} medicamentos)`);

      // 3. Itera sobre Medicamentos
      for (const medicamentoDoc of medicamentosSnapshot.docs) {
        totalProcessados++;
        const medicamento = medicamentoDoc.data() as MedicamentoCalculado;

        try {
          // 4. CHAMA A LÓGICA DE CÁLCULO JÁ VALIDADA
          const camposCalculados = await calcularCamposParaMedicamento(medicamento, unidadeDoc.id);

          // 5. FORMATA O OBJETO PARA SALVAR NO FIRESTORE
            const dadosParaSalvar = {
            // Mapeia as medianas (Md04, Md08, ...) como objetos
            medianas: {
              ...Object.entries(camposCalculados.medianas).reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
              }, {})
            },
            // Mapeia as contagens (Cont04, Cont08, ...) como objetos
            contagens: {
              ...Object.entries(camposCalculados.contagens).reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
              }, {})
            },

            "total_geral": camposCalculados.totalGeral,
            "maximo": camposCalculados.maximo,
            "metodo": camposCalculados.metodo,
            "met_est": camposCalculados.metEst,
            "estoque": camposCalculados.estoque,
            "reposicao": camposCalculados.reposicao,
            "tp_metodo": camposCalculados.tp_metodo,

            // Bônus: Salva a análise e a data do cálculo para rastreabilidade
            "analise_reposicao": camposCalculados.analise_reposicao,
            "data_ultimo_calculo": new Date().toISOString(),
            "ultima_semana_calculo": camposCalculados.ultimaSemana
            };

          // 6. ATUALIZA O DOCUMENTO NO FIRESTORE
          //    Usamos 'update' para adicionar/sobrescrever apenas estes campos.
          await medicamentoDoc.ref.update(dadosParaSalvar);

          console.log(`    ✅ Sucesso: ${medicamento.nome}`);
          totalSucessos++;

        } catch (error: any) {
          console.error(`    ❌ Erro ao processar ${medicamento.nome} (${unidadeDoc.id}):`, error.message);
          totalErros++;
        }
      }
    }

    // Relatório final
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║  PROCESSO CONCLUÍDO COM SUCESSO!                                  ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 RESUMO GERAL:');
    console.log('─'.repeat(70));
    console.log('ETAPA 1 - Preparação de Dados:');
    console.log(`  ✅ Unidades processadas: ${resultadoPreparacao.unidades_processadas}`);
    console.log(`  ✅ Medicamentos atualizados: ${resultadoPreparacao.total_medicamentos_atualizados}`);
    console.log(`  ⚠️  Medicamentos zerados: ${resultadoPreparacao.total_medicamentos_zerados}`);
    console.log('');
    console.log('ETAPA 2 - Cálculos:');
    console.log(`  ✅ Medicamentos processados: ${totalProcessados}`);
    console.log(`  ✅ Cálculos bem-sucedidos: ${totalSucessos}`);
    console.log(`  ❌ Erros: ${totalErros}`);
    console.log('─'.repeat(70));

    return {
      // Etapa 1
      preparacao: {
        unidades_processadas: resultadoPreparacao.unidades_processadas,
        medicamentos_atualizados: resultadoPreparacao.total_medicamentos_atualizados,
        medicamentos_zerados: resultadoPreparacao.total_medicamentos_zerados,
        resultados_por_unidade: resultadoPreparacao.resultados_por_unidade
      },
      // Etapa 2
      calculos: {
        totalProcessados,
        totalSucessos,
        totalErros
      },
      // Compatibilidade com versão anterior
      totalProcessados,
      totalSucessos,
      totalErros
    };

  } catch (error) {
    console.error('💥 Erro fatal durante a atualização:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  // passando Palmares como default para testes
  atualizarCamposCalculadosNoFirestore('Palmares')
    .then(() => {
      console.log('\n✅ Script de atualização executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na execução do script de atualização:', error);
      process.exit(1);
    });
}
