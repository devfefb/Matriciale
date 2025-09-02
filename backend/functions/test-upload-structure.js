/**
 * Script de teste para validar a nova estrutura de upload semanal
 * 
 * Execute com: node test-upload-structure.js
 */

// Dados de teste que simulam o que o frontend enviaria
const dadosTesteSemanal = {
  tipo: 'semanal',
  municipio: 'municipio_teste',
  data_processamento: new Date().toISOString(),
  arquivos: [
    {
      nome_arquivo: 'inventoryDataCAF.json',
      content: {
        periodo_inicio: '15/11/2024',
        periodo_fim: '21/11/2024',
        itens: [
          {
            cod_sistemico_item: '12345',
            descricao_item: 'PARACETAMOL 500MG',
            tipo_unid_item: 'COMP',
            qtd_periodo_inicial: 100,
            valor_item_periodo_inicial: 50.00,
            qtd_entradas_periodo: 200,
            valor_entradas_periodo: 100.00,
            qtd_saidas_periodo: 150,
            valor_saidas_periodo: 75.00,
            qtd_periodo_final: 150,
            valor_unitario_periodo_final: 0.50,
            valor_item_periodo_final: 75.00,
            movimentacoes: [
              {
                data_movimentacao: '14/11/2024',
                historico: 'SALDO ANTERIOR',
                documento: null,
                requisicao: '',
                entradas: null,
                saidas: 0,
                estoque: 100,
                observacao: ''
              },
              {
                data_movimentacao: '15/11/2024',
                historico: 'ENTRADA - COMPRA',
                documento: 'NF001',
                requisicao: '',
                entradas: 200,
                saidas: 0,
                estoque: 300,
                observacao: 'Compra mensal'
              },
              {
                data_movimentacao: '16/11/2024',
                historico: 'SAIDA - DISPENSACAO',
                documento: null,
                requisicao: 'REQ001',
                entradas: null,
                saidas: 150,
                estoque: 150,
                observacao: 'Dispensação normal'
              }
            ]
          }
        ]
      }
    },
    {
      nome_arquivo: 'inventoryDataOlavo.json',
      content: {
        periodo_inicio: '15/11/2024',
        periodo_fim: '21/11/2024',
        itens: [
          {
            cod_sistemico_item: '67890',
            descricao_item: 'DIPIRONA 500MG',
            tipo_unid_item: 'COMP',
            qtd_periodo_inicial: 80,
            valor_item_periodo_inicial: 40.00,
            qtd_entradas_periodo: 100,
            valor_entradas_periodo: 50.00,
            qtd_saidas_periodo: 90,
            valor_saidas_periodo: 45.00,
            qtd_periodo_final: 90,
            valor_unitario_periodo_final: 0.50,
            valor_item_periodo_final: 45.00,
            movimentacoes: [
              {
                data_movimentacao: '14/11/2024',
                historico: 'SALDO ANTERIOR',
                documento: null,
                requisicao: '',
                entradas: null,
                saidas: 0,
                estoque: 80,
                observacao: ''
              },
              {
                data_movimentacao: '17/11/2024',
                historico: 'ENTRADA - TRANSFERENCIA',
                documento: 'TF001',
                requisicao: '',
                entradas: 100,
                saidas: 0,
                estoque: 180,
                observacao: 'Transferência de estoque'
              },
              {
                data_movimentacao: '18/11/2024',
                historico: 'SAIDA - DISPENSACAO',
                documento: null,
                requisicao: 'REQ002',
                entradas: null,
                saidas: 90,
                estoque: 90,
                observacao: 'Dispensação'
              }
            ]
          }
        ]
      }
    }
  ]
};

