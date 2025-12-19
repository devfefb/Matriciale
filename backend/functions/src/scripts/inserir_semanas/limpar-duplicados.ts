import { db } from '../../config/firebase';
import * as fs from 'fs';
import * as path from 'path';

// Interface para representar um medicamento duplicado
interface MedicamentoDuplicado {
  id: string;
  nome: string;
  cod_item: string;
  movimentacoes_semanais: { [key: string]: number };
  completude: number;
  temIntervaloCompleto: boolean;
  intervaloEncontrado: string;
}

// Interface para o relatório de uma unidade
interface RelatorioUnidade {
  municipio: string;
  unidade: string;
  totalMedicamentos: number;
  medicamentosDuplicados: {
    nomeMedicamento: string;
    totalDuplicatas: number;
    medicamentoMantido: {
      id: string;
      cod_item: string;
      completude: number;
      temIntervaloCompleto: boolean;
      intervaloEncontrado: string;
      justificativa: string;
    };
    medicamentosExcluidos: Array<{
      id: string;
      cod_item: string;
      completude: number;
      temIntervaloCompleto: boolean;
      intervaloEncontrado: string;
    }>;
  }[];
}

// Interface para o relatório geral
interface RelatorioGeral {
  dataExecucao: string;
  modo: 'teste' | 'execucao';
  totalMunicipios: number;
  totalUnidades: number;
  totalMedicamentosAnalisados: number;
  totalDuplicatasEncontradas: number;
  totalMedicamentosExcluidos: number;
  unidades: RelatorioUnidade[];
}

/**
 * Gera o intervalo ideal de semanas (2023_37 até 2025_46)
 */
function gerarIntervaloIdeal(): string[] {
  const semanas: string[] = [];
  
  // 2023: semanas 37-52
  for (let i = 37; i <= 52; i++) {
    semanas.push(`2023_${i}`);
  }
  
  // 2024: semanas 1-52
  for (let i = 1; i <= 52; i++) {
    semanas.push(`2024_${i}`);
  }
  
  // 2025: semanas 1-46
  for (let i = 1; i <= 46; i++) {
    semanas.push(`2025_${i}`);
  }
  
  return semanas;
}

/**
 * Calcula a completude das movimentações semanais
 * Retorna o percentual de semanas presentes no intervalo ideal
 */
function calcularCompletude(movimentacoes: { [key: string]: number }): {
  completude: number;
  temIntervaloCompleto: boolean;
  intervaloEncontrado: string;
} {
  const intervaloIdeal = gerarIntervaloIdeal();
  const chaves = Object.keys(movimentacoes);
  
  // Contar quantas semanas do intervalo ideal estão presentes
  const semanasPresentes = intervaloIdeal.filter(semana => chaves.includes(semana));
  const completude = (semanasPresentes.length / intervaloIdeal.length) * 100;
  
  // Verificar se tem o intervalo completo
  const temIntervaloCompleto = semanasPresentes.length === intervaloIdeal.length;
  
  // Identificar o intervalo encontrado
  let intervaloEncontrado = 'vazio';
  if (chaves.length > 0) {
    const chavesSemana = chaves
      .filter(k => k.match(/^\d{4}_\d+$/))
      .sort();
    
    if (chavesSemana.length > 0) {
      const primeira = chavesSemana[0];
      const ultima = chavesSemana[chavesSemana.length - 1];
      intervaloEncontrado = `${primeira} a ${ultima} (${chaves.length} semanas)`;
    }
  }
  
  return {
    completude,
    temIntervaloCompleto,
    intervaloEncontrado
  };
}

/**
 * Identifica qual medicamento deve ser mantido entre duplicatas
 */
