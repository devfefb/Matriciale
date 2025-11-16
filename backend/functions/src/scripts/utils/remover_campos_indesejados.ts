// Importe o 'db' (como no seu script original) e o 'FieldValue'
import { db } from '../../config/firebase';
import { FieldValue } from 'firebase-admin/firestore'; // (Se estiver usando o Admin SDK)
// Se estiver usando o SDK v9 modular, a importação seria:
// import { deleteField } from "firebase/firestore"; 
// e o uso seria apenas deleteField()

// --- CONFIGURAÇÕES ---
const CAMPOS_A_DELETAR = [
  'Cont04', 'Cont08', 'Cont12', 'Cont16', 'Cont26', 'Cont52', 'ContAno', 'ContTt', 'Md04', 'Md08', 'Md12', 'Md16', 'Md26', 'Md52', 'MdAno', 'MdTt',
  'MetEst', 'metEst', 'Metodo', 'Máximo', 'Reposição', 'TP_Metodo', 'Total Geral',
  'totalGeral', 'analise_reposicao', 'Estoque'
];

// --- FUNÇÕES DE LIMPEZA ---

/**
 * Remove os campos especificados de um documento de medicamento
 */
async function limparCamposMedicamento(
  medicamentoRef: FirebaseFirestore.DocumentReference
): Promise<{ camposDeletados: number; nome: string }> {
  try {
    const doc = await medicamentoRef.get();
    if (!doc.exists) {
      console.log(`❌ Medicamento não encontrado: ${medicamentoRef.id}`);
      return { camposDeletados: 0, nome: 'N/A' };
    }

    const medicamento = doc.data();
    const nomeMedicamento = medicamento?.nome || 'N/A';
    
    // Cria um objeto para a atualização
    const camposParaAtualizar: { [key: string]: any } = {};
    let camposEncontrados = 0;

    // Verifica quais campos da lista existem no documento
    for (const campo of CAMPOS_A_DELETAR) {
      // Verifica se o campo existe no documento
      if (Object.prototype.hasOwnProperty.call(medicamento, campo)) {
        // Adiciona a operação de deleção para este campo
        // Para o Admin SDK, usamos FieldValue.delete()
        camposParaAtualizar[campo] = FieldValue.delete(); 
        // Se usar o SDK v9 modular, seria:
        // camposParaAtualizar[campo] = deleteField();
        
        camposEncontrados++;
      }
    }

    // Se encontramos campos para deletar, executa a atualização
    if (camposEncontrados > 0) {
      await medicamentoRef.update(camposParaAtualizar);
      console.log(`✅ [${nomeMedicamento}] ${camposEncontrados} campos deletados.`);
      return { camposDeletados: camposEncontrados, nome: nomeMedicamento };
    } else {
      // Se não houver campos, não faz nada
      console.log(`⏭️ [${nomeMedicamento}] Nenhum dos campos foi encontrado.`);
      return { camposDeletados: 0, nome: nomeMedicamento };
    }

  } catch (error) {
    console.error(`❌ Erro ao limpar campos no medicamento ${medicamentoRef.id}:`, error);
    return { camposDeletados: 0, nome: 'N/A' };
  }
}

/**
 * Processa todos os medicamentos de uma unidade
 */
