import * as XLSX from 'xlsx';
import { db } from '../../config/firebase'; 

const NOME_ARQUIVO = './src/scripts/inserir_semanas/base_separada.xlsx'; 
const ABAS_ALVO = ['CAF_Faltantes', 'Olavo_Faltantes', 'ESF3_Faltantes'];

// Índices
const IDX_CLASSIFICACAO = 0;
const IDX_NOME = 1;
const IDX_CODIGO = 2;
const IDX_INICIO_MOVIMENTACAO = 3; 
const IDX_FIM_MOVIMENTACAO = 120; 

// Interface (Movimentações como Map/Objeto)
interface MedicamentoNovo {
  classificacao: string;
  nome: string;
  cod_item: string | number;
  estoque: number;
  movimentacoes_semanais: { [semana: string]: number }; 
}

async function inserirMedicamentosCorreto() {
  console.log('--- Iniciando inserção CORRETA (SINTAXE ADMIN SDK) ---');

  try {
    const workbook = XLSX.readFile(NOME_ARQUIVO);

    for (const nomeAba of ABAS_ALVO) {
      const sheet = workbook.Sheets[nomeAba];
      if (!sheet) continue;

      const nomeUnidadeReal = nomeAba.replace('_Faltantes', '');
      console.log(`\n📂 Lendo: ${nomeAba} -> Gravando em: ${nomeUnidadeReal}`);

      const linhas: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (linhas.length < 2) continue;

      const cabecalho = linhas[0]; 
      
      // --- SINTAXE SOLICITADA ---
      const municipioRef = db.collection('municipio').doc('Palmares');
      const unidadeRef = municipioRef.collection('unidades').doc(nomeUnidadeReal);
      const medicamentosRef = unidadeRef.collection('medicamentos_unidade');

      let inseridos = 0;

      for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i];
        if (!linha[IDX_NOME]) continue;

        // Pega o estoque (Coluna após o fim das movimentações)
        const estoqueValor = linha[IDX_FIM_MOVIMENTACAO + 1]; 

        // Montar MAP de Movimentações (Chave = "2025_22", Valor = numero)
        const movimentacoesMap: { [key: string]: number } = {};
        
        for (let j = IDX_INICIO_MOVIMENTACAO; j <= IDX_FIM_MOVIMENTACAO; j++) {
          const valorMov = linha[j];
          const nomeColunaSemana = cabecalho[j]; 

          if (nomeColunaSemana) {
             const chave = String(nomeColunaSemana).trim();
             // Converte para número, se vazio ou texto inválido vira 0
             movimentacoesMap[chave] = Number(valorMov) || 0;
          }
        }

        const novoMedicamento: MedicamentoNovo = {
          classificacao: linha[IDX_CLASSIFICACAO] ? String(linha[IDX_CLASSIFICACAO]) : '',
          nome: String(linha[IDX_NOME]),
          cod_item: linha[IDX_CODIGO] || '', 
          estoque: Number(estoqueValor) || 0,
          movimentacoes_semanais: movimentacoesMap 
        };

        // .add() é o equivalente do Admin SDK para gerar ID automático
        await medicamentosRef.add(novoMedicamento);
        
        inseridos++;
        if (inseridos % 10 === 0) process.stdout.write(`.`);
      }
      console.log(`\n✅ ${inseridos} itens inseridos corretamente em ${nomeUnidadeReal}.`);
    }

    process.exit(0);

  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

inserirMedicamentosCorreto();