function identificarMedicamentoParaManter(medicamentos: MedicamentoDuplicado[]): {
  mantido: MedicamentoDuplicado;
  excluidos: MedicamentoDuplicado[];
  justificativa: string;
} {
  // Ordenar por:
  // 1. Se tem intervalo completo (prioridade máxima)
  // 2. Completude (percentual de semanas presentes)
  // 3. Total de movimentações (desempate)
  const ordenados = [...medicamentos].sort((a, b) => {
    // Prioridade 1: intervalo completo
    if (a.temIntervaloCompleto && !b.temIntervaloCompleto) return -1;
    if (!a.temIntervaloCompleto && b.temIntervaloCompleto) return 1;
    
    // Prioridade 2: completude
    if (a.completude !== b.completude) return b.completude - a.completude;
    
    // Prioridade 3: total de movimentações
    return Object.keys(b.movimentacoes_semanais).length - Object.keys(a.movimentacoes_semanais).length;
  });
  
  const mantido = ordenados[0];
  const excluidos = ordenados.slice(1);
  
  // Gerar justificativa
  let justificativa = '';
  if (mantido.temIntervaloCompleto) {
    justificativa = `Possui intervalo completo (2023_37 até 2025_46) - 100% de completude`;
  } else {
    justificativa = `Maior completude (${mantido.completude.toFixed(2)}%) com ${Object.keys(mantido.movimentacoes_semanais).length} semanas`;
  }
  
  return { mantido, excluidos, justificativa };
}

/**
 * Processa uma unidade e identifica duplicatas
 */
async function processarUnidade(
  municipioNome: string,
  unidadeNome: string,
  unidadeRef: FirebaseFirestore.DocumentReference
): Promise<RelatorioUnidade> {
  console.log(`\n  🏥 Processando unidade: ${unidadeNome}`);
  
  const relatorio: RelatorioUnidade = {
    municipio: municipioNome,
    unidade: unidadeNome,
    totalMedicamentos: 0,
    medicamentosDuplicados: []
  };
  
  try {
    // Buscar todos os medicamentos da unidade
    const medicamentosSnapshot = await unidadeRef.collection('medicamentos_unidade').get();
    relatorio.totalMedicamentos = medicamentosSnapshot.size;
    
    console.log(`     📦 Total de medicamentos: ${medicamentosSnapshot.size}`);
    
    // Agrupar por nome
    const medicamentosPorNome = new Map<string, MedicamentoDuplicado[]>();
    
    medicamentosSnapshot.forEach(doc => {
      const data = doc.data();
      const nome = data.nome;
      
      if (!nome) {
        console.warn(`     ⚠️ Medicamento sem nome encontrado (ID: ${doc.id})`);
        return;
      }
      
      const analise = calcularCompletude(data.movimentacoes_semanais || {});
      
      const medicamento: MedicamentoDuplicado = {
        id: doc.id,
        nome: nome,
        cod_item: data.cod_item || 'sem_codigo',
        movimentacoes_semanais: data.movimentacoes_semanais || {},
        completude: analise.completude,
        temIntervaloCompleto: analise.temIntervaloCompleto,
        intervaloEncontrado: analise.intervaloEncontrado
      };
      
      if (!medicamentosPorNome.has(nome)) {
        medicamentosPorNome.set(nome, []);
      }
      medicamentosPorNome.get(nome)!.push(medicamento);
    });
    
    // Identificar duplicatas (medicamentos com mesmo nome)
    let totalDuplicatas = 0;
    for (const [nome, medicamentos] of medicamentosPorNome.entries()) {
      if (medicamentos.length > 1) {
        totalDuplicatas++;
        console.log(`     🔍 Duplicata encontrada: "${nome}" (${medicamentos.length} ocorrências)`);
        
        const { mantido, excluidos, justificativa } = identificarMedicamentoParaManter(medicamentos);
        
        console.log(`        ✅ Mantido: ID ${mantido.id} - ${justificativa}`);
        console.log(`        ❌ Excluídos: ${excluidos.length} documentos`);
        
        relatorio.medicamentosDuplicados.push({
          nomeMedicamento: nome,
          totalDuplicatas: medicamentos.length,
          medicamentoMantido: {
            id: mantido.id,
            cod_item: mantido.cod_item,
            completude: mantido.completude,
            temIntervaloCompleto: mantido.temIntervaloCompleto,
            intervaloEncontrado: mantido.intervaloEncontrado,
            justificativa
          },
          medicamentosExcluidos: excluidos.map(med => ({
            id: med.id,
            cod_item: med.cod_item,
            completude: med.completude,
            temIntervaloCompleto: med.temIntervaloCompleto,
            intervaloEncontrado: med.intervaloEncontrado
          }))
        });
      }
    }
    
    if (totalDuplicatas === 0) {
      console.log(`     ✨ Nenhuma duplicata encontrada nesta unidade`);
    } else {
      console.log(`     📊 Total de duplicatas: ${totalDuplicatas}`);
    }
    
  } catch (error) {
    console.error(`     ❌ Erro ao processar unidade ${unidadeNome}:`, error);
  }
  
  return relatorio;
}

