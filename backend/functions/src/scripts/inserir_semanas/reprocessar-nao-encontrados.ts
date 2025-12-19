import * as fs from 'fs';
import * as path from 'path';
import { db } from '../../config/firebase';

// --- CONFIGURAÇÕES ---
const MUNICIPIO = 'Palmares';

// --- INTERFACES ---
interface MovimentacoesPorSemana {
  [semana: string]: number;
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

interface ResultadoReprocessamento {
  encontrados: number;
  atualizados: number;
  erros: number;
  ignorados_zerados: number;
  ainda_nao_encontrados: number;
  detalhes: {
    unidade: string;
    medicamento: string;
    status: 'atualizado' | 'erro' | 'ignorado_zerado' | 'ainda_nao_encontrado';
    mensagem?: string;
  }[];
}

// --- FUNÇÕES ---

/**
 * Verifica se todas as movimentações são zero
 */
function todasMovimentacoesZeradas(movimentacoes: MovimentacoesPorSemana): boolean {
  return Object.values(movimentacoes).every(valor => valor === 0);
}

/**
 * Busca medicamento por nome com variações (case-insensitive e trim)
 */
async function buscarMedicamentoPorNomeFlexivel(
  unidadeRef: FirebaseFirestore.DocumentReference,
  nomeMedicamento: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> {
  try {
    // Tenta busca exata primeiro
    let medicamentosSnapshot = await unidadeRef
      .collection('medicamentos_unidade')
      .where('nome', '==', nomeMedicamento)
      .limit(1)
      .get();

    if (!medicamentosSnapshot.empty) {
      return medicamentosSnapshot.docs[0];
    }

    // Tenta com trim
    const nomeTrimmed = nomeMedicamento.trim();
    if (nomeTrimmed !== nomeMedicamento) {
      medicamentosSnapshot = await unidadeRef
        .collection('medicamentos_unidade')
        .where('nome', '==', nomeTrimmed)
        .limit(1)
        .get();

      if (!medicamentosSnapshot.empty) {
        console.log(`   🔍 Encontrado com trim: "${nomeTrimmed}"`);
        return medicamentosSnapshot.docs[0];
      }
    }

    // Busca todos e tenta match case-insensitive
    const todosMedicamentos = await unidadeRef
      .collection('medicamentos_unidade')
      .get();

    const nomeLower = nomeMedicamento.toLowerCase().trim();
    
    for (const doc of todosMedicamentos.docs) {
      const nomeBanco = doc.data().nome;
      if (nomeBanco && nomeBanco.toLowerCase().trim() === nomeLower) {
        console.log(`   🔍 Encontrado case-insensitive: "${nomeBanco}" (buscando "${nomeMedicamento}")`);
        return doc;
      }
    }

    return null;
  } catch (error) {
    console.error(`❌ Erro ao buscar medicamento "${nomeMedicamento}":`, error);
    return null;
  }
}

/**
 * Atualiza movimentações de um medicamento
 */
async function atualizarMovimentacoesMedicamento(
  medicamentoRef: FirebaseFirestore.DocumentReference,
  novasMovimentacoes: MovimentacoesPorSemana
): Promise<boolean> {
  try {
    const doc = await medicamentoRef.get();
    
    if (!doc.exists) {
      return false;
    }

    const medicamento = doc.data();
    const movimentacoesAtuais = medicamento?.movimentacoes_semanais || {};

    // Mescla as movimentações
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
    console.log(`   ✅ ${medicamento?.nome}: [${semanasAdicionadas}] atualizadas`);
    
    return true;

  } catch (error) {
    console.error(`❌ Erro ao atualizar:`, error);
    return false;
  }
}

/**
 * Reprocessa um item não encontrado
 */
async function reprocessarItem(item: ItemNaoEncontrado): Promise<{
  status: 'atualizado' | 'erro' | 'ignorado_zerado' | 'ainda_nao_encontrado';
  mensagem?: string;
}> {
  try {
    // Verifica se todas as movimentações são zero
    if (todasMovimentacoesZeradas(item.movimentacoes_esperadas)) {
      return {
        status: 'ignorado_zerado',
        mensagem: 'Todas as movimentações são zero'
      };
    }

    // Busca o município
    const municipioRef = db.collection('municipio').doc(MUNICIPIO);
    const municipioDoc = await municipioRef.get();
    
    if (!municipioDoc.exists) {
      return {
        status: 'erro',
        mensagem: `Município ${MUNICIPIO} não encontrado`
      };
    }

    // Busca a unidade
    const unidadeRef = municipioRef.collection('unidades').doc(item.unidade);
    const unidadeDoc = await unidadeRef.get();
    
    if (!unidadeDoc.exists) {
      return {
        status: 'erro',
        mensagem: `Unidade ${item.unidade} não encontrada`
      };
    }

    // Busca o medicamento com flexibilidade
    const medicamentoDoc = await buscarMedicamentoPorNomeFlexivel(
      unidadeRef,
      item.medicamento
    );

    if (!medicamentoDoc) {
      return {
        status: 'ainda_nao_encontrado',
        mensagem: 'Medicamento não existe no banco'
      };
    }

    // Atualiza as movimentações
    const resultado = await atualizarMovimentacoesMedicamento(
      medicamentoDoc.ref,
      item.movimentacoes_esperadas
    );

    if (resultado) {
      return {
        status: 'atualizado',
        mensagem: 'Movimentações inseridas com sucesso'
      };
    } else {
      return {
        status: 'erro',
        mensagem: 'Falha ao atualizar movimentações'
      };
    }

  } catch (error) {
    return {
      status: 'erro',
      mensagem: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Lê o arquivo JSON de não encontrados
 */
function lerArquivoNaoEncontrados(caminhoArquivo: string): RelatorioNaoEncontrados {
  try {
    if (!fs.existsSync(caminhoArquivo)) {
      throw new Error(`Arquivo não encontrado: ${caminhoArquivo}`);
    }

    const conteudo = fs.readFileSync(caminhoArquivo, 'utf-8');
    return JSON.parse(conteudo);

  } catch (error) {
    console.error('❌ Erro ao ler arquivo:', error);
    throw error;
  }
}

/**
 * Salva relatório de reprocessamento
 */
function salvarRelatorioReprocessamento(
  resultado: ResultadoReprocessamento,
  arquivoOriginal: string
): string {
  try {
    const outputDir = path.dirname(arquivoOriginal);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `reprocessamento_${timestamp}.json`);

    fs.writeFileSync(outputFile, JSON.stringify(resultado, null, 2), 'utf-8');

    console.log(`\n📄 Relatório salvo: ${outputFile}`);
    return outputFile;

  } catch (error) {
    console.error('❌ Erro ao salvar relatório:', error);
    throw error;
  }
}

/**
 * Salva itens que ainda não foram encontrados
 */
function salvarAindaNaoEncontrados(
  itens: ItemNaoEncontrado[],
  arquivoOriginal: string
): string | null {
  try {
    if (itens.length === 0) {
      return null;
    }

    const outputDir = path.dirname(arquivoOriginal);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `ainda_nao_encontrados_${timestamp}.json`);

    const relatorio: RelatorioNaoEncontrados = {
      timestamp: new Date().toISOString(),
      total: itens.length,
      itens: itens
    };

    fs.writeFileSync(outputFile, JSON.stringify(relatorio, null, 2), 'utf-8');

    console.log(`\n⚠️  Ainda não encontrados salvo: ${outputFile}`);
    return outputFile;

  } catch (error) {
    console.error('❌ Erro ao salvar ainda não encontrados:', error);
    return null;
  }
}

// --- FUNÇÃO PRINCIPAL ---

/**
 * Reprocessa itens não encontrados
 */
export async function reprocessarNaoEncontrados(caminhoArquivo?: string): Promise<void> {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('  🔄 REPROCESSAMENTO DE ITENS NÃO ENCONTRADOS');
    console.log('='.repeat(70) + '\n');

    // Se não foi fornecido caminho, tenta usar o mais recente
    let arquivo = caminhoArquivo;
    if (!arquivo) {
      const outputDir = path.join(__dirname, 'output');
      const arquivos = fs.readdirSync(outputDir)
        .filter(f => f.startsWith('nao_encontrados_') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (arquivos.length === 0) {
        throw new Error('Nenhum arquivo de não encontrados disponível');
      }

      arquivo = path.join(outputDir, arquivos[0]);
      console.log(`📁 Usando arquivo mais recente: ${path.basename(arquivo)}\n`);
    }

    // Lê o arquivo
    const relatorio = lerArquivoNaoEncontrados(arquivo);
    console.log(`📊 Total de itens a reprocessar: ${relatorio.total}`);

    const resultado: ResultadoReprocessamento = {
      encontrados: 0,
      atualizados: 0,
      erros: 0,
      ignorados_zerados: 0,
      ainda_nao_encontrados: 0,
      detalhes: []
    };

    const aindaNaoEncontrados: ItemNaoEncontrado[] = [];

    // Processa cada item
    let contador = 0;
    for (const item of relatorio.itens) {
      contador++;
      console.log(`\n[${contador}/${relatorio.total}] ${item.unidade} - ${item.medicamento}`);

      const resultadoItem = await reprocessarItem(item);

      resultado.detalhes.push({
        unidade: item.unidade,
        medicamento: item.medicamento,
        status: resultadoItem.status,
        mensagem: resultadoItem.mensagem
      });

      switch (resultadoItem.status) {
        case 'atualizado':
          resultado.encontrados++;
          resultado.atualizados++;
          break;
        case 'erro':
          resultado.erros++;
          break;
        case 'ignorado_zerado':
          resultado.ignorados_zerados++;
          console.log('   ⏭️  Ignorado (movimentações zeradas)');
          break;
        case 'ainda_nao_encontrado':
          resultado.ainda_nao_encontrados++;
          aindaNaoEncontrados.push(item);
          console.log('   ⚠️  Ainda não encontrado');
          break;
      }
    }

    // Salva relatórios
    const arquivoRelatorio = salvarRelatorioReprocessamento(resultado, arquivo);
    const arquivoAindaNaoEncontrados = salvarAindaNaoEncontrados(aindaNaoEncontrados, arquivo);

    // Exibe resumo final
    console.log('\n' + '='.repeat(70));
    console.log('🎉 REPROCESSAMENTO CONCLUÍDO');
    console.log('='.repeat(70));
    console.log(`\n📊 Resumo:`);
    console.log(`   ✅ Encontrados e atualizados: ${resultado.atualizados}`);
    console.log(`   ⏭️  Ignorados (zerados): ${resultado.ignorados_zerados}`);
    console.log(`   ⚠️  Ainda não encontrados: ${resultado.ainda_nao_encontrados}`);
    console.log(`   ❌ Erros: ${resultado.erros}`);
    
    const total = relatorio.total - resultado.ignorados_zerados;
    const taxaSucesso = total > 0 ? ((resultado.atualizados / total) * 100).toFixed(2) : '0.00';
    console.log(`   📈 Taxa de sucesso: ${taxaSucesso}%`);

    console.log(`\n📄 Relatório: ${arquivoRelatorio}`);
    if (arquivoAindaNaoEncontrados) {
      console.log(`⚠️  Ainda não encontrados: ${arquivoAindaNaoEncontrados}`);
    }

  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const caminhoArquivo = process.argv[2];

  if (caminhoArquivo && !fs.existsSync(caminhoArquivo)) {
    console.error(`❌ Arquivo não encontrado: ${caminhoArquivo}`);
    console.error('\n💡 Uso:');
    console.error('   npm run reprocessar-nao-encontrados');
    console.error('   npm run reprocessar-nao-encontrados [caminho/arquivo.json]');
    process.exit(1);
  }

  reprocessarNaoEncontrados(caminhoArquivo)
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na execução:', error);
      process.exit(1);
    });
}

