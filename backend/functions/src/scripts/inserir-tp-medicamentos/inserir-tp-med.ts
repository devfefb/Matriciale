import { db } from '../../config/firebase'; // Importa a configuração do DB
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore'; // Tipos do Firebase Admin
import * as fs from 'fs';
import * as path from 'path';

// --- Interfaces para Tipagem ---

// Interface para o item do arquivo JSON
interface JsonMedicamentoItem {
  cod: number;
  descricao: string;
  unidade: string;
}

// Interface para o documento do Firebase (apenas campos relevantes)
interface MedicamentoFirebaseDoc {
  cod_item: number;
  nome: string;
  [key: string]: any; // Permite outros campos que não nos importam
}

// --- Funções Auxiliares ---

/**
 * Carrega e parseia o arquivo JSON que está na mesma pasta do script.
 * @param fileName O nome do arquivo JSON (ex: 'dados.json')
 */
function carregarDadosJSON(fileName: string): JsonMedicamentoItem[] {
  try {
    const filePath = path.join(__dirname, fileName);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    if (!Array.isArray(data)) {
      throw new Error('O arquivo JSON não é um array.');
    }

    console.log(`✅ Arquivo JSON '${fileName}' carregado. ${data.length} itens encontrados.`);
    return data as JsonMedicamentoItem[];
  } catch (error) {
    console.error(`💥 Erro fatal ao carregar o arquivo JSON '${fileName}':`, error);
    throw error; // Interrompe a execução se o JSON não puder ser lido
  }
}

/**
 * Busca todos os documentos da coleção de medicamentos especificada no Firebase.
 * @param collectionPath O caminho completo da coleção no Firestore.
 */
async function buscarMedicamentosFirebase(collectionPath: string): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  try {
    const collectionRef = db.collection(collectionPath);
    const snapshot = await collectionRef.get();

    console.log(`✅ Firebase: ${snapshot.docs.length} documentos encontrados em '${collectionPath}'.`);
    return snapshot.docs;
  } catch (error) {
    console.error(`💥 Erro ao buscar documentos do Firebase em '${collectionPath}':`, error);
    throw error;
  }
}

// --- Função Principal ---

/**
 * Executa o script principal para atualizar os documentos no Firebase
 * com o tipo de unidade vindo do arquivo JSON.
 */
