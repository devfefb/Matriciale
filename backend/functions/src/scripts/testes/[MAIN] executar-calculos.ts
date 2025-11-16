import { db } from '../../config/firebase';

import { MedicamentoCalculado } from '../interfaces/interfaces-campos-calculados';
import { calcularCamposParaMedicamento } from '../core/calculosService';

/**
 * Função principal para CALCULAR e SALVAR os campos no Firestore.
 */
export async function atualizarCamposCalculadosNoFirestore(): Promise<any> {
  try {
    console.log('🚀 Iniciando atualização dos campos calculados no Firestore...');

    // Busca dados do Firebase
    const municipiosSnapshot = await db.collection('municipio').get();

    let totalProcessados = 0;
    let totalSucessos = 0;
    let totalErros = 0;

    // 1. Itera sobre Municípios
    for (const municipioDoc of municipiosSnapshot.docs) {
      const unidadesSnapshot = await municipioDoc.ref.collection('unidades').get();
      console.log(`\nProcessando Município: ${municipioDoc.id}`);

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
            //    (Usando os nomes exatos que você listou)
            const dadosParaSalvar = {
              // Espalha as medianas (Md04, Md08, ...)
              ...camposCalculados.medianas,
              // Espalha as contagens (Cont04, Cont08, ...)
              ...camposCalculados.contagens,

              "Total Geral": camposCalculados.totalGeral,
              "Máximo": camposCalculados.maximo,
              "Metodo": camposCalculados.metodo,
              "MetEst": camposCalculados.metEst,
              "Estoque": camposCalculados.estoque,
              "Reposição": camposCalculados.reposicao,
              "TP_Metodo": camposCalculados.tp_metodo,

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
  atualizarCamposCalculadosNoFirestore()
    .then(() => {
      console.log('\n✅ Script de atualização executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na execução do script de atualização:', error);
      process.exit(1);
    });
}