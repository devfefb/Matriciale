import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { db } from '../../config/firebase';

// --- CONFIGURAÇÕES ---
const ARQUIVO_PLANILHA = path.join(__dirname, '../../../../../Palmares_data/movimentacoes_atualizacao.xlsx');
const MUNICIPIO = 'Palmares';

// --- INTERFACES ---
interface MovimentacoesPorSemana {
  [semana: string]: number;
}

interface MedicamentoAtualizado {
  nome: string;
  movimentacoes: MovimentacoesPorSemana;
}

interface DadosUnidadeAtualizada {
  nome_unidade: string;
  medicamentos: MedicamentoAtualizado[];
}

interface ResultadoTeste {
  unidades: DadosUnidadeAtualizada[];
}

interface EstatisticasProcessamento {
  sucessos: number;
  erros: number;
  naoEncontrados: number;
  detalhes: {
    unidade: string;
    medicamento: string;
    status: 'sucesso' | 'erro' | 'nao_encontrado';
    mensagem?: string;
  }[];
}

interface ItemNaoEncontrado {
  unidade: string;
  medicamento: string;
  movimentacoes_esperadas: MovimentacoesPorSemana;
}

interface RelatorioNaoEncontrados {
  timestamp: string;
  total: number;
  itens: ItemNaoEncontrado[];
}

// --- FUNÇÕES DE LEITURA DA PLANILHA ---

/**
 * Lê a planilha Excel e extrai as movimentações semanais
 * Estrutura: coluna 0 = classificação (ignorar), coluna 1 = nome, colunas 2+ = semanas
 */
