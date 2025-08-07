const { processarModelo, obterAno, obterNumeroSemana, validarIndiceSemana } = require('./calcular_medianas');

// Dados de teste com diferentes anos
const dadosTeste = {
    "cidade_teste": {
        "estoque_teste": [
            {
                "semanas": [
                    {
                        "indice": "2024_01",
                        "qtd_saidas": 100,
                        "medicamentos": [
                            {
                                "nome": "Medicamento Teste 2024",
                                "estoque": 1000,
                                "tipo_movimento": "ORDINÁRIO",
                                "medianas": [],
                                "contagens": [],
                                "metodo": 100,
                                "metest": 200,
                                "reposicao": 0
                            }
                        ],
                        "total_geral": 1000
                    },
                    {
                        "indice": "2024_02",
                        "qtd_saidas": 150,
                        "medicamentos": [
                            {
                                "nome": "Medicamento Teste 2024",
                                "estoque": 950,
                                "tipo_movimento": "ORDINÁRIO",
                                "medianas": [],
                                "contagens": [],
                                "metodo": 100,
                                "metest": 200,
                                "reposicao": 0
                            }
                        ],
                        "total_geral": 950
                    },
                    {
                        "indice": "2025_01",
                        "qtd_saidas": 200,
                        "medicamentos": [
                            {
                                "nome": "Medicamento Teste 2025",
                                "estoque": 1200,
                                "tipo_movimento": "ORDINÁRIO",
                                "medianas": [],
                                "contagens": [],
                                "metodo": 150,
                                "metest": 300,
                                "reposicao": 0
                            }
                        ],
                        "total_geral": 1200
                    },
                    {
                        "indice": "2025_02",
                        "qtd_saidas": 250,
                        "medicamentos": [
                            {
                                "nome": "Medicamento Teste 2025",
                                "estoque": 1150,
                                "tipo_movimento": "ORDINÁRIO",
                                "medianas": [],
                                "contagens": [],
                                "metodo": 150,
                                "metest": 300,
                                "reposicao": 0
                            }
                        ],
                        "total_geral": 1150
                    }
                ]
            }
        ]
    }
};

// Testar as funções
console.log('=== Teste das Funções ===');
console.log('Ano de "2024_01":', obterAno("2024_01"));
console.log('Ano de "2025_15":', obterAno("2025_15"));
console.log('Semana de "2024_01":', obterNumeroSemana("2024_01"));
console.log('Semana de "2025_15":', obterNumeroSemana("2025_15"));
console.log('Validação "2024_01":', validarIndiceSemana("2024_01"));
console.log('Validação "2024_1":', validarIndiceSemana("2024_1")); // Inválido
console.log('Validação "2024_01_extra":', validarIndiceSemana("2024_01_extra")); // Inválido

console.log('\n=== Processando Dados de Teste ===');
const { resultado, estatisticas } = processarModelo(dadosTeste);

console.log('\nEstatísticas:');
console.log('- Cidades:', estatisticas.cidades);
console.log('- Tipos de estoque:', estatisticas.tiposEstoque);
console.log('- Estoques:', estatisticas.estoques);
console.log('- Semanas:', estatisticas.semanas);
console.log('- Medicamentos:', estatisticas.medicamentos);
console.log('- Anos encontrados:', Array.from(estatisticas.anosEncontrados).sort());

console.log('\n=== Resultado Processado ===');
console.log(JSON.stringify(resultado, null, 2)); 