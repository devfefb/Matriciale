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
 * Calcula todas as medianas com base no histórico de semanas com consumo.
 * @param { {week: string, value: number}[] } historicoSemanas - Array de objetos com semana e valor (já filtrado).
 * @returns {object} - Um objeto contendo todas as medianas calculadas.
 */
function calcularMedianasParaHistorico(historicoSemanas) {
    // Extrai apenas os valores para os cálculos
    const valores = historicoSemanas.map(item => item.value);

    // Função para calcular a mediana de uma fatia do array de valores
    const calcularMedianaDeSlice = (data) => {
        // Reutilize sua função `calcularMediana` aqui.
        // Ela já trata o caso de array vazio retornando 0.
        return calcularMediana(data); 
    };

    // Obtém o ano atual para o cálculo de "MdAno"
    const anoAtual = new Date().getFullYear().toString();
    const valoresAnoAtual = historicoSemanas
        .filter(item => item.week.startsWith(anoAtual))
        .map(item => item.value);

    return {
        Md04: calcularMedianaDeSlice(valores.slice(-4)),
        Md08: calcularMedianaDeSlice(valores.slice(-8)),
        Md12: calcularMedianaDeSlice(valores.slice(-12)),
        Md16: calcularMedianaDeSlice(valores.slice(-16)),
        Md26: calcularMedianaDeSlice(valores.slice(-26)),
        Md52: calcularMedianaDeSlice(valores.slice(-52)),
        MdAno: calcularMedianaDeSlice(valoresAnoAtual),
        MdTt: calcularMedianaDeSlice(valores) // Mediana de todo o período com consumo
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
        
        const dadosPlanilha = xlsx.utils.sheet_to_json(sheet, { defval: 0 });
        
        const primeirosMedicamentos = dadosPlanilha.slice(0, 1);
        
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
                .sort(); // <-- ADICIONE AQUI

            // Dentro do seu loop principal, ao processar cada medicamento
            const historicoSemanas = colunasSemanas.map(semana => {
                const rawValue = medicamento[semana];
                const value = Number(rawValue);
                return {
                    week: semana,
                    value: !isNaN(value) && value > 0 ? rawValue : 0
                };
            });

            console.log('historicoSemanas:', historicoSemanas);

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