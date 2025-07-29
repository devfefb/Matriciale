const fs = require('fs');
const path = require('path');

// Função para calcular a média de um array de números
function calcularMedia(numeros) {
    if (numeros.length === 0) return 0;
    const soma = numeros.reduce((acc, num) => acc + num, 0);
    return soma / numeros.length;
}

// Função para validar o formato do índice da semana
function validarIndiceSemana(indice) {
    const regex = /^\d{4}_\d{2}$/;
    return regex.test(indice);
}

// Função para obter o ano a partir do índice (ex: "2025_01" -> 2025, "2024_15" -> 2024)
function obterAno(indice) {
    const match = indice.match(/(\d{4})_\d+/);
    return match ? parseInt(match[1]) : 0;
}

// Função para obter o número da semana a partir do índice (ex: "2025_01" -> 1, "2024_15" -> 15)
function obterNumeroSemana(indice) {
    const match = indice.match(/\d{4}_(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

// Função para calcular as medianas para um medicamento específico
function calcularMedianasMedicamento(medicamento, semanas) {
    // Ordenar semanas por número da semana para garantir ordem correta
    const semanasOrdenadas = [...semanas].sort((a, b) => {
        const numA = obterNumeroSemana(a.indice);
        const numB = obterNumeroSemana(b.indice);
        return numA - numB;
    });
    
    const qtdSaidas = semanasOrdenadas.map(semana => semana.qtd_saidas || 0);
    
    // Calcular medianas para diferentes períodos
    const md04 = calcularMedia(qtdSaidas.slice(0, 4)); // semanas 1-4
    const md08 = calcularMedia(qtdSaidas.slice(0, 8)); // semanas 1-8
    const md16 = calcularMedia(qtdSaidas.slice(0, 16)); // semanas 1-16
    const md52 = calcularMedia(qtdSaidas.slice(0, 52)); // semanas 1-52
    
    return {
        "Md04": Math.round(md04),
        "Md08": Math.round(md08),
        "Md16": Math.round(md16),
        "Md52": Math.round(md52),
        "MdAno": Math.round(md52), // Assumindo que MdAno é igual a Md52
        "MdTt": Math.round(md52)   // Assumindo que MdTt é igual a Md52
    };
}

// Função principal para processar o modelo
function processarModelo(modelo) {
    const resultado = {};
    const estatisticas = {
        cidades: 0,
        tiposEstoque: 0,
        estoques: 0,
        semanas: 0,
        medicamentos: 0,
        anosEncontrados: new Set()
    };
    
    // Iterar sobre cada cidade
    for (const [cidade, dados] of Object.entries(modelo)) {
        resultado[cidade] = {};
        estatisticas.cidades++;
        
        // Iterar sobre cada tipo de estoque
        for (const [tipoEstoque, estoques] of Object.entries(dados)) {
            resultado[cidade][tipoEstoque] = [];
            estatisticas.tiposEstoque++;
            
            // Iterar sobre cada estoque
            for (const estoque of estoques) {
                const estoqueProcessado = {
                    semanas: []
                };
                estatisticas.estoques++;
                
                // Validar e ordenar semanas por índice para garantir ordem correta
                const semanasOrdenadas = estoque.semanas
                    .filter(semana => validarIndiceSemana(semana.indice))
                    .sort((a, b) => {
                        const numA = obterNumeroSemana(a.indice);
                        const numB = obterNumeroSemana(b.indice);
                        return numA - numB;
                    });
                
                // Coletar anos encontrados
                semanasOrdenadas.forEach(semana => {
                    estatisticas.anosEncontrados.add(obterAno(semana.indice));
                });
                
                // Processar cada semana
                for (const semana of semanasOrdenadas) {
                    const semanaProcessada = {
                        indice: semana.indice,
                        qtd_saidas: semana.qtd_saidas || 0,
                        medicamentos: [],
                        total_geral: semana.total_geral || 0
                    };
                    estatisticas.semanas++;
                    
                    // Processar cada medicamento
                    for (const medicamento of semana.medicamentos) {
                        const medianas = calcularMedianasMedicamento(medicamento, semanasOrdenadas);
                        
                        const medicamentoProcessado = {
                            ...medicamento,
                            medianas: [
                                { "Md04": medianas.Md04 },
                                { "Md08": medianas.Md08 },
                                { "Md012": medianas.Md16 }, // Assumindo que Md012 é Md16
                                { "Md016": medianas.Md16 },
                                { "Md026": medianas.Md16 }, // Assumindo que Md026 é Md16
                                { "Md52": medianas.Md52 },
                                { "MdAno": medianas.MdAno },
                                { "MdTt": medianas.MdTt }
                            ]
                        };
                        
                        semanaProcessada.medicamentos.push(medicamentoProcessado);
                        if (estatisticas.semanas === 1) {
                            estatisticas.medicamentos++;
                        }
                    }
                    
                    estoqueProcessado.semanas.push(semanaProcessada);
                }
                
                resultado[cidade][tipoEstoque].push(estoqueProcessado);
            }
        }
    }
    
    return { resultado, estatisticas };
}

// Função principal
function main() {
    try {
        // Ler o arquivo modelo
        const modeloPath = path.join(__dirname, 'data', 'modelo', 'modelo.json');
        const modeloData = fs.readFileSync(modeloPath, 'utf8');
        const modelo = JSON.parse(modeloData);
        
        console.log('Processando modelo...');
        
        // Processar o modelo
        const { resultado, estatisticas } = processarModelo(modelo);
        
        // Salvar o resultado
        const outputPath = path.join(__dirname, 'data', 'modelo', 'modelo_processado.json');
        fs.writeFileSync(outputPath, JSON.stringify(resultado, null, 4), 'utf8');
        
        console.log(`Modelo processado com sucesso! Arquivo salvo em: ${outputPath}`);
        
        // Mostrar estatísticas detalhadas
        console.log('\nEstatísticas do processamento:');
        console.log(`- Cidades processadas: ${estatisticas.cidades}`);
        console.log(`- Tipos de estoque: ${estatisticas.tiposEstoque}`);
        console.log(`- Total de estoques: ${estatisticas.estoques}`);
        console.log(`- Total de semanas: ${estatisticas.semanas}`);
        console.log(`- Medicamentos por semana: ${estatisticas.medicamentos}`);
        console.log(`- Anos encontrados: ${Array.from(estatisticas.anosEncontrados).sort().join(', ')}`);
        
    } catch (error) {
        console.error('Erro ao processar modelo:', error.message);
        process.exit(1);
    }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
    main();
}

module.exports = {
    processarModelo,
    calcularMedianasMedicamento,
    calcularMedia,
    obterAno,
    obterNumeroSemana,
    validarIndiceSemana
}; 