import { db } from '../../config/firebase';

import { MedicamentoCalculado } from '../interfaces/interfaces-campos-calculados';
import { calcularCamposParaMedicamento } from '../core/calculosService';

// por enquanto executado com: npx ts-node "src/scripts/testes/[MAIN] executar-calculos.ts"

// essa função nao atualiza o array de movimentacoes semanais com o valor correspondente da semana atual; isso pois para fins de testes
// nós inserimos a semana atual no banco manualmente. contudo, no fluxo normal, essa atualização é feita ANTES DE QUALQUER COISA.
// ao implementar essa inserção inicial automática, lembre-se de atualizar esse script para refletir isso. alem disso, nao se esquecer
// de inserir como 0 o valor para aquela semana de medicamentos não encontrados.
/**
 * Função principal para CALCULAR e SALVAR os campos no Firestore.
 */
export async function atualizarCamposCalculadosNoFirestore(municipioId: string): Promise<any> {
  try {
    console.log('🚀 Iniciando atualização dos campos calculados no Firestore...');

      // Busca dados do Firebase
      let totalProcessados = 0;
      let totalSucessos = 0;
      let totalErros = 0;

      // 1. Busca o município específico
      const municipioDoc = await db.collection('municipio').doc(municipioId).get();
      
      if (!municipioDoc.exists) {
        throw new Error(`Município com ID "${municipioId}" não encontrado`);
      }

      console.log(`\nProcessando Município: ${municipioDoc.id}`);
      
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
    console.log('\n🎉 Atualização concluída!');
    console.log('📊 Estatísticas finais:');
    console.log(`  Total de medicamentos verificados: ${totalProcessados}`);
    console.log(`  ✅ Atualizados com sucesso: ${totalSucessos}`);
    console.log(`  ❌ Falharam: ${totalErros}`);

    return {
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
