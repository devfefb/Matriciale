import * as fs from 'fs';
import { db } from '../../config/firebase';

const UNIDADES = ['CAF', 'Olavo', 'ESF3'];

// Define a estrutura do objeto que será salvo
interface ResumoMedicamento {
  id: string;
  // nome: string;
  // tp_metodo: string;
  cod_item: string;
  // metodo: number;
  estoque: number;
  // status: number;
  met_est: number;
}

async function listarIdsNomes() {
  console.log('--- Iniciando exportação de IDs e Nomes ---\n');

  try {
    for (const unidade of UNIDADES) {
      console.log(`🔄 Lendo dados da unidade: ${unidade}...`);

      const path = `municipio/Palmares/unidades/${unidade}/medicamentos_unidade`;
      const snapshot = await db.collection(path).get();

      const listaMedicamentos: ResumoMedicamento[] = [];

      snapshot.forEach((doc) => {
        const dados = doc.data();
        
        listaMedicamentos.push({
          id: doc.id as string, // O ID do documento (ex: -Mz92...)
          // nome: dados.nome || 'NOME NÃO INFORMADO', // Garante que não quebre se faltar nome,
          // tp_metodo: dados.tp_metodo || 'TP_METODO NÃO INFORMADO', // Garante que não quebre se faltar tp_metodo
          // metodo: dados.metodo || 0, // Garante que não quebre se faltar metodo
          estoque: dados.estoque || 0, // Garante que não quebre se faltar estoque
          // status: dados. estoque / dados.metodo || 0, // Garante que não quebre se faltar status
          cod_item: dados.cod_item || 'CODIGO NÃO INFORMADO', // Garante que não quebre se faltar cod_item
          met_est: dados.met_est || 0, // Garante que não quebre se faltar met_est
        });
      });

      // Define o nome do arquivo de saída
      const nomeArquivo = `lista_${unidade}.json`;

      // Escreve o arquivo no disco
      fs.writeFileSync(nomeArquivo, JSON.stringify(listaMedicamentos, null, 2));
      
      console.log(`✅ Arquivo "${nomeArquivo}" gerado com ${listaMedicamentos.length} itens.`);
    }

    console.log('\n--- Exportação finalizada com sucesso ---');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro durante a exportação:', error);
    process.exit(1);
  }
}

listarIdsNomes();