async function testarEndpoint() {
  console.log('🧪 [TESTE] Iniciando teste da nova estrutura de upload semanal...');
  
  try {
    // Verificar conectividade primeiro
    console.log('🔍 [TESTE] Verificando conectividade...');
    
    const healthResponse = await fetch('http://localhost:3001/health');
    if (!healthResponse.ok) {
      throw new Error(`Health check falhou: ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ [TESTE] Servidor funcionando:', healthData);
    
    // Testar endpoint de upload semanal
    console.log('📤 [TESTE] Enviando dados de teste...');
    
    const response = await fetch('http://localhost:3001/api/upload/semanal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dadosTesteSemanal)
    });
    
    console.log('📡 [TESTE] Resposta recebida:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    const responseText = await response.text();
    console.log('📄 [TESTE] Conteúdo da resposta:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ [TESTE] Erro ao fazer parse do JSON:', parseError);
      throw new Error(`Resposta inválida: ${responseText.substring(0, 200)}...`);
    }
    
    if (response.ok && result.status === 'success') {
      console.log('✅ [TESTE] Upload semanal funcionando!');
      console.log('📊 [TESTE] Resultados:', {
        municipio: result.data.municipio,
        arquivos_processados: result.data.arquivos_processados,
        environment: result.data.environment,
        storage_type: result.data.storage_type,
        arquivos_gerados: result.data.arquivos_gerados
      });
      
      if (result.data.resultados) {
        console.log('📋 [TESTE] Detalhes por arquivo:');
        result.data.resultados.forEach((resultado, index) => {
          console.log(`  ${index + 1}. ${resultado.unidade}: ${resultado.total_itens} itens (${resultado.periodo})`);
          console.log(`     📄 Arquivo: ${resultado.arquivo_salvo}`);
          if (resultado.url) {
            console.log(`     🔗 URL: ${resultado.url}`);
          }
        });
      }
      
      return true;
    } else {
      console.error('❌ [TESTE] Erro no upload:', result.message);
      if (result.details) {
        console.error('❌ [TESTE] Detalhes:', result.details);
      }
      return false;
    }
    
  } catch (error) {
    console.error('❌ [TESTE] Erro no teste:', error.message);
    return false;
  }
}

async function validarEstrutura() {
  console.log('📋 [VALIDAÇÃO] Validando estrutura dos dados de teste...');
  
  // Validar estrutura principal
  const estruturaValida = dadosTesteSemanal.tipo && 
                         dadosTesteSemanal.municipio && 
                         dadosTesteSemanal.arquivos &&
                         Array.isArray(dadosTesteSemanal.arquivos);
                         
  if (!estruturaValida) {
    console.error('❌ [VALIDAÇÃO] Estrutura principal inválida');
    return false;
  }
  
  // Validar cada arquivo
  for (let i = 0; i < dadosTesteSemanal.arquivos.length; i++) {
    const arquivo = dadosTesteSemanal.arquivos[i];
    
    if (!arquivo.nome_arquivo || !arquivo.content) {
      console.error(`❌ [VALIDAÇÃO] Arquivo ${i + 1} inválido: falta nome_arquivo ou content`);
      return false;
    }
    
    const content = arquivo.content;
    if (!content.periodo_inicio || !content.periodo_fim || !content.itens) {
      console.error(`❌ [VALIDAÇÃO] Content do arquivo ${arquivo.nome_arquivo} inválido`);
      return false;
    }
    
    if (!Array.isArray(content.itens)) {
      console.error(`❌ [VALIDAÇÃO] Itens do arquivo ${arquivo.nome_arquivo} deve ser array`);
      return false;
    }
    
    console.log(`✅ [VALIDAÇÃO] Arquivo ${arquivo.nome_arquivo}: ${content.itens.length} itens`);
  }
  
  console.log('✅ [VALIDAÇÃO] Estrutura dos dados é válida');
  return true;
}

// Executar testes
async function executarTestes() {
  console.log('🚀 [INÍCIO] Iniciando validação da nova estrutura de upload semanal');
  console.log('=' * 60);
  
  // 1. Validar estrutura dos dados
  const estruturaOk = await validarEstrutura();
  if (!estruturaOk) {
    console.error('❌ [FALHA] Estrutura de dados inválida');
    process.exit(1);
  }
  
  console.log(''); // Linha em branco
  
  // 2. Testar endpoint
  const endpointOk = await testarEndpoint();
  if (!endpointOk) {
    console.error('❌ [FALHA] Teste do endpoint falhou');
    console.log('💡 [DICA] Certifique-se de que o servidor está rodando: npm run dev');
    process.exit(1);
  }
  
  console.log(''); // Linha em branco
  console.log('🎉 [SUCESSO] Todos os testes passaram!');
  console.log('✅ A nova estrutura de upload semanal está funcionando corretamente');
  console.log('=' * 60);
}

// Verificar se o fetch está disponível (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ Este script requer Node.js 18+ ou instale node-fetch');
  console.log('💡 Para instalar node-fetch: npm install node-fetch');
  process.exit(1);
}

// Executar
executarTestes().catch(error => {
  console.error('❌ [ERRO FATAL]', error);
  process.exit(1);
});
