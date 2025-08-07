import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- FUNÇÃO DE CÁLCULO DO MÉTODO---
/**
 * 
 * @param
 * @returns 
 */
function calcularMetodo() {
    
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
        
        const primeirosMedicamentos = dadosPlanilha.filter(med => med['NOME ITEM']).slice(0, 50);        

        if (primeirosMedicamentos.length === 0) {
            console.log("A planilha não contém dados ou está vazia.");
            return;
        }

        console.log(`\n--- INICIANDO A CLASSIFICAÇÃO DO TP_METODO PARA OS 10 PRIMEIROS MEDICAMENTOS ---\n`);

        for (const medicamento of primeirosMedicamentos) {
            if (typeof medicamento !== 'object' || medicamento === null) {
                console.log("AVISO: Linha vazia ou inválida encontrada na planilha. Ignorando...");
                continue;
            }

            const nomeMedicamento = medicamento['NOME ITEM'] || 'Medicamento sem nome';
            console.log(`-----------------------------------------------------------------`);
            console.log(`>> RESULTADOS PARA: ${nomeMedicamento}`);
            console.log(`-----------------------------------------------------------------`);

           const colunasSemanas = Object.keys(medicamento)
                .filter(key => /^\d{4}_\d{2}$/.test(key))
                .sort(); // <-- ADICIONE AQUI

            const historicoSemanas = colunasSemanas.map(semana => {
                const rawValue = medicamento[semana];
                const value = Number(rawValue);
                return {
                    week: semana,
                    value: !isNaN(value) && value > 0 ? rawValue : 0
                };
            });


            // 2. Calcula as contagens
            const contagensCalculadas = calcularContagensParaHistorico(historicoSemanas);
            console.log("Contagens Apuradas:", contagensCalculadas);

            // 3. Prepara o objeto para a função de cálculo do TP_Metodo
            const dadosParaCalculo = {
                contagens: contagensCalculadas,
                semanas: historicoSemanas,
                totalSemanasHistorico: historicoSemanas.length
            };

            // 4. Calcula o TP_Metodo
            const tp_metodo = calcularTPMetodo(dadosParaCalculo);
            
            console.log("TP METODO CLASSIFICADO COMO:");
            console.log(`"${tp_metodo}"`); // Imprime o resultado como string
            console.log("\n");
        }

    } catch (error) {
        console.error("Ocorreu um erro ao processar a planilha:");
        console.error(error.message);
        process.exit(1);
    }
}

main();