const fs = require('fs');
const path = require('path');

// Lista das pastas que serão processadas
const PASTAS = ['CAF', 'Olavo', 'ESF3'];

console.log('🚀 Iniciando processamento em lote...\n');

PASTAS.forEach(nomePasta => {
    // Monta os caminhos baseados no padrão: [pasta]/[pasta]-nomearquivo
    const caminhoTxt = path.join(__dirname, nomePasta, `${nomePasta}-medicamentos.txt`);
    const caminhoJson = path.join(__dirname, nomePasta, `${nomePasta}-todos_med.json`);
    const caminhoSaida = path.join(__dirname, nomePasta, 'medicamentos_faltantes.txt');

    console.log(`📂 Verificando pasta: ${nomePasta}`);

    try {
        // 1. Verifica se os arquivos existem antes de tentar ler
        if (!fs.existsSync(caminhoTxt)) {
            console.error(`   ❌ Arquivo TXT não encontrado: ${caminhoTxt}`);
            return;
        }
        if (!fs.existsSync(caminhoJson)) {
            console.error(`   ❌ Arquivo JSON não encontrado: ${caminhoJson}`);
            return;
        }

        // 2. Ler e processar o TXT
        const txtData = fs.readFileSync(caminhoTxt, 'utf8');
        const listaTxt = txtData.split(/\r?\n/).map(linha => linha.trim()).filter(linha => linha !== '');

        // 3. Ler e processar o JSON
        const jsonData = fs.readFileSync(caminhoJson, 'utf8');
        const listaJson = JSON.parse(jsonData);

        // 4. Criar Conjunto (Set) dos nomes do JSON
        const nomesNoJson = new Set(listaJson.map(item => item.nome_item.trim()));

        // 5. Comparar
        const naoEncontrados = listaTxt.filter(nome => !nomesNoJson.has(nome));

        // 6. Gerar Output dentro da própria pasta
        if (naoEncontrados.length > 0) {
            fs.writeFileSync(caminhoSaida, naoEncontrados.join('\n'), 'utf8');
            console.log(`   ✅ Sucesso: ${naoEncontrados.length} medicamentos salvos em "${nomePasta}/medicamentos_faltantes.txt"`);
        } else {
            console.log(`   ✅ Todos os medicamentos já constam no JSON. Nenhum arquivo gerado.`);
        }

    } catch (erro) {
        console.error(`   ❌ Erro crítico na pasta ${nomePasta}:`, erro.message);
    }
    console.log('---'); // Separador visual
});

console.log('🏁 Processamento finalizado.');