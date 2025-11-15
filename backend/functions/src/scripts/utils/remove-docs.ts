import readline from 'readline';
import { DocumentReference } from 'firebase-admin/firestore';
import { db } from '../../config/firebase';
// Regex para encontrar IDs no formato "xxx.xxx.xxx"
const idPattern = /^\d{3}\.\d{3}\.\d{3}$/;

// Função para criar uma interface de terminal para perguntas
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => 
  new Promise(resolve => rl.question(query, resolve));

// Definindo um tipo para o objeto que vamos armazenar
type DocumentToDelete = {
  id: string;
  ref: DocumentReference;
};

/**
 * Função principal do script
 */
async function findAndDestroy(): Promise<void> {
  console.log('Iniciando busca por medicamentos com ID no padrão "xxx.xxx.xxx"...\n');

  const docsToDelete: DocumentToDelete[] = [];
  const rootPath = 'municipio/Palmares/unidades';

  try {
    console.log(`[INFO] 🔍 Buscando documentos na coleção: '${rootPath}'`);
    const unidadesRef = db.collection(rootPath);
    const unidadesSnapshot = await unidadesRef.get();

    console.log(`[INFO] 📂 Encontradas ${unidadesSnapshot.size} unidades de saúde para verificar.`);

    if (unidadesSnapshot.empty) {
      console.log('\nNenhuma unidade encontrada no caminho especificado. Verifique o caminho e os dados no Firestore.');
      return;
    }
    
    console.log('---'); // Separador visual

    // Loop principal sobre cada documento de unidade de saúde
    for (const unidadeDoc of unidadesSnapshot.docs) {
      console.log(`\n[PROCESSANDO] Unidade: '${unidadeDoc.id}' (caminho: ${unidadeDoc.ref.path})`);

      // CORREÇÃO: Acessa a coleção 'medicamentos_unidade' DIRETAMENTE dentro da unidade
      const medicamentosRef = unidadeDoc.ref.collection('medicamentos_unidade');
      const medicamentosSnapshot = await medicamentosRef.get();
      let matchesInThisCollection = 0;

      if (medicamentosSnapshot.empty) {
        console.log(`  -> [AVISO] Nenhuma subcoleção 'medicamentos_unidade' encontrada ou está vazia. Pulando.`);
        continue;
      }

      medicamentosSnapshot.forEach((medDoc) => {
        // Verifica se o ID do documento de medicamento corresponde ao padrão
        if (idPattern.test(medDoc.id)) {
          matchesInThisCollection++;
          docsToDelete.push({ id: medDoc.id, ref: medDoc.ref });
        }
      });

      // [LOG] Relatório final para a coleção de medicamentos da unidade atual
      console.log(`  -> Verificando subcoleção 'medicamentos_unidade': Encontrados ${medicamentosSnapshot.size} documentos. (${matchesInThisCollection} correspondem ao padrão).`);
    }

    console.log('\n---\n[RESULTADO DA BUSCA]'); // Separador visual para o resultado

    if (docsToDelete.length === 0) {
      console.log('✅ Nenhum documento correspondente ao padrão foi encontrado em nenhuma das coleções verificadas.');
      return;
    }

    console.log('⚠️ Documentos encontrados para exclusão:');
    docsToDelete.forEach(doc => console.log(`  - ${doc.id}`));
    console.log(`\nTotal de documentos a serem excluídos: ${docsToDelete.length}`);

    const answer = await question('\nVocê confirma a exclusão definitiva desses documentos? (s/n) ');

    if (answer.toLowerCase() !== 's') {
      console.log('Operação cancelada pelo usuário.');
      return;
    }

    console.log('\nExcluindo documentos...');
    const batch = db.batch();
    docsToDelete.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    console.log(`\n✅ Sucesso! ${docsToDelete.length} documentos foram excluídos.`);

  } catch (error) {
    console.error('Ocorreu um erro durante a execução do script:', error);
  } finally {
    rl.close();
  }
}

// Executa a função
findAndDestroy();