const fs = require('fs');
const path = require('path');

/**
 * Calcula o TP_metodo baseado nas contagens de ocorrências semanais
 * @param {Object} medicamento - Objeto do medicamento com contagens e semanas
 * @returns {string} - Classificação do TP_metodo
 */
function calcularTPMetodo(medicamento) {
    const { contagens, semanas } = medicamento;
    
    // Obter a última semana (último item do array de semanas)
    const ultimaSemana = semanas[semanas.length - 1];
    const ultimaSemanaValor = Object.values(ultimaSemana)[0];
    
    // Verificar se é ENTRANTE
    // ENTRANTES – Itens novos que tiveram a primeira ocorrência de dispensação na última semana 
    // (ÚLTIMA SEMANA DIFERENTE DE "NULL" E "ContTt" = 1)
    if (ultimaSemanaValor !== null && ultimaSemanaValor !== 0 && contagens.Tt === 1) {
        return "0.ENTRANTES";
    }
    
    // Verificar se é INATIVO
    // INATIVOS – Itens que não possuíram ocorrências nas últimas 16 semanas. ("Cont16" = 0)
    if (contagens["16"] === 0) {
        return "3.INATIVOS";
    }
    
    // Verificar se é RECENTE
    // RECENTES – Itens que tiveram mais ou igual a 50% de ocorrências nas últimas 26 semanas. 
    // Se a série histórica for inferior à 26 semanas, esses itens serão ORDINÁRIOS. 
    // (Quantidade de ocorrências / "Cont16" >= 50%)
    if (contagens["26"] / contagens["16"] >= 0.5) {
        return "2.RECENTES";
    }
    
    // Verificar se é INTERMITENTE
    // INTERMITENTES – Itens que tiveram menos do que 50% de ocorrências nas últimas 52 semanas 
    // ou a quantidade da série histórica for inferior a 52 semanas. 
    // (Quantidade de ocorrências / "Cont52" < 50%)
    if (contagens["52"] / contagens.Tt < 0.5) {
        return "4.INTERMITENTES";
    }
    
    // Se não se enquadrar em nenhuma das categorias acima, é ORDINÁRIO
    // ORDINÁRIOS – Itens que tiveram mais ou igual a 50% de ocorrências nas últimas 52 semanas 
    // ou a quantidade da série histórica for inferior a 52 semanas. 
    // (Quantidade de ocorrências / "Cont52" >= 50%)
    return "1.ORDINÁRIOS";
}

/**
 * Processa o arquivo JSON e atualiza o TP_metodo para todos os medicamentos
 * @param {string} arquivoPath - Caminho para o arquivo JSON
 */
function processarArquivo(arquivoPath) {
    try {
        // Ler o arquivo JSON
        const dados = JSON.parse(fs.readFileSync(arquivoPath, 'utf8'));
        
        let totalMedicamentos = 0;
        let medicamentosProcessados = 0;
        
        // Percorrer todas as cidades, estoques e medicamentos
        dados.cidades.forEach(cidade => {
            cidade.estoques.forEach(estoque => {
                estoque.medicamentos.forEach(medicamento => {
                    totalMedicamentos++;
                    
                    // Calcular o novo TP_metodo
                    const tpMetodoAnterior = medicamento.TP_metodo;
                    const tpMetodoNovo = calcularTPMetodo(medicamento);
                    
                    // Atualizar o TP_metodo
                    medicamento.TP_metodo = tpMetodoNovo;
                    
                    // Log das mudanças
                    if (tpMetodoAnterior !== tpMetodoNovo) {
                        console.log(`📝 ${medicamento.nome} (${medicamento.cod_item}):`);
                        console.log(`   ${tpMetodoAnterior} → ${tpMetodoNovo}`);
                        console.log(`   Cont16: ${medicamento.contagens["16"]}, Cont26: ${medicamento.contagens["26"]}, Cont52: ${medicamento.contagens["52"]}, ContTt: ${medicamento.contagens.Tt}`);
                        console.log('');
                    } else {
                        console.log(`✅ ${medicamento.nome} (${medicamento.cod_item}): ${tpMetodoNovo} (sem mudança)`);
                    }
                    
                    medicamentosProcessados++;
                });
            });
        });
        
        // Salvar o arquivo atualizado
        fs.writeFileSync(arquivoPath, JSON.stringify(dados, null, 4), 'utf8');
        
        console.log(`\n🎉 Processamento concluído!`);
        console.log(`📊 Total de medicamentos processados: ${medicamentosProcessados}`);
        console.log(`💾 Arquivo salvo: ${arquivoPath}`);
        
    } catch (error) {
        console.error('❌ Erro ao processar o arquivo:', error.message);
    }
}

/**
 * Função principal que executa o script
 */
function main() {
    const arquivoPath = path.join(__dirname, 'data', 'modelo', 'modelo_caf.json');
    
    console.log('🚀 Iniciando cálculo do TP_metodo...');
    console.log(`📁 Arquivo: ${arquivoPath}`);
    console.log('');
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(arquivoPath)) {
        console.error('❌ Arquivo não encontrado:', arquivoPath);
        return;
    }
    
    processarArquivo(arquivoPath);
}

// Executar o script se for chamado diretamente
if (require.main === module) {
    main();
}

module.exports = {
    calcularTPMetodo,
    processarArquivo
}; 