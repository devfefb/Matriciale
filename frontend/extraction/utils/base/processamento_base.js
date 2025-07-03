/**
 * Função auxiliar para obter um intervalo de semanas.
 * @param {object} item - O objeto que representa a linha do item.
 * @param {string} startWeek - O nome da coluna da semana inicial (ex: '2023_37').
 * @param {string} endWeek - O nome da coluna da semana final (ex: '2024_52').
 * @returns {number[]} Um array com os valores numéricos das semanas no intervalo.
 */
function getWeeklyRange(item, startWeek, endWeek) {
    const weeklyData = [];
    // Você precisaria de uma lista ordenada de todas as colunas de semana
    // para iterar sobre elas e pegar o range correto.
    // Para simplificar, vou listar as semanas explicitamente como no seu Excel.
    // Em um cenário real, você geraria essa lista dinamicamente.
    const allWeeks = [
        '2023_37', '2023_38', '2023_39', '2023_40', '2023_41', '2023_42', '2023_43', '2023_44',
        '2023_45', '2023_46', '2023_47', '2023_48', '2023_49', '2023_50', '2023_51', '2023_52',
        '2024_01', '2024_02', '2024_03', '2024_04', '2024_05', '2024_06', '2024_07', '2024_08',
        '2024_09', '2024_10', '2024_11', '2024_12', '2024_13', '2024_14', '2024_15', '2024_16',
        '2024_17', '2024_18', '2024_19', '2024_20', '2024_21', '2024_22', '2024_23', '2024_24',
        '2024_25', '2024_26', '2024_27', '2024_28', '2024_29', '2024_30', '2024_31', '2024_32',
        '2024_33', '2024_34', '2024_35', '2024_36', '2024_37', '2024_38', '2024_39', '2024_40',
        '2024_41', '2024_42', '2024_43', '2024_44', '2024_45', '2024_46', '2024_47', '2024_48',
        '2024_49', '2024_50', '2024_51', '2024_52', '2025_01', '2025_02'
    ];

    const startIndex = allWeeks.indexOf(startWeek);
    const endIndex = allWeeks.indexOf(endWeek);

    if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
        console.warn(`Intervalo de semanas inválido: ${startWeek} a ${endWeek}`);
        return [];
    }

    for (let i = startIndex; i <= endIndex; i++) {
        const weekValue = item[allWeeks[i]];
        if (typeof weekValue === 'number' && !isNaN(weekValue)) {
            weeklyData.push(weekValue);
        }
    }
    return weeklyData;
}

/**
 * Função para calcular a mediana de um array de números.
 * @param {number[]} arr - O array de números.
 * @returns {number} A mediana.
 */
function calculateMedian(arr) {
    if (arr.length === 0) return 0; // Se o array estiver vazio, retorna 0 (similar ao Excel ÉERROS)
    const sortedArr = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sortedArr.length / 2);
    return sortedArr.length % 2 !== 0 ? sortedArr[mid] : (sortedArr[mid - 1] + sortedArr[mid]) / 2;
}

/**
 * Processa um único item (linha) para calcular todas as métricas.
 * @param {object} item - O objeto que representa a linha do item.
 * @returns {object} O item com as novas propriedades calculadas.
 */
