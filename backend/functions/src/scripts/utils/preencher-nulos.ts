import { db } from '../../config/firebase';

// --- CONFIGURAÇÕES ---
const SEMANA_ALVO = '2025_22';

// --- FUNÇÕES DE PREENCHIMENTO ---

/**
 * Verifica se a semana alvo existe no objeto de movimentações
 */
function semanaExiste(movimentacoes: { [key: string]: number }): boolean {
  return movimentacoes && typeof movimentacoes === 'object' && SEMANA_ALVO in movimentacoes;
}

/**
 * Preenche a semana alvo com valor zero se ela não existir
 */
async function preencherSemanaMedicamento(
  medicamentoRef: FirebaseFirestore.DocumentReference
): Promise<{ preenchido: boolean; nome: string }> {
  try {
    const doc = await medicamentoRef.get();
    if (!doc.exists) {
      console.log(`❌ Medicamento não encontrado: ${medicamentoRef.id}`);
      return { preenchido: false, nome: 'N/A' };
    }

    const medicamento = doc.data();
    const movimentacoesAtuais = medicamento?.movimentacoes_semanais || {};

    // Verifica se a semana já existe
    if (semanaExiste(movimentacoesAtuais)) {
      console.log(`⏭️ Semana ${SEMANA_ALVO} já existe para: ${medicamento?.nome} (valor: ${movimentacoesAtuais[SEMANA_ALVO]})`);
      return { preenchido: false, nome: medicamento?.nome || 'N/A' };
    }

    // Adiciona a semana com valor zero
    movimentacoesAtuais[SEMANA_ALVO] = 0;

    // Atualiza o documento
    await medicamentoRef.update({
      movimentacoes_semanais: movimentacoesAtuais,
      data_atualizacao: new Date()
    });

    console.log(`✅ Semana ${SEMANA_ALVO} preenchida com zero para: ${medicamento?.nome}`);
    return { preenchido: true, nome: medicamento?.nome || 'N/A' };

  } catch (error) {
    console.error(`❌ Erro ao preencher semana no medicamento ${medicamentoRef.id}:`, error);
    return { preenchido: false, nome: 'N/A' };
  }
}

/**
 * Processa todos os medicamentos de uma unidade
 */
async function processarUnidade(unidadeRef: FirebaseFirestore.DocumentReference): Promise<{ 
  sucessos: number; 
  erros: number; 
  jaExiste: number;
  nomeUnidade: string;
}> {
  try {
    const unidadeDoc = await unidadeRef.get();
    const nomeUnidade = unidadeDoc.data()?.nome || unidadeRef.id;
    
    console.log(`\n🏥 Processando unidade: ${nomeUnidade}`);
    
    // Busca todos os medicamentos da unidade
    const medicamentosSnapshot = await unidadeRef.collection('medicamentos_unidade').get();
    
    console.log(`💊 Processando ${medicamentosSnapshot.docs.length} medicamentos...`);
    
    let sucessos = 0;
    let erros = 0;
    let jaExiste = 0;

    // Processa cada medicamento
    for (const medicamentoDoc of medicamentosSnapshot.docs) {
      try {
        const resultado = await preencherSemanaMedicamento(medicamentoDoc.ref);
        
        if (resultado.preenchido) {
          sucessos++;
        } else if (resultado.nome !== 'N/A') {
          jaExiste++;
        } else {
          erros++;
        }
      } catch (error) {
        console.error(`❌ Erro ao processar medicamento ${medicamentoDoc.id}:`, error);
        erros++;
      }
    }

    console.log(`📊 Unidade ${nomeUnidade}: ${sucessos} preenchidos, ${jaExiste} já existiam, ${erros} erros`);
    return { sucessos, erros, jaExiste, nomeUnidade };

  } catch (error) {
    console.error(`❌ Erro ao processar unidade ${unidadeRef.id}:`, error);
    return { sucessos: 0, erros: 0, jaExiste: 0, nomeUnidade: unidadeRef.id };
  }
}

/**
 * Processa todos os municípios
 */
async function processarMunicipios(): Promise<void> {
  try {
    console.log('🚀 Iniciando preenchimento da semana 2025_22...');
    console.log(`📅 Semana alvo: ${SEMANA_ALVO}\n`);
    
    // Busca todos os municípios
    const municipiosSnapshot = await db.collection('municipio').get();
    
    if (municipiosSnapshot.empty) {
      console.log('⚠️ Nenhum município encontrado no banco de dados');
      return;
    }

    let totalSucessos = 0;
    let totalErros = 0;
    let totalJaExiste = 0;
    let totalUnidades = 0;

    // Processa cada município
    for (const municipioDoc of municipiosSnapshot.docs) {
      const municipio = municipioDoc.data();
      console.log(`\n🏙️ Processando município: ${municipio.nome}`);
      
      // Busca todas as unidades do município
      const unidadesSnapshot = await municipioDoc.ref.collection('unidades').get();
      
      if (unidadesSnapshot.empty) {
        console.log(`⚠️ Nenhuma unidade encontrada no município ${municipio.nome}`);
        continue;
      }

      // Processa cada unidade
      for (const unidadeDoc of unidadesSnapshot.docs) {
        totalUnidades++;
        const resultado = await processarUnidade(unidadeDoc.ref);
        totalSucessos += resultado.sucessos;
        totalErros += resultado.erros;
        totalJaExiste += resultado.jaExiste;
      }
    }

    // Exibe relatório final
    console.log('\n🎉 Processamento concluído!');
    console.log(`📊 Resumo final:`);
    console.log(`   🏙️ Total de municípios processados: ${municipiosSnapshot.docs.length}`);
    console.log(`   🏥 Total de unidades processadas: ${totalUnidades}`);
    console.log(`   ✅ Total de semanas preenchidas: ${totalSucessos}`);
    console.log(`   ⏭️ Total de semanas que já existiam: ${totalJaExiste}`);
    console.log(`   ❌ Total de erros: ${totalErros}`);
    
    const totalProcessados = totalSucessos + totalJaExiste + totalErros;
    if (totalProcessados > 0) {
      console.log(`   📈 Taxa de preenchimento: ${((totalSucessos / totalProcessados) * 100).toFixed(2)}%`);
    }

    if (totalSucessos > 0) {
      console.log(`\n✅ ${totalSucessos} medicamentos tiveram a semana ${SEMANA_ALVO} preenchida com valor zero`);
    }
    
    if (totalJaExiste > 0) {
      console.log(`⏭️ ${totalJaExiste} medicamentos já possuíam a semana ${SEMANA_ALVO} (preservados)`);
    }

  } catch (error) {
    console.error('💥 Erro fatal durante o processamento:', error);
    throw error;
  }
}

// --- FUNÇÃO PRINCIPAL ---
export async function preencherSemana2025_22(): Promise<void> {
  try {
    await processarMunicipios();
  } catch (error) {
    console.error('💥 Erro na execução do script:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  preencherSemana2025_22()
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na execução do script:', error);
      process.exit(1);
    });
}
