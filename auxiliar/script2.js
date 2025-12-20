const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Configurações
const ARQUIVO_ENTRADA = 'base_completa.xlsx';
const ARQUIVO_SAIDA = 'base_separada.xlsx';
const PASTAS = ['CAF', 'Olavo', 'ESF3'];

console.log('🚀 Iniciando separação da planilha...');

try {
    // 1. Carregar a planilha original
    if (!fs.existsSync(ARQUIVO_ENTRADA)) {
        throw new Error(`Arquivo ${ARQUIVO_ENTRADA} não encontrado na raiz.`);
    }
    const workbookEntrada = xlsx.readFile(ARQUIVO_ENTRADA);
    
    // 2. Criar um novo Workbook para o output
    const workbookSaida = xlsx.utils.book_new();

    PASTAS.forEach(nomePasta => {
        console.log(`\n📂 Processando aba: ${nomePasta}`);

        // --- Passo A: Carregar lista de faltantes do TXT ---
        const caminhoTxt = path.join(__dirname, nomePasta, 'medicamentos_faltantes.txt');
        let setFaltantes = new Set();

        if (fs.existsSync(caminhoTxt)) {
            const txtData = fs.readFileSync(caminhoTxt, 'utf8');
            const lista = txtData.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
            setFaltantes = new Set(lista);
            console.log(`   📄 Lista de faltantes carregada: ${setFaltantes.size} itens.`);
        } else {
            console.log(`   ⚠️ Arquivo de faltantes não existe (${caminhoTxt}). Considerando 0 faltantes.`);
        }

        // --- Passo B: Ler a aba correspondente do Excel ---
        const sheet = workbookEntrada.Sheets[nomePasta];
        if (!sheet) {
            console.error(`   ❌ Aba "${nomePasta}" não encontrada no Excel original. Pulando.`);
            return;
        }

        // Converte a aba em uma matriz (array de arrays) para facilitar acesso por índice
        // header: 1 garante que recebemos arrays puros: [ ['col1', 'col2'], ['val1', 'val2'] ]
        const linhas = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        if (linhas.length === 0) return;

        // Separa cabeçalho (linha 0) dos dados
        const cabecalho = linhas[0];
        const dados = linhas.slice(1);

        // Arrays para armazenar as linhas separadas
        // Já iniciamos com o cabeçalho em ambos
        const linhasFaltantes = [cabecalho];
        const linhasResto = [cabecalho];

        // --- Passo C: Iterar e Separar ---
        let contagemFaltantes = 0;
        
        dados.forEach(linha => {
            // A "segunda coluna" é o índice 1 do array (0, 1, 2...)
            // Usamos || '' para evitar erro se a célula estiver vazia
            const nomeItem = (linha[1] || '').toString().trim();

            if (setFaltantes.has(nomeItem)) {
                linhasFaltantes.push(linha);
                contagemFaltantes++;
            } else {
                linhasResto.push(linha);
            }
        });

        // --- Passo D: Criar as novas abas no Workbook de saída ---
        
        // 1. Aba Faltantes
        const wsFaltantes = xlsx.utils.aoa_to_sheet(linhasFaltantes);
        xlsx.utils.book_append_sheet(workbookSaida, wsFaltantes, `${nomePasta}_Faltantes`);

        // 2. Aba Resto
        const wsResto = xlsx.utils.aoa_to_sheet(linhasResto);
        xlsx.utils.book_append_sheet(workbookSaida, wsResto, `${nomePasta}_Resto`);

        console.log(`   ✅ Processado: ${contagemFaltantes} movidos para _Faltantes, ${linhasResto.length - 1} para _Resto.`);
    });

    // 3. Salvar o arquivo final
    xlsx.writeFile(workbookSaida, ARQUIVO_SAIDA);
    console.log(`\n🎉 Processo concluído! Arquivo gerado: ${ARQUIVO_SAIDA}`);

} catch (erro) {
    console.error('❌ Erro fatal:', erro.message);
}