function lerPlanilhaMovimentacoes(): ResultadoTeste {
  try {
    console.log(`📖 Lendo planilha: ${ARQUIVO_PLANILHA}`);
    
    if (!fs.existsSync(ARQUIVO_PLANILHA)) {
      throw new Error(`Arquivo não encontrado: ${ARQUIVO_PLANILHA}`);
    }

    const workbook = XLSX.readFile(ARQUIVO_PLANILHA);
    const unidades: DadosUnidadeAtualizada[] = [];

    // Mapear nomes das abas para nomes das unidades no banco
    const mapeamentoAbas: { [key: string]: string } = {
      'CAF': 'CAF',
      'Olavo': 'Olavo',
      'ESF3': 'ESF3'
    };

    // Processa cada aba da planilha
    for (const sheetName of workbook.SheetNames) {
      const nomeUnidade = mapeamentoAbas[sheetName];
      
      if (!nomeUnidade) {
        console.warn(`⚠️ Aba "${sheetName}" não mapeada, pulando...`);
        continue;
      }

      console.log(`\n📋 Processando aba/unidade: ${sheetName} -> ${nomeUnidade}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];

      if (dados.length < 2) {
        console.warn(`⚠️ Aba ${sheetName} vazia ou sem dados suficientes`);
        continue;
      }

      // Primeira linha contém os headers (incluindo semanas)
      const headers = dados[0];
      
      // Identificar as colunas de semanas (a partir da coluna 2)
      const semanas: string[] = [];
      for (let col = 2; col < headers.length; col++) {
        if (headers[col]) {
          const semanaHeader = String(headers[col]).trim();
          semanas.push(semanaHeader);
        }
      }

      console.log(`   📅 Semanas encontradas: ${semanas.join(', ')}`);

      const medicamentos: MedicamentoAtualizado[] = [];

      // Processa cada linha (a partir da linha 1, pulando header)
      for (let i = 1; i < dados.length; i++) {
        const linha = dados[i];
        
        if (!linha || linha.length < 2) continue;

        // Coluna 0 = classificação (ignorar)
        // Coluna 1 = nome do medicamento
        const nomeMedicamento = linha[1] ? String(linha[1]).trim() : '';

        if (!nomeMedicamento || nomeMedicamento === '') {
          continue;
        }

        // Extrair movimentações das colunas de semanas
        const movimentacoes: MovimentacoesPorSemana = {};
        
        for (let col = 2; col < linha.length && (col - 2) < semanas.length; col++) {
          const semana = semanas[col - 2];
          const valor = linha[col];
          
          // Converter para número, tratar null/undefined como 0
          const quantidade = valor !== null && valor !== undefined ? Number(valor) : 0;
          
          if (!isNaN(quantidade)) {
            movimentacoes[semana] = quantidade;
          }
        }

        // Só adiciona se tiver pelo menos uma movimentação
        if (Object.keys(movimentacoes).length > 0) {
          medicamentos.push({
            nome: nomeMedicamento,
            movimentacoes: movimentacoes
          });
        }
      }

      unidades.push({
        nome_unidade: nomeUnidade,
        medicamentos: medicamentos
      });

      console.log(`   ✅ ${medicamentos.length} medicamentos processados`);
    }

    console.log(`\n📊 Total de unidades processadas: ${unidades.length}`);
    return { unidades };

  } catch (error) {
    console.error('❌ Erro ao ler planilha:', error);
    throw error;
  }
}

// --- MODO TESTE: SALVAR EM JSON ---

/**
 * Modo teste: salva os dados em JSON sem tocar no banco
 */
function salvarTesteEmJson(dados: ResultadoTeste): string {
  try {
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `teste_movimentacoes_${timestamp}.json`);

    fs.writeFileSync(outputFile, JSON.stringify(dados, null, 2), 'utf-8');

    console.log(`\n💾 Arquivo de teste salvo: ${outputFile}`);
    
    // Exibir estatísticas
    let totalMedicamentos = 0;
    let totalMovimentacoes = 0;

    dados.unidades.forEach(unidade => {
      totalMedicamentos += unidade.medicamentos.length;
      unidade.medicamentos.forEach(med => {
        totalMovimentacoes += Object.keys(med.movimentacoes).length;
      });
    });

    console.log(`\n📊 Estatísticas do teste:`);
    console.log(`   🏥 Unidades: ${dados.unidades.length}`);
    console.log(`   💊 Medicamentos: ${totalMedicamentos}`);
    console.log(`   📅 Total de movimentações: ${totalMovimentacoes}`);

    return outputFile;

  } catch (error) {
    console.error('❌ Erro ao salvar arquivo de teste:', error);
    throw error;
  }
}

// --- MODO EXECUÇÃO: INSERIR NO BANCO ---

/**
 * Busca um medicamento pelo nome em uma unidade específica
 */
async function buscarMedicamentoPorNome(
  unidadeRef: FirebaseFirestore.DocumentReference,
  nomeMedicamento: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> {
  try {
    const medicamentosSnapshot = await unidadeRef
      .collection('medicamentos_unidade')
      .where('nome', '==', nomeMedicamento)
      .limit(1)
      .get();

    if (!medicamentosSnapshot.empty) {
      return medicamentosSnapshot.docs[0];
    }

    return null;
  } catch (error) {
    console.error(`❌ Erro ao buscar medicamento "${nomeMedicamento}":`, error);
    return null;
  }
}

/**
 * Atualiza as movimentações semanais de um medicamento (preservando as existentes)
 */
async function atualizarMovimentacoesMedicamento(
  medicamentoRef: FirebaseFirestore.DocumentReference,
  novasMovimentacoes: MovimentacoesPorSemana
): Promise<boolean> {
  try {
    const doc = await medicamentoRef.get();
    
    if (!doc.exists) {
      console.log(`❌ Medicamento não encontrado: ${medicamentoRef.id}`);
      return false;
    }

    const medicamento = doc.data();
    const movimentacoesAtuais = medicamento?.movimentacoes_semanais || {};

    // Mescla as movimentações (preserva as antigas, adiciona as novas)
    const movimentacoesAtualizadas = {
      ...movimentacoesAtuais,
      ...novasMovimentacoes
    };

    // Atualiza o documento
    await medicamentoRef.update({
      movimentacoes_semanais: movimentacoesAtualizadas,
      data_atualizacao: new Date()
    });

    const semanasAdicionadas = Object.keys(novasMovimentacoes).join(', ');
    console.log(`   ✅ ${medicamento?.nome}: semanas [${semanasAdicionadas}] atualizadas`);
    
    return true;

  } catch (error) {
    console.error(`❌ Erro ao atualizar movimentações no medicamento ${medicamentoRef.id}:`, error);
    return false;
  }
}

/**
 * Processa uma unidade completa
 */
async function processarUnidadeExecucao(
  dadosUnidade: DadosUnidadeAtualizada,
  itensNaoEncontrados: ItemNaoEncontrado[]
): Promise<EstatisticasProcessamento> {
  try {
    console.log(`\n🏥 Processando unidade: ${dadosUnidade.nome_unidade}`);
    
    // Busca o município
    const municipioRef = db.collection('municipio').doc(MUNICIPIO);
    const municipioDoc = await municipioRef.get();
    
    if (!municipioDoc.exists) {
      throw new Error(`Município ${MUNICIPIO} não encontrado no banco de dados`);
    }

    // Busca a unidade específica
    const unidadeRef = municipioRef.collection('unidades').doc(dadosUnidade.nome_unidade);
    const unidadeDoc = await unidadeRef.get();
    
    if (!unidadeDoc.exists) {
      throw new Error(`Unidade ${dadosUnidade.nome_unidade} não encontrada no banco de dados`);
    }

    const estatisticas: EstatisticasProcessamento = {
      sucessos: 0,
      erros: 0,
      naoEncontrados: 0,
      detalhes: []
    };

    // Processa cada medicamento da unidade
    for (const medicamento of dadosUnidade.medicamentos) {
      try {
        // Busca o medicamento pelo nome
        const medicamentoDoc = await buscarMedicamentoPorNome(
          unidadeRef,
          medicamento.nome
        );

        if (medicamentoDoc) {
          // Atualiza as movimentações
          const resultado = await atualizarMovimentacoesMedicamento(
            medicamentoDoc.ref,
            medicamento.movimentacoes
          );

          if (resultado) {
            estatisticas.sucessos++;
            estatisticas.detalhes.push({
              unidade: dadosUnidade.nome_unidade,
              medicamento: medicamento.nome,
              status: 'sucesso'
            });
          } else {
            estatisticas.erros++;
            estatisticas.detalhes.push({
              unidade: dadosUnidade.nome_unidade,
              medicamento: medicamento.nome,
              status: 'erro',
              mensagem: 'Falha ao atualizar'
            });
          }
        } else {
          console.warn(`   ⚠️ Medicamento não encontrado: "${medicamento.nome}"`);
          estatisticas.naoEncontrados++;
          estatisticas.detalhes.push({
            unidade: dadosUnidade.nome_unidade,
            medicamento: medicamento.nome,
            status: 'nao_encontrado',
            mensagem: 'Medicamento não existe no banco'
          });

          // Adiciona ao relatório de não encontrados
          itensNaoEncontrados.push({
            unidade: dadosUnidade.nome_unidade,
            medicamento: medicamento.nome,
            movimentacoes_esperadas: medicamento.movimentacoes
          });
        }

      } catch (error) {
        console.error(`❌ Erro ao processar medicamento "${medicamento.nome}":`, error);
        estatisticas.erros++;
        estatisticas.detalhes.push({
          unidade: dadosUnidade.nome_unidade,
          medicamento: medicamento.nome,
          status: 'erro',
          mensagem: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    console.log(`   📊 ${estatisticas.sucessos} sucessos, ${estatisticas.erros} erros, ${estatisticas.naoEncontrados} não encontrados`);
    return estatisticas;

  } catch (error) {
    console.error(`❌ Erro ao processar unidade ${dadosUnidade.nome_unidade}:`, error);
    return {
      sucessos: 0,
      erros: dadosUnidade.medicamentos.length,
      naoEncontrados: 0,
      detalhes: dadosUnidade.medicamentos.map(med => ({
        unidade: dadosUnidade.nome_unidade,
        medicamento: med.nome,
        status: 'erro' as const,
        mensagem: error instanceof Error ? error.message : 'Erro ao processar unidade'
      }))
    };
  }
}

/**
 * Salva o relatório de execução em JSON
 */
function salvarRelatorioExecucao(estatisticas: EstatisticasProcessamento[]): string {
  try {
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `relatorio_execucao_${timestamp}.json`);

    fs.writeFileSync(outputFile, JSON.stringify(estatisticas, null, 2), 'utf-8');

    console.log(`\n📄 Relatório de execução salvo: ${outputFile}`);
    return outputFile;

  } catch (error) {
    console.error('❌ Erro ao salvar relatório:', error);
    throw error;
  }
}

/**
 * Salva o relatório de itens não encontrados em JSON
 */
function salvarRelatorioNaoEncontrados(itensNaoEncontrados: ItemNaoEncontrado[]): string | null {
  try {
    if (itensNaoEncontrados.length === 0) {
      return null;
    }

    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `nao_encontrados_${timestamp}.json`);

    const relatorio: RelatorioNaoEncontrados = {
      timestamp: new Date().toISOString(),
      total: itensNaoEncontrados.length,
      itens: itensNaoEncontrados
    };

    fs.writeFileSync(outputFile, JSON.stringify(relatorio, null, 2), 'utf-8');

    console.log(`\n⚠️  Relatório de não encontrados salvo: ${outputFile}`);
    return outputFile;

  } catch (error) {
    console.error('❌ Erro ao salvar relatório de não encontrados:', error);
    return null;
  }
}

// --- FUNÇÕES PRINCIPAIS ---

/**
 * Modo TESTE: lê a planilha e salva em JSON
 */
export async function executarModoTeste(): Promise<void> {
  try {
    console.log('🧪 ========== MODO TESTE ==========');
    console.log('📝 Lendo planilha e salvando em JSON...\n');

    const dados = lerPlanilhaMovimentacoes();
    const arquivoSalvo = salvarTesteEmJson(dados);

    console.log('\n✅ Modo teste concluído!');
    console.log(`📁 Arquivo gerado: ${arquivoSalvo}`);
    console.log('\n💡 Dica: Revise o arquivo JSON antes de executar o modo de inserção');

  } catch (error) {
    console.error('❌ Erro no modo teste:', error);
    throw error;
  }
}

/**
 * Modo EXECUÇÃO: lê a planilha e atualiza o banco
 */
export async function executarModoExecucao(): Promise<void> {
  try {
    console.log('🚀 ========== MODO EXECUÇÃO ==========');
    console.log('⚠️  ATENÇÃO: Este modo irá ATUALIZAR o banco de dados!');
    console.log('📝 Lendo planilha e processando...\n');

    const dados = lerPlanilhaMovimentacoes();

    if (dados.unidades.length === 0) {
      throw new Error('Nenhuma unidade encontrada na planilha');
    }

    const todasEstatisticas: EstatisticasProcessamento[] = [];
    const itensNaoEncontrados: ItemNaoEncontrado[] = [];
    let totalSucessos = 0;
    let totalErros = 0;
    let totalNaoEncontrados = 0;

    // Processa cada unidade
    for (const dadosUnidade of dados.unidades) {
      const estatisticas = await processarUnidadeExecucao(dadosUnidade, itensNaoEncontrados);
      todasEstatisticas.push(estatisticas);
      
      totalSucessos += estatisticas.sucessos;
      totalErros += estatisticas.erros;
      totalNaoEncontrados += estatisticas.naoEncontrados;
    }

    // Salva relatório detalhado
    const arquivoRelatorio = salvarRelatorioExecucao(todasEstatisticas);

    // Salva relatório de não encontrados (se houver)
    const arquivoNaoEncontrados = salvarRelatorioNaoEncontrados(itensNaoEncontrados);

    // Exibe resumo final
    console.log('\n🎉 ========== PROCESSAMENTO CONCLUÍDO ==========');
    console.log(`📊 Resumo final:`);
    console.log(`   ✅ Medicamentos atualizados: ${totalSucessos}`);
    console.log(`   ❌ Erros: ${totalErros}`);
    console.log(`   ⚠️  Medicamentos não encontrados: ${totalNaoEncontrados}`);
    
    const total = totalSucessos + totalErros + totalNaoEncontrados;
    const taxaSucesso = total > 0 ? ((totalSucessos / total) * 100).toFixed(2) : '0.00';
    console.log(`   📈 Taxa de sucesso: ${taxaSucesso}%`);
    console.log(`\n📄 Relatório detalhado: ${arquivoRelatorio}`);

    if (totalNaoEncontrados > 0) {
      console.log(`\n⚠️  ${totalNaoEncontrados} medicamentos não foram encontrados no banco!`);
      if (arquivoNaoEncontrados) {
        console.log(`📋 Relatório de não encontrados: ${arquivoNaoEncontrados}`);
      }
      console.log(`\n💡 Dica: Verifique se os nomes na planilha correspondem exatamente aos nomes no banco.`);
      console.log(`   O relatório contém a lista completa de medicamentos e suas movimentações esperadas.`);
    }

  } catch (error) {
    console.error('❌ Erro no modo execução:', error);
    throw error;
  }
}

// --- PONTO DE ENTRADA ---

/**
 * Função principal que decide qual modo executar
 */
export async function main(modo: 'teste' | 'execucao' = 'teste'): Promise<void> {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('  📦 ATUALIZAÇÃO DE MOVIMENTAÇÕES SEMANAIS');
    console.log('  🏥 Município: ' + MUNICIPIO);
    console.log('='.repeat(60) + '\n');

    if (modo === 'teste') {
      await executarModoTeste();
    } else if (modo === 'execucao') {
      await executarModoExecucao();
    } else {
      throw new Error(`Modo inválido: ${modo}. Use 'teste' ou 'execucao'`);
    }

  } catch (error) {
    console.error('\n💥 Erro fatal:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  // Captura o argumento da linha de comando
  const modo = process.argv[2] as 'teste' | 'execucao' || 'teste';
  
  if (modo !== 'teste' && modo !== 'execucao') {
    console.error('❌ Uso: npm run atualizar-movimentacoes [teste|execucao]');
    console.error('   teste    - Lê a planilha e salva em JSON (não altera o banco)');
    console.error('   execucao - Lê a planilha e atualiza o banco de dados');
    process.exit(1);
  }

  main(modo)
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na execução do script:', error);
      process.exit(1);
    });
}

