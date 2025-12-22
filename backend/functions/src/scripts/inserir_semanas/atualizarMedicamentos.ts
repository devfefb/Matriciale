import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { db } from '../../config/firebase'; 

const CAMINHO_PLANILHA = './src/scripts/inserir_semanas/base_completa.xlsx'; 
const ABAS_ALVO = ['CAF', 'Olavo', 'ESF3'];

// ... (Mantenha suas constantes de índices aqui) ...
const IDX_CLASSIFICACAO = 0;
const IDX_NOME = 1;
const IDX_CODIGO = 2;
const IDX_INICIO_MOVIMENTACAO = 3; 
// CAF e Olavo: Movimentações de D (3) até DQ (120), Estoque em DR (121)
const IDX_ESTOQUE_PADRAO = 121;
const IDX_FIM_MOVIMENTACAO_PADRAO = IDX_ESTOQUE_PADRAO - 1; // DQ = 120
// ESF3: Movimentações de D (3) até CB (79), Estoque em CC (80)
const IDX_ESTOQUE_ESF3 = 80;
const IDX_FIM_MOVIMENTACAO_ESF3 = IDX_ESTOQUE_ESF3 - 1; // CB = 79 

// --- FUNÇÃO DE FORMATAÇÃO FORÇADA ---
function formatarCodigoPadrao(valor: string | number): string {
  // 1. Remove tudo que não for dígito (pontos, espaços, traços)
  const apenasNumeros = String(valor).replace(/\D/g, '');
  
  // 2. Garante que tenha 9 dígitos preenchendo com zeros à esquerda
  // Ex: "1002003" vira "001002003"
  const preenchido = apenasNumeros.padStart(9, '0');
  
  // 3. Fatia a string para inserir os pontos: XXX.XXX.XXX
  return `${preenchido.slice(0, 3)}.${preenchido.slice(3, 6)}.${preenchido.slice(6, 9)}`;
}

async function atualizarMedicamentos() {
  console.log('--- Iniciando ATUALIZAÇÃO BLINDADA COM FORMATAÇÃO ---');

  // ... (Variáveis de log) ...
  let totalAtualizados = 0;

  try {
    const workbook = XLSX.readFile(CAMINHO_PLANILHA);

    for (const nomeAba of ABAS_ALVO) {
      const sheet = workbook.Sheets[nomeAba];
      if (!sheet) continue;

      console.log(`\n📂 Processando unidade: ${nomeAba}...`);
      const linhas: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (linhas.length < 2) continue;

      const cabecalho = linhas[0]; 
      const medicamentosRef = db.collection('municipio').doc('Palmares').collection('unidades').doc(nomeAba).collection('medicamentos_unidade');

      let idxFimMovimentacao = (nomeAba === 'ESF3') ? IDX_FIM_MOVIMENTACAO_ESF3 : IDX_FIM_MOVIMENTACAO_PADRAO;
      let idxEstoque = (nomeAba === 'ESF3') ? IDX_ESTOQUE_ESF3 : IDX_ESTOQUE_PADRAO;
      console.log(`📊 ${nomeAba} - Movimentações: col ${IDX_INICIO_MOVIMENTACAO} até ${idxFimMovimentacao} | Estoque: col ${idxEstoque}`);
      let countUnidade = 0;

      for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i];
        if (!linha[IDX_NOME] || !linha[IDX_CODIGO]) continue;

        const codItemPlanilhaRaw = String(linha[IDX_CODIGO]).trim();
        const estoqueFinal = Number(linha[idxEstoque]) || 0;
        const nomeFinal = String(linha[IDX_NOME]);
        const classificacaoFinal = linha[IDX_CLASSIFICACAO] ? String(linha[IDX_CLASSIFICACAO]) : '';

        // --- GERA O CÓDIGO FINAL FORMATADO ---
        // Mesmo que na planilha esteja "1002003", isso vira "001.002.003"
        const codFinalFormatado = formatarCodigoPadrao(codItemPlanilhaRaw);

        // Montagem do map de movimentações (APENAS colunas de movimentação, SEM estoque)
        const movimentacoesMap: { [key: string]: number } = {};
        for (let j = IDX_INICIO_MOVIMENTACAO; j <= idxFimMovimentacao; j++) {
          if (cabecalho[j]) {
            movimentacoesMap[String(cabecalho[j]).trim()] = Number(linha[j]) || 0;
          }
        }

        // Lógica de BUSCA (Mantém a limpeza para encontrar o documento antigo)
        const codNumerico = Number(codItemPlanilhaRaw.replace(/\./g, ''));
        const buscaStringLimpa = codNumerico.toString(); 
        const buscaNumber = codNumerico;                 

        try {
          // Busca Tripla (Formatado, String Limpa, Number Limpo)
          let snapshot = await medicamentosRef.where('cod_item', '==', codFinalFormatado).get();
          
          if (snapshot.empty) {
            snapshot = await medicamentosRef.where('cod_item', '==', buscaStringLimpa).get();
          }
          if (snapshot.empty) {
            snapshot = await medicamentosRef.where('cod_item', '==', buscaNumber).get();
          }

          if (!snapshot.empty) {
            for (const docSnapshot of snapshot.docs) {
              await docSnapshot.ref.update({
                classificacao: classificacaoFinal,
                nome: nomeFinal,
                cod_item: codFinalFormatado, // <--- AQUI GARANTIMOS O FORMATO XXX.XXX.XXX
                estoque: estoqueFinal,
                movimentacoes_semanais: movimentacoesMap,
                data_atualizacao: new Date()
              });
              countUnidade++;
              totalAtualizados++;
            }
            if (countUnidade % 10 === 0) process.stdout.write('.');
          } else {
             // ... (Lógica de log não encontrado) ...
          }
        } catch (err) {
          console.error(`Erro processando ${codItemPlanilhaRaw}:`, err);
        }
      }
      console.log(`\n✅ [${nomeAba}] Atualizados: ${countUnidade}`);
    }
    // ... (Logs finais e exit) ...
    process.exit(0);
  } catch (error) {
    console.error('Erro fatal:', error);
    process.exit(1);
  }
}

atualizarMedicamentos();