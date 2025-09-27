import { db } from '../../config/firebase';
import { DocumentSnapshot, QuerySnapshot } from 'firebase-admin/firestore';

/**
 * Script para atualizar o ID dos documentos baseado no campo cod_item existente
 * em todos os medicamentos de todas as unidades do município de Palmares
 */

interface MedicamentoData {
  [key: string]: any;
  cod_item?: string;
}

async function atualizarIdDocumentosPorCodItem(): Promise<void> {
  try {
    console.log('🚀 Iniciando script para atualizar IDs dos documentos baseado no cod_item...\n');

    // Caminho base para o município de Palmares
    const municipioPath = 'municipio/Palmares/unidades';
    
    // Buscar todas as unidades
    console.log('📋 Buscando todas as unidades do município de Palmares...');
    const unidadesSnapshot: QuerySnapshot = await db.collection(municipioPath).get();
    
    if (unidadesSnapshot.empty) {
      console.log('❌ Nenhuma unidade encontrada no município de Palmares');
      return;
    }

    console.log(`✅ Encontradas ${unidadesSnapshot.size} unidades\n`);

    let totalMedicamentosProcessados = 0;
    let totalMedicamentosAtualizados = 0;
    let totalMedicamentosSemCodItem = 0;
    let totalMedicamentosIdJaCorreto = 0;

    // Percorrer cada unidade
    for (const unidadeDoc of unidadesSnapshot.docs) {
      const nomeUnidade = unidadeDoc.id;
      console.log(`🏥 Processando unidade: ${nomeUnidade}`);

      // Caminho para a coleção de medicamentos da unidade
      const medicamentosPath = `${municipioPath}/${nomeUnidade}/medicamentos_unidade`;
      
      try {
        // Buscar todos os medicamentos da unidade
        const medicamentosSnapshot: QuerySnapshot = await db.collection(medicamentosPath).get();
        
        if (medicamentosSnapshot.empty) {
          console.log(`   ⚠️  Nenhum medicamento encontrado na unidade ${nomeUnidade}`);
          continue;
        }

        console.log(`   📦 Encontrados ${medicamentosSnapshot.size} medicamentos na unidade ${nomeUnidade}`);

        // Processar cada medicamento
        for (const medicamentoDoc of medicamentosSnapshot.docs) {
          const medicamentoIdAtual = medicamentoDoc.id;
          const medicamentoData = medicamentoDoc.data() as MedicamentoData;
          
          totalMedicamentosProcessados++;

          // Verificar se o campo cod_item existe
          if (!medicamentoData.cod_item) {
            console.log(`   ⚠️  Medicamento ${medicamentoIdAtual} não possui campo cod_item - pulando`);
            totalMedicamentosSemCodItem++;
            continue;
          }

          const codItemValue = medicamentoData.cod_item.toString();

          // Verificar se o ID do documento já é igual ao cod_item
          if (medicamentoIdAtual === codItemValue) {
            console.log(`   ✅ Medicamento ${medicamentoIdAtual} já tem ID correto (igual ao cod_item)`);
            totalMedicamentosIdJaCorreto++;
            continue;
          }

          // Atualizar o ID do documento criando um novo documento com o cod_item como ID
          console.log(`   🔄 Atualizando ID do medicamento de "${medicamentoIdAtual}" para "${codItemValue}"...`);
          
          try {
            // Criar novo documento com o cod_item como ID
            const novoDocRef = db.collection(medicamentosPath).doc(codItemValue);
            await novoDocRef.set(medicamentoData);

            // Deletar o documento antigo
            await medicamentoDoc.ref.delete();

            totalMedicamentosAtualizados++;
            console.log(`   ✅ Medicamento atualizado: ID "${medicamentoIdAtual}" → "${codItemValue}"`);

          } catch (updateError) {
            console.error(`   ❌ Erro ao atualizar medicamento ${medicamentoIdAtual}:`, updateError);
            // Verificar se o erro é por documento já existir
            if ((updateError as any).code === 6) { // ALREADY_EXISTS
              console.log(`   ⚠️  Documento com ID "${codItemValue}" já existe - pulando atualização`);
            }
          }
        }

        console.log(`   📊 Unidade ${nomeUnidade}: ${medicamentosSnapshot.size} medicamentos processados\n`);

      } catch (error) {
        console.error(`   ❌ Erro ao processar medicamentos da unidade ${nomeUnidade}:`, error);
        continue;
      }
    }

    // Relatório final
    console.log('📈 RELATÓRIO FINAL:');
    console.log(`   • Total de medicamentos processados: ${totalMedicamentosProcessados}`);
    console.log(`   • Total de medicamentos atualizados: ${totalMedicamentosAtualizados}`);
    console.log(`   • Medicamentos sem cod_item: ${totalMedicamentosSemCodItem}`);
    console.log(`   • Medicamentos com ID já correto: ${totalMedicamentosIdJaCorreto}`);
    console.log('\n✅ Script executado com sucesso!');

  } catch (error) {
    console.error('❌ Erro fatal durante a execução do script:', error);
    process.exit(1);
  }
}

// Função principal
async function main(): Promise<void> {
  try {
    await atualizarIdDocumentosPorCodItem();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na execução principal:', error);
    process.exit(1);
  }
}

// Executar apenas se este arquivo for executado diretamente
if (require.main === module) {
  main();
}

export { atualizarIdDocumentosPorCodItem };