function processItemMetrics(item) {
    // --- 1. Total Geral ---
    const allWeeksData = getWeeklyRange(item, '2023_37', '2025_02'); // Ajuste o final se tiver mais semanas
    item['Total Geral'] = allWeeksData.reduce((sum, val) => sum + val, 0);

    // --- 2. Medianas ---
    // Funções para Mediana (com tratamento de erro e arredondamento)
    const calculateRoundedMedian = (arr) => {
        if (arr.length === 0) return 0;
        return Math.round(calculateMedian(arr));
    };

    item['Md04'] = calculateRoundedMedian(getWeeklyRange(item, '2024_37', '2024_52'));
    item['Md08'] = calculateRoundedMedian(getWeeklyRange(item, '2024_33', '2024_52'));
    item['Md12'] = calculateRoundedMedian(getWeeklyRange(item, '2024_29', '2024_52'));
    item['Md16'] = calculateRoundedMedian(getWeeklyRange(item, '2024_25', '2024_52'));
    item['Md26'] = calculateRoundedMedian(getWeeklyRange(item, '2024_21', '2024_52'));
    item['Md52'] = calculateRoundedMedian(getWeeklyRange(item, '2024_01', '2024_52'));
    // MdAno: Conforme a fórmula original, considera apenas a última semana de 2024
    item['MdAno'] = calculateRoundedMedian(getWeeklyRange(item, '2024_52', '2024_52'));
    item['MdTt'] = calculateRoundedMedian(getWeeklyRange(item, '2023_37', '2024_52'));


    // --- 3. Contagens de Ocorrências ---
    const countValues = (arr) => arr.length; // Já que getWeeklyRange filtra por números

    item['Cont04'] = countValues(getWeeklyRange(item, '2024_37', '2024_52'));
    item['Cont08'] = countValues(getWeeklyRange(item, '2024_33', '2024_52'));
    item['Cont12'] = countValues(getWeeklyRange(item, '2024_29', '2024_52'));
    item['Cont16'] = countValues(getWeeklyRange(item, '2024_25', '2024_52'));
    item['Cont26'] = countValues(getWeeklyRange(item, '2024_21', '2024_52'));
    item['Cont52'] = countValues(getWeeklyRange(item, '2024_01', '2024_52'));
    item['ContAno'] = countValues(getWeeklyRange(item, '2024_52', '2024_52')); // Apenas a última semana de 2024
    item['ContTt'] = countValues(getWeeklyRange(item, '2023_37', '2024_52'));

    // --- 4. Máximo ---
    item['Máximo'] = Math.max(...getWeeklyRange(item, '2023_37', '2024_52'));
    // Se o array estiver vazio, Math.max retornará -Infinity. Adicione um fallback se necessário.
    if (item['Máximo'] === -Infinity) item['Máximo'] = 0;


    // --- 5. TP_Movimento ---
    const has2024_52Data = item['2024_52'] !== undefined && item['2024_52'] !== null && item['2024_52'] !== "";

    if (item['Cont04'] === 1 && item['Cont52'] === 1 && has2024_52Data) {
        item['TP_Movimento'] = "5.ENTRANTES";
    } else if (item['Cont04'] !== 0 && (item['Cont04'] / 4) >= 0.5 && item['Cont52'] === item['Cont04']) {
        item['TP_Movimento'] = "4.RECENTES";
    } else if (item['Cont08'] !== 0 && (item['Cont08'] / 8) >= 0.5 && item['Cont52'] === item['Cont08']) {
        item['TP_Movimento'] = "4.RECENTES";
    } else if (item['Cont12'] !== 0 && (item['Cont12'] / 12) >= 0.5 && item['Cont52'] === item['Cont12']) {
        item['TP_Movimento'] = "4.RECENTES";
    } else if (item['Cont16'] !== 0 && (item['Cont16'] / 16) >= 0.5 && item['Cont52'] === item['Cont16']) {
        item['TP_Movimento'] = "4.RECENTES";
    } else if (item['Cont26'] !== 0 && (item['Cont26'] / 26) >= 0.5 && item['Cont52'] === item['Cont26']) {
        item['TP_Movimento'] = "4.RECENTES";
    } else if (item['Cont04'] === 0 && item['Cont08'] === 0 && item['Cont12'] === 0 && item['Cont16'] === 0) {
        item['TP_Movimento'] = "3.INATIVOS";
    } else if ((item['Cont52'] / 52) < 0.5) {
        item['TP_Movimento'] = "2.INTERMITENTES";
    } else {
        item['TP_Movimento'] = "1.ORDINÁRIOS";
    }

    // --- 6. Metodo ---
    if (item['Cont04'] === 1 && item['Cont52'] === 1 && has2024_52Data) {
        item['Metodo'] = item['2024_52'];
    } else if (item['TP_Movimento'] === "4.RECENTES") { // Simplificado, já que todas as condições "RECENTES" levam ao mesmo MAXIMO
        item['Metodo'] = Math.max(item['Md04'], item['Md08'], item['Md12'], item['Md16'], item['Md26'], item['Md52'], item['MdAno'], item['MdTt']);
    } else if (item['TP_Movimento'] === "3.INATIVOS") {
        item['Metodo'] = 0;
    } else if (item['TP_Movimento'] === "2.INTERMITENTES") {
        // A fórmula original do Excel usa Total Geral / 52.
        // A descrição do fluxograma diz Máxima / 4.
        // Vou seguir a fórmula do Excel (Total Geral / 52), mas fique atento à discrepância.
        let calculatedValue = item['Total Geral'] / 52;
        item['Metodo'] = Math.round(calculatedValue < 1 ? 1 : calculatedValue);
    } else { // "1.ORDINÁRIOS"
        item['Metodo'] = Math.max(item['Md04'], item['Md08'], item['Md12'], item['Md16'], item['Md26'], item['Md52'], item['MdAno'], item['MdTt']);
    }


    // --- 7. MetEst (Estoque Ideal) ---
    // Considerando o padrão de 3 semanas para farmácias.
    // Se for CAF, o fator seria diferente (12 a 16).
    const semanasEstrategicas = 3;
    item['MetEst'] = item['Metodo'] * semanasEstrategicas;

    // --- 8. Reposição ---
    // 'Estoque' deve ser uma coluna existente no seu objeto item,
    // que viria do campo 'qtd_periodo_final' do balancete.
    // Se não estiver no mesmo objeto, você precisará buscá-lo.
    const estoqueAtual = item['Estoque'] || 0; // Usar 0 se a coluna 'Estoque' não existir ou for nula
    const diferenca = item['MetEst'] - estoqueAtual;
    item['Reposição'] = diferenca < 0 ? 0 : diferenca;

    return item;
}

