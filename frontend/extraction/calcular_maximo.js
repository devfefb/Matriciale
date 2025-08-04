import fs from 'fs'
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Calcula todas as medianas com base no histórico completo de semanas.
 * @param { {week: string, value: number}[] } historicoSemanas - Array de objetos com semana e valor.
 * @returns {object} - Um objeto contendo todas as medianas calculadas.
 */
function calcularMaximaMedicamento(historicoSemanas) {

    const valores = historicoSemanas.map(s => s.value);

    const numerosValidos = valores.filter(v => typeof v === 'number' && !isNaN(v));

    if (numerosValidos.length === 0) {
        return 0; 
    }

    return Math.max(...numerosValidos);

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
        
        const primeirosMedicamentos = dadosPlanilha.slice(0, 10);
        
        if (primeirosMedicamentos.length === 0) {
            console.log("A planilha não contém dados ou está vazia.");
            return;
        }

        console.log(`\n--- INICIANDO CÁLCULO DAS MÁXIMA PARA OS 5 PRIMEIROS MEDICAMENTOS ---\n`);

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

            const maxima = calcularMaximaMedicamento(historicoSemanas);

            const nomeMedicamento = medicamento['NOME ITEM'] || 'Medicamento sem nome';
            console.log(`-----------------------------------------------------------------`);
            console.log(`>> RESULTADOS PARA: ${nomeMedicamento}`);
            console.log(`-----------------------------------------------------------------`);
            
            // Extrai apenas os valores para exibir o histórico de forma limpa
            const historicoValores = historicoSemanas.map(s => s.value);
            console.log("Valores das últimas 12 semanas:", historicoValores.slice(-12).join(', '));
            console.log("maxima Calculada:");
            console.log(JSON.stringify(maxima, null, 2));
            console.log("\n");
        }

    } catch (error) {
        console.error("Ocorreu um erro ao processar a planilha:");
        console.error(error.message);
        process.exit(1);
    }
}

main();