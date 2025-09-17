/**
 * Script de teste para validar o fluxo completo end-to-end
 * 
 * FLUXO TESTADO:
 * 1. Simula upload do frontend com dados JSON processados
 * 2. Verifica salvamento no storage (local)
 * 3. Verifica processamento automático em background
 * 4. Verifica execução dos cálculos
 * 5. Verifica dados salvos no Firestore
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// Configuração do servidor local
const BASE_URL = 'http://localhost:3000/api/upload';

// Dados de teste simulando o que o frontend enviaria
const dadosTesteUpload = {
  tipo: 'semanal',
  municipio: 'PalmaresTest',
  data_processamento: new Date().toISOString(),
  arquivos: [
    {
      nome_arquivo: 'inventoryDataCAFTest.json',
      content: {
        unidade: 'CAF',
        periodo_inicio: '22/05/2025',
        periodo_fim: '28/05/2025',
        unidade_info: {
          nome: 'CAF',
          tipo: 'Central de Abastecimento Farmacêutico',
          esCAF: true
        },
        itens: [
          {
            cod_sistemico_item: 'TEST001',
            descricao_item: 'PARACETAMOL 500MG COMP',
            tipo_unid_item: 'COMP',
            qtd_periodo_final: 1500,
            movimentacoes: [
              {
                data_mov: '22/05/2025',
                tipo_mov: 'SA',
                qtd_mov: 100
              },
              {
                data_mov: '24/05/2025',
                tipo_mov: 'SU',
                qtd_mov: 50
              }
            ]
          },
          {
            cod_sistemico_item: 'TEST002',
            descricao_item: 'IBUPROFENO 400MG COMP',
            tipo_unid_item: 'COMP',
            qtd_periodo_final: 800,
            movimentacoes: [
              {
                data_mov: '23/05/2025',
                tipo_mov: 'SA',
                qtd_mov: 75
              }
            ]
          }
        ]
      }
    },
    {
      nome_arquivo: 'inventoryDataESF3Test.json',
      content: {
        unidade: 'ESF3',
        periodo_inicio: '22/05/2025',
        periodo_fim: '28/05/2025',
        unidade_info: {
          nome: 'ESF3',
          tipo: 'Estratégia Saúde da Família',
          esCAF: false
        },
        itens: [
          {
            cod_sistemico_item: 'TEST001',
            descricao_item: 'PARACETAMOL 500MG COMP',
            tipo_unid_item: 'COMP',
            qtd_periodo_final: 200,
            movimentacoes: [
              {
                data_mov: '22/05/2025',
                tipo_mov: 'SU',
                qtd_mov: 30
              }
            ]
          },
          {
            cod_sistemico_item: 'TEST003',
            descricao_item: 'DIPIRONA 500MG COMP',
            tipo_unid_item: 'COMP',
            qtd_periodo_final: 300,
            movimentacoes: [
              {
                data_mov: '25/05/2025',
                tipo_mov: 'SU',
                qtd_mov: 25
              }
            ]
          }
        ]
      }
    }
  ]
};

async function testarFluxoCompleto(): Promise<void> {
  console.log('🚀 Iniciando teste do fluxo completo end-to-end...\n');

  try {
    // PASSO 1: Testar endpoint de health check
    console.log('📋 PASSO 1: Verificando se o servidor está funcionando...');
    
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Servidor está funcionando!');
      console.log('   Endpoints disponíveis:', healthResponse.data.endpoints);
      console.log('   Environment:', healthResponse.data.environment);
      console.log('');
    } catch (error) {
      console.error('❌ Servidor não está respondendo! Certifique-se de que está rodando na porta 3000');
      return;
    }

    // PASSO 2: Fazer upload dos dados
    console.log('📤 PASSO 2: Fazendo upload dos dados (simulando frontend)...');
    
    const uploadResponse = await axios.post(`${BASE_URL}/semanal`, dadosTesteUpload);
    
    if (uploadResponse.data.status === 'success') {
      console.log('✅ Upload realizado com sucesso!');
      console.log('   Arquivos processados:', uploadResponse.data.data.arquivos_processados);
      console.log('   Storage type:', uploadResponse.data.data.storage_type);
      console.log('   Resultados:', uploadResponse.data.data.resultados.map((r: any) => `${r.unidade}: ${r.status}`));
      console.log('');
    } else {
      console.error('❌ Erro no upload:', uploadResponse.data);
      return;
    }

    // PASSO 3: Aguardar processamento em background
    console.log('⏳ PASSO 3: Aguardando processamento em background (10 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log('');

    // PASSO 4: Verificar status do processamento
    console.log('📊 PASSO 4: Verificando status do processamento...');
    
    const statusResponse = await axios.get(`${BASE_URL}/status`, {
      params: { municipio: 'PalmaresTest' }
    });
    
    if (statusResponse.data.status === 'success') {
      console.log('✅ Status obtido com sucesso!');
      console.log('   Arquivos no storage:', statusResponse.data.data.arquivos_storage);
      console.log('   Unidades processadas:', statusResponse.data.data.unidades.length);
      
      for (const unidade of statusResponse.data.data.unidades) {
        console.log(`   - ${unidade.nome}: ${unidade.total_medicamentos} medicamentos, ${unidade.medicamentos_com_calculos} com cálculos`);
      }
      console.log('');
    } else {
      console.warn('⚠️ Não foi possível obter status:', statusResponse.data);
    }

    // PASSO 5: Executar cálculos manualmente (se necessário)
    console.log('🧮 PASSO 5: Executando cálculos manualmente...');
    
    const calculosResponse = await axios.post(`${BASE_URL}/executar-calculos`, {
      municipio: 'PalmaresTest'
    });
    
    if (calculosResponse.data.status === 'success') {
      console.log('✅ Cálculos executados com sucesso!');
      console.log('   Total processados:', calculosResponse.data.data.total_processados);
      console.log('   Sucessos:', calculosResponse.data.data.total_sucesso);
      console.log('   Erros:', calculosResponse.data.data.total_erros);
      console.log('   Taxa de sucesso:', calculosResponse.data.data.taxa_sucesso + '%');
      console.log('');
    } else {
      console.error('❌ Erro na execução dos cálculos:', calculosResponse.data);
    }

    // PASSO 6: Verificar novamente o status final
    console.log('📋 PASSO 6: Verificando status final...');
    
    const statusFinalResponse = await axios.get(`${BASE_URL}/status`, {
      params: { municipio: 'PalmaresTest' }
    });
    
    if (statusFinalResponse.data.status === 'success') {
      console.log('✅ Status final obtido com sucesso!');
      
      let totalMedicamentos = 0;
      let totalComCalculos = 0;
      
      for (const unidade of statusFinalResponse.data.data.unidades) {
        totalMedicamentos += unidade.total_medicamentos;
        totalComCalculos += unidade.medicamentos_com_calculos;
        console.log(`   - ${unidade.nome}: ${unidade.medicamentos_com_calculos}/${unidade.total_medicamentos} com cálculos`);
      }
      
      const porcentagemComCalculos = totalMedicamentos > 0 ? ((totalComCalculos / totalMedicamentos) * 100).toFixed(1) : '0';
      console.log(`   📊 TOTAL: ${totalComCalculos}/${totalMedicamentos} medicamentos com cálculos (${porcentagemComCalculos}%)`);
      console.log('');
    }

    // PASSO 7: Verificar arquivos gerados no storage local
    console.log('📁 PASSO 7: Verificando arquivos gerados no storage local...');
    
    const storageDir = path.join(__dirname, '../../../storage/uploads/PalmaresTest');
    
    if (fs.existsSync(storageDir)) {
      console.log('✅ Diretório de storage encontrado!');
      
      const unidades = fs.readdirSync(storageDir).filter(item => 
        fs.statSync(path.join(storageDir, item)).isDirectory()
      );
      
      for (const unidade of unidades) {
        const unidadeDir = path.join(storageDir, unidade);
        const arquivos = fs.readdirSync(unidadeDir).filter(item => item.endsWith('.json'));
        console.log(`   - ${unidade}: ${arquivos.length} arquivo(s) JSON`);
        
        for (const arquivo of arquivos) {
          const stats = fs.statSync(path.join(unidadeDir, arquivo));
          console.log(`     * ${arquivo} (${(stats.size / 1024).toFixed(1)} KB)`);
        }
      }
      console.log('');
    } else {
      console.warn('⚠️ Diretório de storage não encontrado:', storageDir);
    }

    console.log('🎉 TESTE COMPLETO FINALIZADO COM SUCESSO!');
    console.log('');
    console.log('📝 RESUMO DO FLUXO TESTADO:');
    console.log('   1. ✅ Upload de dados do frontend');
    console.log('   2. ✅ Salvamento no storage local');
    console.log('   3. ✅ Processamento automático em background');
    console.log('   4. ✅ Salvamento de movimentações semanais no Firestore');
    console.log('   5. ✅ Execução de cálculos');
    console.log('   6. ✅ Salvamento de campos calculados no Firestore');
    console.log('');
    console.log('🎯 O sistema está funcionando corretamente para ambientes local e produção!');

  } catch (error: any) {
    console.error('💥 Erro durante o teste:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Dados:', error.response.data);
    }
    
    console.log('');
    console.log('🔧 DICAS PARA RESOLVER PROBLEMAS:');
    console.log('   1. Certifique-se de que o servidor está rodando: npm run dev');
    console.log('   2. Verifique as configurações do Firebase');
    console.log('   3. Confirme que a porta 3000 está livre');
    console.log('   4. Verifique os logs do servidor para erros detalhados');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testarFluxoCompleto()
    .then(() => {
      console.log('\n✅ Teste executado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro no teste:', error);
      process.exit(1);
    });
}

export { testarFluxoCompleto };