async function atualizarTiposUnidadeMedicamentos(): Promise<void> {
  // --- CONFIGURAÇÕES ---
  const JSON_FILE_NAME = 'dados_convertidos.json'; // nome do seu JSON aqui
  const FIREBASE_COLLECTION_PATH = '/municipio/Palmares/unidades/Olavo/medicamentos_unidade'; // mudar para inserir em outras unidades
  // ---------------------

  console.log('🚀 Iniciando script de atualização de tipos de unidade...');

  try {
    // 1. Carregar Dados
    const jsonData = carregarDadosJSON(JSON_FILE_NAME);
    const firestoreDocs = await buscarMedicamentosFirebase(FIREBASE_COLLECTION_PATH);

    // 2. Preparar Dados para Processamento

    // Criar um Map do JSON para busca rápida (O(1))
    // Chave: cod, Valor: item do JSON
    const jsonMap = new Map<string, JsonMedicamentoItem>();
    jsonData.forEach(item => {
      if (item.cod) {
        jsonMap.set(String(item.cod).trim(), item);
      }
    });

    // 3. Processar e Comparar

    const batch = db.batch(); // Usar um batch para atualizações eficientes
    let updatesCount = 0;

    // Para logs de itens não encontrados
    const jsonCodsEncontradosNoFirebase = new Set<string>();
    const medicamentosFirebaseNaoEncontradosNoJson: { id: string, cod_item: number, nome: string }[] = [];

    console.log('🔄️ Comparando documentos do Firebase com o JSON...');

    // Loop 1: Iterar sobre os documentos do Firebase
    for (const doc of firestoreDocs) {
      const docData = doc.data() as MedicamentoFirebaseDoc;
      const codItem = docData.cod_item;

      // Garantir que o documento do Firebase tem o campo 'cod_item'
      if (!codItem) {
        console.warn(`⚠️ Documento ${doc.id} (nome: ${docData.nome || 'N/A'}) no Firebase não possui 'cod_item'. Pulando.`);
        continue;
      }

      // Buscar o 'cod_item' do Firebase no nosso Map do JSON
      const jsonItem = jsonMap.get(String(codItem).trim());

      if (jsonItem) {
        // --- SUCESSO: Encontrou correspondência ---

        // Marcar que este código do JSON foi encontrado
        jsonCodsEncontradosNoFirebase.add(String(codItem).trim());
        const tipoUnidade = jsonItem.unidade;

        if (tipoUnidade !== undefined && tipoUnidade !== null) {
          // Adiciona a operação ao batch.
          // ISSO APENAS ADICIONA/ATUALIZA O CAMPO 'tp_unidade_medicamento'.
          // NENHUM OUTRO DADO É ALTERADO.
          batch.update(doc.ref, { tp_unidade_medicamento: tipoUnidade });
          updatesCount++;
        } else {
          console.warn(`⚠️ Item ${codItem} (${jsonItem.descricao}) encontrado no JSON, mas o campo 'unidade' está vazio. Nenhum update para ${doc.id}.`);
        }

      } else {
        // --- FALHA: Item do Firebase não encontrado no JSON ---
        medicamentosFirebaseNaoEncontradosNoJson.push({
          id: doc.id,
          cod_item: codItem,
          nome: docData.nome || 'Nome não disponível'
        });
      }
    }

    // 4. Encontrar Itens do JSON que não estão no Firebase

    // Loop 2: Iterar sobre o Map do JSON para encontrar os não-encontrados
    const medicamentosJsonNaoEncontradosNoFirebase: JsonMedicamentoItem[] = [];
    jsonMap.forEach((jsonItem, cod) => {
      if (!jsonCodsEncontradosNoFirebase.has(cod)) {
        // --- FALHA: Item do JSON não encontrado no Firebase ---
        medicamentosJsonNaoEncontradosNoFirebase.push(jsonItem);
      }
    });

    // 5. Enviar Atualizações para o Firebase

    if (updatesCount > 0) {
      console.log(`\n⬆️ Executando batch para atualizar ${updatesCount} documentos...`);
      await batch.commit();
      console.log('✅ Batch de atualizações concluído com sucesso!');
    } else {
      console.log('\nℹ️ Nenhum documento precisou ser atualizado.');
    }

    // 6. Gerar Logs de Itens Não Encontrados

    console.log('\n--- 📊 Relatório de Execução ---');

    // Log 1: JSON -> Firebase (Não encontrados no FB)
    if (medicamentosJsonNaoEncontradosNoFirebase.length > 0) {
      console.warn(`\n🟡 ${medicamentosJsonNaoEncontradosNoFirebase.length} MEDICAMENTOS DO JSON NÃO FORAM ENCONTRADOS NO FIREBASE:`);
      medicamentosJsonNaoEncontradosNoFirebase.forEach(item => {
        console.warn(`  - [JSON] Cod: ${item.cod}, Desc: ${item.descricao}`);
      });
    } else {
      console.log('\n✅ Todos os medicamentos do JSON foram encontrados no Firebase.');
    }

    // Log 2: Firebase -> JSON (Não encontrados no JSON)
    if (medicamentosFirebaseNaoEncontradosNoJson.length > 0) {
      console.warn(`\n🟡 ${medicamentosFirebaseNaoEncontradosNoJson.length} MEDICAMENTOS DO FIREBASE NÃO FORAM ENCONTRADOS NO JSON:`);
      medicamentosFirebaseNaoEncontradosNoJson.forEach(item => {
        console.warn(`  - [FIREBASE] ID: ${item.id}, Cod: ${item.cod_item}, Nome: ${item.nome}`);
      });
    } else {
      console.log('\n✅ Todos os medicamentos do Firebase foram encontrados no JSON.');
    }

    console.log('\n🎉 Script de atualização concluído!');

  } catch (error) {
    console.error('💥 Erro fatal durante a execução do script:', error);
  }
}

// Para executar o script (descomente se for rodar este arquivo diretamente)
atualizarTiposUnidadeMedicamentos().catch(e => console.error('Erro na execução principal:', e));