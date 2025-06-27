const itensMovimentados = [
    "AAS - ÁCIDO ACETIL SALICILICO 100MG",
]

const inventoryData = {
    // vem de movimentacao
    "periodo_inicio": null, // segunda a domingo (6 dias) a data inicio se refere a um dia apos a data do SALDO ANTERIOR 
                            // (no caso desse exemplo seria 26/05/2025) -> A data que consta no cabeçalho é dispensável pois é possível realizar o cálculo do intervalo da semana da seguinte forma:
                            // o SALDO ANTERIOR sempre faz referência à quantidade do item ao final do dia anterior ao dia inicial da semana (isto é, dia do início - 1). 
                            // Sendo assim, basta pegar a data de SALDO ANTERIOR e iterar 1, que você saberá o dia que a semana se inicia. A partir disso, some 6 dias e obterá o último dia da semana. 
                            // Dessa forma, obtendo tanto o dia inicial e o dia final, calcule o intervalo de dias.
    // vem de movimentacao
    "periodo_fim": null,     // seria seis dias após (calcular com base em calendario real do ano)
    "itens": [ // vamos iterar sobre os itens validos, que são os itens que possuem movimentações)
        // para obter os itens que possuem movimentacoes, vamos consultar a planilha de balancete e realizar a seguinte checagem:
        //- Se os campos qtd_entradas_periodo, qtd_saidas_periodo forem zero, o item em questão não estará nas movimentações por razões óbvias, 
        // então não constará na lista. o primeiro passo é obter a lista de itens que possuem movimentações.

        // o segundo passo é obter as informacoes de cada movimentacao referente a cada item
        {
            "cod_sistemico_item": "325.023.001", // vem de balancete
            "descricao_item": "AAS - ÁCIDO ACETIL SALICILICO 100MG", // vem de balancete
            "tipo_unid_item": "CP", // vem de balancete
            "movimentacoes": [
                {
                    "data_movimentacao": "25/05/2025", // vem de movimentacao   
                    "historico": "SALDO ANTERIOR", // vem de movimentacao
                    "documento": null, // vem de movimentacao
                    "requisicao": '', // vem de movimentacao
                    "entradas": null, // vem de movimentacao
                    "saidas": 0, // vem de movimentacao
                    "estoque": 12.290, // vem de movimentacao
                    "observacao": '' // vem de movimentacao
                },
                {
                    "data_movimentacao": "27/05/2025",
                    "historico": "FARMACIA OLAVO DOMINGUES",
                    "documento": null,
                    "requisicao": '0000874/2025',
                    "entradas": null,
                    "saidas": 500,
                    "estoque": 11790,
                    "observacao": "Transferência nº 2063"
                },
                {
                    "data_movimentacao": "29/05/2025",
                    "historico": "UBS III OLAVO DOMINGUES",
                    "documento": null,
                    "requisicao": '0000891/2025',
                    "entradas": null,
                    "saidas": 20,
                    "estoque": 11770,
                    "observacao": "Transferência nº 2073"
                }
            ]
        },
    ]
};

// 1a coluna: cod_sistemico_item
// 2a coluna: descricao_item
// 3a coluna: tipo_unid_item
// 4a coluna: qtd_periodo_inicial
// 5a coluna: valor_item_periodo_inicial
// 6a coluna: qtd_entradas_periodo
// 7a coluna: valor_entradas_periodo
// 8a coluna: qtd_saidas_periodo
// 9a coluna: valor_saidas_periodo
// 10a coluna: qtd_periodo_final
// 11a coluna: valor_unitario_periodo_final
// 12a coluna: valor_item_periodo_final
