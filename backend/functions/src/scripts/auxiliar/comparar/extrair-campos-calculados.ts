import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

type GenericRow = { [key: string]: any };

type UnidadeKey = 'CAF' | 'ESF3' | 'Olavo';

const SHEET_TO_UNIDADE: Record<string, UnidadeKey> = {
  'MetodologiaCAF': 'CAF',
  'MetodoESF3': 'ESF3',
  'MetodoOlavo': 'Olavo',
};

// Campos esperados por unidade (ESF3 usa Cont49 e Md49; demais usam Cont52 e Md52)
const CAMPOS_COMUNS = [
  'NOME ITEM',
  'Total Geral',
  'Md04', 'Md08', 'Md12', 'Md16', 'Md26', /* Md52 ou Md49 (definido por unidade) */ 'MdAno', 'MdTt',
  'Máximo',
  'Metodo',
  'MetEst',
  'Estoque',
  'Reposição',
  'Cont04', 'Cont08', 'Cont12', 'Cont16', 'Cont26',
  // Cont52 ou Cont49 (definido por unidade)
  'ContAno', 'ContTt',
  'TP_Metodo'
] as const;

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function selecionarCampos(row: GenericRow, unidade: UnidadeKey): GenericRow {
  const result: GenericRow = {};

  for (const campo of CAMPOS_COMUNS) {
    // Md52/Md49 e Cont52/Cont49 são tratados mais abaixo por unidade
    result[campo] = row.hasOwnProperty(campo) ? row[campo] : null;
  }

  if (unidade === 'ESF3') {
    // ESF3 deve usar Md49 e Cont49
    result['Md49'] = row.hasOwnProperty('Md49') ? row['Md49'] : null;
    delete result['Md52'];
    result['Cont49'] = row.hasOwnProperty('Cont49') ? row['Cont49'] : null;
    // Garantir que não vaze Cont52 na saída de ESF3
    delete result['Cont52'];
  } else {
    // CAF e Olavo devem usar Md52 e Cont52
    result['Md52'] = row.hasOwnProperty('Md52') ? row['Md52'] : null;
    delete result['Md49'];
    result['Cont52'] = row.hasOwnProperty('Cont52') ? row['Cont52'] : null;
    // Não incluir Cont49 nas demais
    delete result['Cont49'];
  }

  return result;
}

function lerAba(workbook: XLSX.WorkBook, sheetName: string): GenericRow[] {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];
  const rows = XLSX.utils.sheet_to_json<GenericRow>(worksheet, { defval: null, raw: true });
  // Filtrar linhas que possuam NOME ITEM
  return rows.filter((r) => r && (r['NOME ITEM'] !== null && r['NOME ITEM'] !== undefined && String(r['NOME ITEM']).trim() !== ''));
}

export function extrairCamposCalculados(): { unidade: Record<UnidadeKey, GenericRow[]> } {
  const arquivoEntrada = path.join(
    __dirname,
    '../../dados/Palmares/[Completo] Saída - Palmares - Base de Movimentações.xlsx'
  );

  if (!fs.existsSync(arquivoEntrada)) {
    throw new Error(`Arquivo não encontrado: ${arquivoEntrada}`);
  }

  const workbook = XLSX.readFile(arquivoEntrada);

  const resultado: { unidade: Record<UnidadeKey, GenericRow[]> } = {
    unidade: {
      CAF: [],
      ESF3: [],
      Olavo: [],
    },
  };

  for (const sheetName of workbook.SheetNames) {
    const unidade = SHEET_TO_UNIDADE[sheetName];
    if (!unidade) continue; // ignora abas não mapeadas

    const linhas = lerAba(workbook, sheetName);

    for (const linha of linhas) {
      const selecionado = selecionarCampos(linha, unidade);
      resultado.unidade[unidade].push(selecionado);
    }
  }

  return resultado;
}

export function salvarResultadoEmJson(dados: { unidade: Record<UnidadeKey, GenericRow[]> }): string {
  const saidaDir = path.join(__dirname, 'output');
  ensureDirectoryExists(saidaDir);
  const arquivoSaida = path.join(saidaDir, 'campos-calculados.json');
  fs.writeFileSync(arquivoSaida, JSON.stringify(dados, null, 2), 'utf8');
  return arquivoSaida;
}

// Execução direta opcional
if (require.main === module) {
  const dados = extrairCamposCalculados();
  const caminho = salvarResultadoEmJson(dados);
  // eslint-disable-next-line no-console
  console.log(`Arquivo gerado em: ${caminho}`);
}