async function processarUnidade(unidadeRef: FirebaseFirestore.DocumentReference): Promise<{ 
  totalCamposDeletados: number; 
  medicamentosAtualizados: number;
  medicamentosSemCampos: number;
  erros: number; 
  nomeUnidade: string;
}> {
  let totalCamposDeletados = 0;
  let medicamentosAtualizados = 0;
  let medicamentosSemCampos = 0;
  let erros = 0;
  let nomeUnidade = unidadeRef.id;

  try {
    const unidadeDoc = await unidadeRef.get();
    nomeUnidade = unidadeDoc.data()?.nome || unidadeRef.id;
    
    console.log(`\n🏥 Processando unidade: ${nomeUnidade}`);
    
    const medicamentosSnapshot = await unidadeRef.collection('medicamentos_unidade').get();
    console.log(`💊 Processando ${medicamentosSnapshot.docs.length} medicamentos...`);
    
    for (const medicamentoDoc of medicamentosSnapshot.docs) {
      try {
        const resultado = await limparCamposMedicamento(medicamentoDoc.ref);
        
        if (resultado.nome === 'N/A') {
          erros++;
        } else if (resultado.camposDeletados > 0) {
          medicamentosAtualizados++;
          totalCamposDeletados += resultado.camposDeletados;
        } else {
          medicamentosSemCampos++;
        }
      } catch (error) {
        console.error(`❌ Erro ao processar medicamento ${medicamentoDoc.id}:`, error);
        erros++;
      }
    }

    console.log(`📊 Unidade ${nomeUnidade}: ${medicamentosAtualizados} atualizados, ${medicamentosSemCampos} sem campos, ${erros} erros.`);
    return { totalCamposDeletados, medicamentosAtualizados, medicamentosSemCampos, erros, nomeUnidade };

  } catch (error) {
    console.error(`❌ Erro ao processar unidade ${unidadeRef.id}:`, error);
    return { totalCamposDeletados, medicamentosAtualizados, medicamentosSemCampos, erros, nomeUnidade };
  }
}

/**
 * Processa todos os municípios
 */
async function processarMunicipios(): Promise<void> {
  try {
    console.log('🚀 Iniciando script de limpeza de campos...');
    
    const municipiosSnapshot = await db.collection('municipio').get();
    
    if (municipiosSnapshot.empty) {
      console.log('⚠️ Nenhum município encontrado no banco de dados');
      return;
    }

    let totalCamposDeletadosGeral = 0;
    let totalMedicamentosAtualizados = 0;
    let totalMedicamentosSemCampos = 0;
    let totalErros = 0;
    let totalUnidades = 0;

    for (const municipioDoc of municipiosSnapshot.docs) {
      const municipio = municipioDoc.data();
      console.log(`\n🏙️ Processando município: ${municipio.nome}`);
      
      const unidadesSnapshot = await municipioDoc.ref.collection('unidades').get();
      
      if (unidadesSnapshot.empty) {
        console.log(`⚠️ Nenhuma unidade encontrada no município ${municipio.nome}`);
        continue;
      }

      for (const unidadeDoc of unidadesSnapshot.docs) {
        totalUnidades++;
        const resultado = await processarUnidade(unidadeDoc.ref);
        totalCamposDeletadosGeral += resultado.totalCamposDeletados;
        totalMedicamentosAtualizados += resultado.medicamentosAtualizados;
        totalMedicamentosSemCampos += resultado.medicamentosSemCampos;
        totalErros += resultado.erros;
      }
    }

    // Exibe relatório final
    console.log('\n🎉 Processamento concluído!');
    console.log(`📊 Resumo final da limpeza:`);
    console.log(`   🏙️ Total de municípios processados: ${municipiosSnapshot.docs.length}`);
    console.log(`   🏥 Total de unidades processadas: ${totalUnidades}`);
    console.log(`   ✅ Total de medicamentos atualizados: ${totalMedicamentosAtualizados}`);
    console.log(`   ⏭️ Total de medicamentos sem campos: ${totalMedicamentosSemCampos}`);
    console.log(`   ❌ Total de erros: ${totalErros}`);
    console.log(`   🗑️ Total de campos deletados (geral): ${totalCamposDeletadosGeral}`);
    
  } catch (error) {
    console.error('💥 Erro fatal durante o processamento:', error);
    throw error;
  }
}

// --- FUNÇÃO PRINCIPAL ---
export async function executarLimpezaCampos(): Promise<void> {
  try {
    await processarMunicipios();
  } catch (error) {
    console.error('💥 Erro na execução do script:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  executarLimpezaCampos()
    .then(() => {
      console.log('\n✅ Script de limpeza executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na execução do script:', error);
      process.exit(1);
    });
}