/**
 * Processa um município
 */
async function processarMunicipio(municipioNome: string): Promise<RelatorioUnidade[]> {
  console.log(`\n🏙️ Processando município: ${municipioNome}`);
  
  const relatorios: RelatorioUnidade[] = [];
  const municipioRef = db.collection('municipio').doc(municipioNome);
  
  try {
    const unidadesSnapshot = await municipioRef.collection('unidades').get();
    console.log(`   📍 Total de unidades: ${unidadesSnapshot.size}`);
    
    for (const unidadeDoc of unidadesSnapshot.docs) {
      const unidadeNome = unidadeDoc.id;
      const relatorio = await processarUnidade(municipioNome, unidadeNome, unidadeDoc.ref);
      relatorios.push(relatorio);
    }
    
  } catch (error) {
    console.error(`❌ Erro ao processar município ${municipioNome}:`, error);
  }
  
  return relatorios;
}

/**
 * Executa a limpeza removendo os medicamentos duplicados
 */
async function executarLimpeza(relatorios: RelatorioUnidade[]): Promise<number> {
  console.log('\n🧹 INICIANDO LIMPEZA (MODO EXECUÇÃO)...\n');
  
  let totalExcluidos = 0;
  
  for (const relatorio of relatorios) {
    if (relatorio.medicamentosDuplicados.length === 0) continue;
    
    console.log(`\n🏙️ ${relatorio.municipio} > 🏥 ${relatorio.unidade}`);
    
    const municipioRef = db.collection('municipio').doc(relatorio.municipio);
    const unidadeRef = municipioRef.collection('unidades').doc(relatorio.unidade);
    const medicamentosRef = unidadeRef.collection('medicamentos_unidade');
    
    for (const duplicata of relatorio.medicamentosDuplicados) {
      console.log(`\n  📦 Medicamento: ${duplicata.nomeMedicamento}`);
      console.log(`     ✅ Mantendo: ${duplicata.medicamentoMantido.id}`);
      
      for (const excluido of duplicata.medicamentosExcluidos) {
        try {
          await medicamentosRef.doc(excluido.id).delete();
          console.log(`     ❌ Excluído: ${excluido.id}`);
          totalExcluidos++;
        } catch (error) {
          console.error(`     💥 Erro ao excluir ${excluido.id}:`, error);
        }
      }
    }
  }
  
  return totalExcluidos;
}

/**
 * Salva o relatório em arquivo JSON
 */
function salvarRelatorio(relatorio: RelatorioGeral): string {
  const outputDir = path.join(__dirname, 'output');
  
  // Criar pasta output se não existir
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const nomeArquivo = `relatorio_limpeza_${relatorio.modo}_${timestamp}.json`;
  const caminhoCompleto = path.join(outputDir, nomeArquivo);
  
  fs.writeFileSync(caminhoCompleto, JSON.stringify(relatorio, null, 2), 'utf8');
  
  return caminhoCompleto;
}

/**
 * Função principal
 */