// --- Exemplo de como usar a função ---
const dadosItens = [
    {
        "CLASSIFICACAO": "REMUME",
        "NOME ITEM": "AAS - ÁCIDO ACETIL SALICILICO 100MG",
        "COD_ITEM": "325.023.001",
        "2023_37": 100, "2023_38": 120, "2023_39": 80, "2023_40": 90, "2023_41": 110, "2023_42": 70, "2023_43": 60, "2023_44": 130, "2023_45": 100, "2023_46": 90, "2023_47": 110, "2023_48": 80, "2023_49": 120, "2023_50": 90, "2023_51": 100, "2023_52": 70,
        "2024_01": 50, "2024_02": 55, "2024_03": 60, "2024_04": 65, "2024_05": 70, "2024_06": 75, "2024_07": 80, "2024_08": 85, "2024_09": 90, "2024_10": 95, "2024_11": 100, "2024_12": 105, "2024_13": 110, "2024_14": 115, "2024_15": 120, "2024_16": 125, "2024_17": 130, "2024_18": 135, "2024_19": 140, "2024_20": 145, "2024_21": 150, "2024_22": 155, "2024_23": 160, "2024_24": 165, "2024_25": 170, "2024_26": 175, "2024_27": 180, "2024_28": 185, "2024_29": 190, "2024_30": 195, "2024_31": 200, "2024_32": 205, "2024_33": 210, "2024_34": 215, "2024_35": 220, "2024_36": 225, "2024_37": 230, "2024_38": 235, "2024_39": 240, "2024_40": 245, "2024_41": 250, "2024_42": 255, "2024_43": 260, "2024_44": 265, "2024_45": 270, "2024_46": 275, "2024_47": 280, "2024_48": 285, "2024_49": 290, "2024_50": 295, "2024_51": 300, "2024_52": 310,
        "2025_01": 20, "2025_02": 30, // Exemplo de semanas futuras, se existirem na sua planilha
        "Estoque": 1500 // Exemplo de valor para a coluna 'Estoque'
    },
    {
        "CLASSIFICACAO": "ASSISTENCIAL",
        "NOME ITEM": "ACICLOVIR 200 MG CPR",
        "COD_ITEM": "325.025.001",
        "2023_37": 0, "2023_38": 0, "2023_39": 0, "2023_40": 0, "2023_41": 0, "2023_42": 0, "2023_43": 0, "2023_44": 0, "2023_45": 0, "2023_46": 0, "2023_47": 0, "2023_48": 0, "2023_49": 0, "2023_50": 0, "2023_51": 0, "2023_52": 0,
        "2024_01": 0, "2024_02": 0, "2024_03": 0, "2024_04": 0, "2024_05": 0, "2024_06": 0, "2024_07": 0, "2024_08": 0, "2024_09": 0, "2024_10": 0, "2024_11": 0, "2024_12": 0, "2024_13": 0, "2024_14": 0, "2024_15": 0, "2024_16": 0, "2024_17": 0, "2024_18": 0, "2024_19": 0, "2024_20": 0, "2024_21": 0, "2024_22": 0, "2024_23": 0, "2024_24": 0, "2024_25": 0, "2024_26": 0, "2024_27": 0, "2024_28": 0, "2024_29": 0, "2024_30": 0, "2024_31": 0, "2024_32": 0, "2024_33": 0, "2024_34": 0, "2024_35": 0, "2024_36": 0, "2024_37": 0, "2024_38": 0, "2024_39": 0, "2024_40": 0, "2024_41": 0, "2024_42": 0, "2024_43": 0, "2024_44": 0, "2024_45": 0, "2024_46": 0, "2024_47": 0, "2024_48": 0, "2024_49": 0, "2024_50": 0, "2024_51": 0, "2024_52": 500, // Primeira e única ocorrência
        "2025_01": 0, "2025_02": 0,
        "Estoque": 500
    }
];

// Loop para processar todos os itens
const processedData = dadosItens.map(item => processItemMetrics(item));

console.log(JSON.stringify(processedData, null, 2));