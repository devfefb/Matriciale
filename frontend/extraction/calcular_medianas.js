import fs from 'fs'
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- FUNÇÕES DE CÁLCULO (COM AJUSTE FINAL) ---

function calcularMediana(numeros) {
    if (!Array.isArray(numeros) || numeros.length === 0) {
        return 0;
    }
    const numerosValidos = numeros.filter(n => typeof n === 'number' && !isNaN(n) && n !== '');
    if (numerosValidos.length === 0) {
        return 0;
    }
    const sorted = [...numerosValidos].sort((a, b) => a - b);
    const middleIndex = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
        return sorted[middleIndex];
    }
    return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
}

/**
 * Calcula todas as medianas com base no histórico completo de semanas.
 * @param { {week: string, value: number}[] } historicoSemanas - Array de objetos com semana e valor.
 * @returns {object} - Um objeto contendo todas as medianas calculadas.
 */
function calcularMedianasParaHistorico(historicoSemanas) {
    // Extrai apenas os valores para os cálculos gerais
    const historicoValores = historicoSemanas.map(s => s.value);

    // --- LÓGICA Md52: Mediana das últimas 52 semanas ---
    const md52 = calcularMediana(historicoValores.slice(-52));

    // --- LÓGICA MdAno: Mediana das semanas do ano mais recente ---
    let mdAno = 0;
    if (historicoSemanas.length > 0) {
        // Pega a última semana para descobrir qual é o "ano atual"
        const anoMaisRecente = historicoSemanas[historicoSemanas.length - 1].week.substring(0, 4);

        // Filtra o histórico para pegar valores apenas desse ano
        const valoresDoAno = historicoSemanas
            .filter(s => s.week.startsWith(anoMaisRecente))
            .map(s => s.value);
            
        mdAno = calcularMediana(valoresDoAno);
    }
    
    // --- Outras medianas ---
    const md04 = calcularMediana(historicoValores.slice(-4));
    const md08 = calcularMediana(historicoValores.slice(-8));
    const md12 = calcularMediana(historicoValores.slice(-12));
    const md16 = calcularMediana(historicoValores.slice(-16));
    const md26 = calcularMediana(historicoValores.slice(-26));
    const mdTotal = calcularMediana(historicoValores);

    return {
        "Md04": Math.round(md04),
        "Md08": Math.round(md08),
        "Md12": Math.round(md12),
        "Md16": Math.round(md16),
        "Md26": Math.round(md26),
        "Md52": Math.round(md52),
        "MdAno": Math.round(mdAno), // Lógica corrigida!
        "MdTt": Math.round(mdTotal)
    };
}


// --- FUNÇÃO PRINCIPAL PARA VERIFICAÇÃO ---

function main() {
    try {
        const filePath = path.join(__dirname, 'teste.xlsx');

        if (!fs.existsSync(filePath)) {
            throw new Error(`Arquivo não encontrado no caminho: ${filePath}`);
        }

        console.log("Lendo a planilha 'teste.xlsx'...");
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const dadosPlanilha = xlsx.utils.sheet_to_json(sheet);
        
        const primeirosMedicamentos = dadosPlanilha.slice(0, 5);
        
        if (primeirosMedicamentos.length === 0) {
            console.log("A planilha não contém dados ou está vazia.");
            return;
        }

        console.log(`\n--- INICIANDO CÁLCULO DAS MEDIANAS PARA OS 5 PRIMEIROS MEDICAMENTOS ---\n`);

        for (const medicamento of primeirosMedicamentos) {
            if (typeof medicamento !== 'object' || medicamento === null) {
                console.log("AVISO: Linha vazia ou inválida encontrada na planilha. Ignorando...");
                continue;
            }

            const colunasSemanas = Object.keys(medicamento)
                .filter(key => /^\d{4}_\d{2}$/.test(key))
                .sort();

            // Agora passamos a informação da semana junto com o valor
            const historicoSemanas = colunasSemanas.map(semana => ({
                week: semana,
                value: medicamento[semana]
            }));

            const medianas = calcularMedianasParaHistorico(historicoSemanas);

            const nomeMedicamento = medicamento['NOME ITEM'] || 'Medicamento sem nome';
            console.log(`-----------------------------------------------------------------`);
            console.log(`>> RESULTADOS PARA: ${nomeMedicamento}`);
            console.log(`-----------------------------------------------------------------`);
            
            // Extrai apenas os valores para exibir o histórico de forma limpa
            const historicoValores = historicoSemanas.map(s => s.value);
            console.log("Valores das últimas 12 semanas:", historicoValores.slice(-12).join(', '));
            console.log("Medianas Calculadas:");
            console.log(JSON.stringify(medianas, null, 2));
            console.log("\n");
        }

    } catch (error) {
        console.error("Ocorreu um erro ao processar a planilha:");
        console.error(error.message);
        process.exit(1);
    }
}

main();