export async function limparMedicamentosDuplicados(modo: 'teste' | 'execucao' = 'teste'): Promise<void> {
  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🧹 SCRIPT DE LIMPEZA DE MEDICAMENTOS DUPLICADOS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📋 Modo: ${modo.toUpperCase()}`);
    console.log(`⏰ Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (modo === 'teste') {
      console.log('ℹ️ MODO TESTE: Apenas análise, nenhum dado será excluído\n');
    } else {
      console.log('⚠️ MODO EXECUÇÃO: Medicamentos duplicados SERÃO EXCLUÍDOS!\n');
    }
    
    // Buscar todos os municípios
    const municipiosSnapshot = await db.collection('municipio').get();
    console.log(`🗺️ Total de municípios encontrados: ${municipiosSnapshot.size}\n`);
    
    const todosRelatorios: RelatorioUnidade[] = [];
    
    // Processar cada município
    for (const municipioDoc of municipiosSnapshot.docs) {
      const municipioNome = municipioDoc.id;
      const relatorios = await processarMunicipio(municipioNome);
      todosRelatorios.push(...relatorios);
    }
    
    // Calcular estatísticas
    const totalMedicamentosAnalisados = todosRelatorios.reduce(
      (sum, r) => sum + r.totalMedicamentos, 
      0
    );
    const totalDuplicatasEncontradas = todosRelatorios.reduce(
      (sum, r) => sum + r.medicamentosDuplicados.length, 
      0
    );
    const totalMedicamentosParaExcluir = todosRelatorios.reduce(
      (sum, r) => sum + r.medicamentosDuplicados.reduce(
        (subSum, d) => subSum + d.medicamentosExcluidos.length, 
        0
      ), 
      0
    );
    
    // Criar relatório geral
    const relatorioGeral: RelatorioGeral = {
      dataExecucao: new Date().toISOString(),
      modo: modo,
      totalMunicipios: municipiosSnapshot.size,
      totalUnidades: todosRelatorios.length,
      totalMedicamentosAnalisados: totalMedicamentosAnalisados,
      totalDuplicatasEncontradas: totalDuplicatasEncontradas,
      totalMedicamentosExcluidos: 0,
      unidades: todosRelatorios // Incluir TODAS as unidades no relatório
    };
    
    // Se modo execução, realizar a limpeza
    if (modo === 'execucao') {
      const totalExcluidos = await executarLimpeza(todosRelatorios);
      relatorioGeral.totalMedicamentosExcluidos = totalExcluidos;
    } else {
      relatorioGeral.totalMedicamentosExcluidos = totalMedicamentosParaExcluir;
    }
    
    // Salvar relatório
    const caminhoRelatorio = salvarRelatorio(relatorioGeral);
    
    // Resumo final
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMO FINAL');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`🗺️ Municípios analisados: ${relatorioGeral.totalMunicipios}`);
    console.log(`🏥 Unidades analisadas: ${relatorioGeral.totalUnidades}`);
    console.log(`📦 Medicamentos analisados: ${relatorioGeral.totalMedicamentosAnalisados}`);
    console.log(`🔍 Duplicatas encontradas: ${relatorioGeral.totalDuplicatasEncontradas}`);
    
    if (modo === 'teste') {
      console.log(`❌ Medicamentos que seriam excluídos: ${totalMedicamentosParaExcluir}`);
      console.log(`\n💡 Para executar a limpeza, rode novamente com modo='execucao'`);
    } else {
      console.log(`❌ Medicamentos excluídos: ${relatorioGeral.totalMedicamentosExcluidos}`);
      console.log(`\n✅ Limpeza concluída com sucesso!`);
    }
    
    console.log(`\n📄 Relatório salvo em: ${caminhoRelatorio}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n💥 Erro fatal durante a execução:', error);
    throw error;
  }
}

// Permitir execução direta do script
if (require.main === module) {
  const modo = (process.argv[2] as 'teste' | 'execucao') || 'teste';
  
  if (modo !== 'teste' && modo !== 'execucao') {
    console.error('❌ Modo inválido. Use "teste" ou "execucao"');
    process.exit(1);
  }
  
  limparMedicamentosDuplicados(modo)
    .then(() => {
      console.log('✅ Script finalizado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro na execução do script:', error);
      process.exit(1);
    });
}

