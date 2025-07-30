import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- FUNÇÃO DE CÁLCULO DE CONTAGEM ---

/**
 * Calcula as contagens de semanas com movimentação (valor > 0).
 * @param { {week: string, value: number}[] } historicoSemanas - Array de objetos com semana e valor.
 * @returns {object} - Um objeto contendo todas as contagens calculadas.
 */
function calcularContagensParaHistorico(historicoSemanas) {
    // Extrai apenas os valores para os cálculos
    const historicoValores = historicoSemanas.map(s => s.value);

    // A lógica é: pegar as últimas N semanas, filtrar as que tiveram valor > 0, e contar o tamanho do array resultante.
    const cont04 = historicoValores.slice(-4).filter(v => v > 0).length;
    const cont08 = historicoValores.slice(-8).filter(v => v > 0).length;
    const cont12 = historicoValores.slice(-12).filter(v => v > 0).length;
    const cont16 = historicoValores.slice(-16).filter(v => v > 0).length;
    const cont26 = historicoValores.slice(-26).filter(v => v > 0).length;
    const cont52 = historicoValores.slice(-52).filter(v => v > 0).length;
    const contTotal = historicoValores.filter(v => v > 0).length;

    // LÓGICA ContAno: Conta as semanas com movimentação (>0) do ano mais recente
    let contAno = 0;
    if (historicoSemanas.length > 0) {
        const anoMaisRecente = historicoSemanas[historicoSemanas.length - 1].week.substring(0, 4);
        const valoresDoAno = historicoSemanas
            .filter(s => s.week.startsWith(anoMaisRecente))
            .map(s => s.value);
        
        contAno = valoresDoAno.filter(v => v > 0).length;
    }

    return {
        "Cont04": cont04,
        "Cont08": cont08,
        "Cont12": cont12,
        "Cont16": cont16,
        "Cont26": cont26,
        "Cont52": cont52,
        "ContAno": contAno,
        "ContTt": contTotal
    };
}


// --- FUNÇÃO PRINCIPAL PARA VERIFICAÇÃO ---

function main() {
    try {
        const filePath = path.join(__dirname, 'teste.xlsx');

        if (!fs.existsSync(filePath)) {
            throw new Error(`Arquivo não encontrado no caminho: ${filePath}`);
        }

        console.log("Lendo a planilha 'teste.xlsx' para cálculo de CONTAGENS...");
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const dadosPlanilha = xlsx.utils.sheet_to_json(sheet);
        
        const primeirosMedicamentos = dadosPlanilha.slice(0, 5);
        
        if (primeirosMedicamentos.length === 0) {
            console.log("A planilha não contém dados ou está vazia.");
            return;
        }

        console.log(`\n--- INICIANDO CÁLCULO DAS CONTAGENS PARA OS 5 PRIMEIROS MEDICAMENTOS ---\n`);

        for (const medicamento of primeirosMedicamentos) {
            if (typeof medicamento !== 'object' || medicamento === null) {
                console.log("AVISO: Linha vazia ou inválida encontrada na planilha. Ignorando...");
                continue;
            }

            const colunasSemanas = Object.keys(medicamento)
                .filter(key => /^\d{4}_\d{2}$/.test(key))
                .sort();

            const historicoSemanas = colunasSemanas.map(semana => ({
                week: semana,
                value: medicamento[semana] || 0 // Garante que o valor seja numérico
            }));

            // Chama a nova função para calcular as contagens
            const contagens = calcularContagensParaHistorico(historicoSemanas);

            const nomeMedicamento = medicamento['NOME ITEM'] || 'Medicamento sem nome';
            console.log(`-----------------------------------------------------------------`);
            console.log(`>> RESULTADOS DE CONTAGEM PARA: ${nomeMedicamento}`);
            console.log(`-----------------------------------------------------------------`);
            
            const historicoValores = historicoSemanas.map(s => s.value);
            console.log("Valores das últimas 12 semanas:", historicoValores.slice(-12).join(', '));
            console.log("Contagens Calculadas:");
            console.log(JSON.stringify(contagens, null, 2));
            console.log("\n");
        }

    } catch (error) {
        console.error("Ocorreu um erro ao processar a planilha:");
        console.error(error.message);
        process.exit(1);
    }
}

// Inicia a execução do script
main();