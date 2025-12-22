import * as XLSX from 'xlsx';
import * as fs from 'fs'; // Módulo para salvar os arquivos
import { db } from '../../config/firebase';

// Configurações
const CAMINHO_PLANILHA = './src/scripts/inserir_semanas/base_separada.xlsx';
const ABAS_ALVO = ['CAF', 'Olavo', 'ESF3'];

// Interface para garantir a estrutura dos dados no JSON
interface DadosMedicamento {
  unidade: string; // Adicionei para você saber de onde veio o dado
  id: string;      // Adicionei para rastreio
  nome: string;
  tp_metodo?: string;
  estoque: number | string;
  metodo?: string;
}

async function atualizarEstoqueGerandoRelatorios() {
  console.log('--- Iniciando atualização de estoque com logs ---');

  // Arrays para armazenar os logs
  const logAntes: DadosMedicamento[] = [];
  const logDepois: DadosMedicamento[] = [];

  try {
    const workbook = XLSX.readFile(CAMINHO_PLANILHA);

    for (const nomeUnidade of ABAS_ALVO) {
      const sheet = workbook.Sheets[nomeUnidade];

      if (!sheet) {
        console.warn(`[AVISO] Aba "${nomeUnidade}" não encontrada. Pulando...`);
        continue;
      }

      console.log(`\n📂 Processando unidade: ${nomeUnidade}...`);
      
      const linhas: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Acessa a coleção de medicamentos da unidade usando a mesma estrutura do inserir-banco.ts
      const municipioRef = db.collection('municipio').doc('Palmares');
      const unidadeRef = municipioRef.collection('unidades').doc(nomeUnidade);
      const medicamentosRef = unidadeRef.collection('medicamentos_unidade');

      // Loop começando da linha 1 (pula cabeçalho)
      for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i];
        const classificacao = linha[0]; // Coluna A
        const nomeItem = linha[1]; // Coluna B
        const codItem = linha[2]; // Coluna C
        const novoEstoque = linha[3]; // Coluna D

        if (!classificacao || !nomeItem || !codItem || novoEstoque === undefined) continue;

        try {
          const normalizarCodigoItem = (codigo: string): string => {
            if (!codigo) return '';
          
            // 1. Remove todos os pontos da string: "001.002.003" -> "001002003"
            const semPontos = codigo.replace(/\./g, '');
          
            // 2. Converte para Number (remove zeros à esquerda) e volta para String
            // "001002003" -> 1002003 -> "1002003"
            return Number(semPontos).toString();
          };

          const codItemNormalizado = normalizarCodigoItem(codItem);

          const snapshot = await medicamentosRef
            .where('cod_item', '==', codItemNormalizado)
            .get();

          if (!snapshot.empty) {
            // Processa cada documento encontrado (pode haver múltiplos com o mesmo nome)
            snapshot.forEach((doc) => {
              const docId = doc.id;
              const dadosAtuais = doc.data();

              // 1. Popular Log ANTES (Dados como estão no banco agora)
              logAntes.push({
                unidade: nomeUnidade,
                id: docId,
                nome: dadosAtuais.nome,
                tp_metodo: dadosAtuais.tp_metodo || 'N/A',
                estoque: dadosAtuais.estoque, // Estoque antigo
                metodo: dadosAtuais.metodo || 'N/A'
              });

              // 2. Popular Log DEPOIS (Dados com o novo estoque)
              logDepois.push({
                unidade: nomeUnidade,
                id: docId,
                nome: dadosAtuais.nome,
                tp_metodo: dadosAtuais.tp_metodo || 'N/A',
                estoque: novoEstoque, // Estoque novo
                metodo: dadosAtuais.metodo || 'N/A'
              });
            });

            // Atualiza todos os documentos encontrados
            const batch = db.batch();
            snapshot.forEach((doc) => {
              const docRef = medicamentosRef.doc(doc.id);
              batch.update(docRef, {
                estoque: novoEstoque,
                data_atualizacao: new Date()
              });
            });

            await batch.commit();
            console.log(`✅ [${nomeUnidade}] Atualizando "${nomeItem}" (${snapshot.size} documento(s))`);

          } else {
            console.log(`⚠️ [${nomeUnidade}] Não encontrado: "${nomeItem}"`);
          }

        } catch (err) {
          console.error(`❌ Erro no item "${nomeItem}":`, err);
        }
      }
    }

    console.log('\n--- Salvando arquivos de relatório ---');

    // Salvando os arquivos JSON
    fs.writeFileSync('estoque_antes.json', JSON.stringify(logAntes, null, 2));
    fs.writeFileSync('estoque_depois.json', JSON.stringify(logDepois, null, 2));

    console.log('📄 "estoque_antes.json" gerado com sucesso.');
    console.log('📄 "estoque_depois.json" gerado com sucesso.');
    console.log('\n--- Processo finalizado ---');
    process.exit(0);

  } catch (error) {
    console.error('Erro fatal:', error);
    process.exit(1);
  }
}

atualizarEstoqueGerandoRelatorios();