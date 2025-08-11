import { db } from '../config/firebase';
import { 
  Medicamento, 
  Unidade, 
  Cidade, 
  DadosCompletos, 
  MedicamentoFirebase 
} from './interfaces';
import { 
  processarMovimentacoes, 
  carregarDados 
} from './utils';

// Função para inserir medicamento em uma unidade
async function inserirMedicamento(unidadeRef: FirebaseFirestore.DocumentReference, medicamento: Medicamento): Promise<boolean> {
  try {
    const medicamentoData: MedicamentoFirebase = {
      nome: medicamento.nome,
      cod_item: medicamento.cod_item,
      classificacao: medicamento.classificacao,
      movimentacoes_semanais: processarMovimentacoes(medicamento.movimentacoes_semanais),
      data_criacao: new Date(),
      data_atualizacao: new Date()
    };

    // Usar ID gerado automaticamente pelo Firebase
    const docRef = await unidadeRef.collection('medicamentos_unidade').add(medicamentoData);
    
    console.log(`✅ Medicamento inserido: ${medicamento.nome} (${medicamento.cod_item}) - ID: ${docRef.id}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao inserir medicamento ${medicamento.nome}:`, error);
    return false;
  }
}

// Função para processar uma unidade
async function processarUnidade(municipioRef: FirebaseFirestore.DocumentReference, unidade: Unidade): Promise<{ sucessos: number; erros: number }> {
  try {
    console.log(`\n🏥 Processando unidade: ${unidade.nome}`);
    
    // Criar ou atualizar documento da unidade
    const unidadeRef = municipioRef.collection('unidades').doc(unidade.nome);
    await unidadeRef.set({
      nome: unidade.nome,
      data_criacao: new Date(),
      data_atualizacao: new Date()
    }, { merge: true });

    // Inserir medicamentos da unidade
    let sucessos = 0;
    let erros = 0;
    
    for (const medicamento of unidade.medicamentos) {
      const resultado = await inserirMedicamento(unidadeRef, medicamento);
      if (resultado) {
        sucessos++;
      } else {
        erros++;
      }
    }
    
    console.log(`📊 Unidade ${unidade.nome}: ${sucessos} medicamentos inseridos, ${erros} erros`);
    return { sucessos, erros };
  } catch (error) {
    console.error(`❌ Erro ao processar unidade ${unidade.nome}:`, error);
    return { sucessos: 0, erros: unidade.medicamentos.length };
  }
}

// Função para processar um município
async function processarMunicipio(municipio: Cidade): Promise<{ sucessos: number; erros: number }> {
  try {
    console.log(`\n🏙️ Processando município: ${municipio.nome}`);
    
    // Criar ou atualizar documento do município
    const municipioRef = db.collection('municipio').doc(municipio.nome);
    await municipioRef.set({
      nome: municipio.nome,
      data_criacao: new Date(),
      data_atualizacao: new Date()
    }, { merge: true });

    let totalSucessos = 0;
    let totalErros = 0;
    
    // Processar cada unidade do município
    for (const unidade of municipio.unidades) {
      const resultado = await processarUnidade(municipioRef, unidade);
      totalSucessos += resultado.sucessos;
      totalErros += resultado.erros;
    }
    
    console.log(`📈 Município ${municipio.nome}: Total de ${totalSucessos} medicamentos inseridos, ${totalErros} erros`);
    return { sucessos: totalSucessos, erros: totalErros };
  } catch (error) {
    console.error(`❌ Erro ao processar município ${municipio.nome}:`, error);
    return { sucessos: 0, erros: 0 };
  }
}

// Função principal
export async function inserirDadosNoFirebase(): Promise<void> {
  try {
    console.log('🚀 Iniciando inserção de dados no Firebase...');
    
    // Carregar dados
    const dados = carregarDados();
    console.log(`📁 Arquivo carregado com ${dados.cidades.length} município(s)`);
    
    let totalGeralSucessos = 0;
    let totalGeralErros = 0;
    
    // Processar cada município
    for (const municipio of dados.cidades) {
      const resultado = await processarMunicipio(municipio);
      totalGeralSucessos += resultado.sucessos;
      totalGeralErros += resultado.erros;
    }
    
    console.log('\n🎉 Processamento concluído!');
    console.log(`📊 Resumo final:`);
    console.log(`   ✅ Total de medicamentos inseridos: ${totalGeralSucessos}`);
    console.log(`   ❌ Total de erros: ${totalGeralErros}`);
    console.log(`   📈 Taxa de sucesso: ${((totalGeralSucessos / (totalGeralSucessos + totalGeralErros)) * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('💥 Erro fatal durante o processamento:', error);
    throw error;
  }
}

// Exportar funções para uso em outros módulos
export {
  processarMunicipio,
  processarUnidade,
  inserirMedicamento
};
