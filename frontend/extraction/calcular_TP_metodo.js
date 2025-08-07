import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- FUNÇÃO DE CÁLCULO DE CONTAGEM (do script anterior) ---

/**
 * Calcula as contagens de semanas com movimentação (valor > 0).
 * @param { {week: string, value: number}[] } historicoSemanas - Array de objetos com semana e valor.
 * @returns {object} - Um objeto contendo todas as contagens calculadas.
 */
function calcularContagensParaHistorico(historicoSemanas) {
    const contarUltimas = (n) => {
        const ultimasNSemanas = historicoSemanas.slice(-n); // já está em ordem correta
        return ultimasNSemanas.filter(s => s.value > 0).length;
    };

    const cont04 = contarUltimas(4);
    const cont08 = contarUltimas(8);
    const cont12 = contarUltimas(12);
    const cont16 = contarUltimas(16);
    const cont26 = contarUltimas(26);
    const cont52 = contarUltimas(52);

    const contTotal = historicoSemanas.filter(s => s.value > 0).length;

    let contAno = 0;
    if (historicoSemanas.length > 0) {
        const anoMaisRecente = historicoSemanas[historicoSemanas.length - 1].week.substring(0, 4);
        contAno = historicoSemanas
            .filter(s => s.week.startsWith(anoMaisRecente) && s.value > 0)
            .length;
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


// --- FUNÇÃO DE CLASSIFICAÇÃO TP_METODO (LÓGICA CORRIGIDA) ---

/**
 * Calcula o TP_metodo baseado nas contagens de ocorrências semanais
 * @param {object} dadosCalculados - Objeto contendo as propriedades 'contagens' e 'semanas'.
 * @returns {string} - Classificação do TP_metodo
 */
function calcularTPMetodo(dadosCalculados) {
    const { contagens, semanas, totalSemanasHistorico } = dadosCalculados;

    // --- REGRA 1: ENTRANTES ---
    // Itens novos que tiveram a primeira ocorrência na última semana. (Contagem total de semanas com movimento = 1)
    if (contagens.ContTt === 1) {
        // Confirma se a única movimentação foi na última semana do histórico
        const ultimaSemanaHistorico = semanas[semanas.length - 1];
        if (ultimaSemanaHistorico && ultimaSemanaHistorico.value > 0) {
            return "5.ENTRANTES";
        }
    }

    // --- REGRA 2: INTERMITENTES ---
    // Se a série histórica for inferior a 52 semanas, APLICA-SE A REGRA.
    // Itens com < 50% de ocorrências nas últimas 52 semanas.
    const periodo = Math.min(totalSemanasHistorico, 52);
    if (periodo > 0 && (contagens.Cont52 / periodo) < 0.5) {
        return "2.INTERMITENTES";
    }

    // --- REGRA 3: INATIVOS ---
    // Itens que não possuíram ocorrências nas últimas 16 semanas.
    if (contagens.Cont16 === 0) {
        return "3.INATIVOS";
    }

    // --- REGRA 4: RECENTES ---
    // Se a série histórica for inferior a 26 semanas, não pode ser RECENTE.
    if (contagens.Cont04 > 0 && (contagens.Cont04 / 4) >= 0.5 && contagens.ContTt === contagens.Cont04) {
        return "4.RECENTES";
    }
    if (contagens.Cont08 > 0 && (contagens.Cont08 / 8) >= 0.5 && contagens.ContTt === contagens.Cont08) {
        return "4.RECENTES";
    }
    if (contagens.Cont12 > 0 && (contagens.Cont12 / 12) >= 0.5 && contagens.ContTt === contagens.Cont12) {
        return "4.RECENTES";
    }
    if (contagens.Cont16 > 0 && (contagens.Cont16 / 16) >= 0.5 && contagens.ContTt === contagens.Cont16) {
        return "4.RECENTES";
    }
    if (contagens.Cont26 > 0 && (contagens.Cont26 / 26) >= 0.5 && contagens.ContTt === contagens.Cont26) {
        return "4.RECENTES";
    }
    
   
    // --- REGRA 5: ORDINÁRIOS (padrão) ---
    // Se não se enquadrar em nenhuma das categorias acima.
    return "1.ORDINÁRIOS";
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
        
        const primeirosMedicamentos = dadosPlanilha.filter(med => med['NOME ITEM']).slice(0, 10);        

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
                    value: !isNaN(value) && value > 0 ? 1 : 0
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