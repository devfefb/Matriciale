import { 
  DadosCompletos, 
  EstatisticasGerais, 
  EstatisticasMunicipio, 
  EstatisticasUnidade 
} from './interfaces';
import { carregarDados } from './utils';

// Função para validar estrutura do JSON
export function validarEstrutura(dados: DadosCompletos): string[] {
  const erros: string[] = [];
  
  // Verificar se tem o campo cidades
  if (!dados.cidades) {
    erros.push('Campo "cidades" não encontrado');
    return erros;
  }
  
  if (!Array.isArray(dados.cidades)) {
    erros.push('Campo "cidades" deve ser um array');
    return erros;
  }
  
  // Validar cada município
  dados.cidades.forEach((municipio, indexMunicipio) => {
    if (!municipio.nome) {
      erros.push(`Município ${indexMunicipio}: campo "nome" não encontrado`);
    }
    
    if (!municipio.unidades) {
      erros.push(`Município ${municipio.nome || indexMunicipio}: campo "unidades" não encontrado`);
      return;
    }
    
    if (!Array.isArray(municipio.unidades)) {
      erros.push(`Município ${municipio.nome}: campo "unidades" deve ser um array`);
      return;
    }
    
    // Validar cada unidade
    municipio.unidades.forEach((unidade, indexUnidade) => {
      if (!unidade.nome) {
        erros.push(`Unidade ${indexUnidade} do município ${municipio.nome}: campo "nome" não encontrado`);
      }
      
      if (!unidade.medicamentos) {
        erros.push(`Unidade ${unidade.nome || indexUnidade} do município ${municipio.nome}: campo "medicamentos" não encontrado`);
        return;
      }
      
      if (!Array.isArray(unidade.medicamentos)) {
        erros.push(`Unidade ${unidade.nome} do município ${municipio.nome}: campo "medicamentos" deve ser um array`);
        return;
      }
      
      // Validar cada medicamento
      unidade.medicamentos.forEach((medicamento, indexMedicamento) => {
        if (!medicamento.nome) {
          erros.push(`Medicamento ${indexMedicamento} da unidade ${unidade.nome}: campo "nome" não encontrado`);
        }
        
        if (!medicamento.cod_item) {
          erros.push(`Medicamento ${medicamento.nome || indexMedicamento} da unidade ${unidade.nome}: campo "cod_item" não encontrado`);
        }
        
        if (!medicamento.classificacao) {
          erros.push(`Medicamento ${medicamento.nome || indexMedicamento} da unidade ${unidade.nome}: campo "classificacao" não encontrado`);
        }
        
        if (!medicamento.movimentacoes_semanais) {
          erros.push(`Medicamento ${medicamento.nome || indexMedicamento} da unidade ${unidade.nome}: campo "movimentacoes_semanais" não encontrado`);
          return;
        }
        
        if (!Array.isArray(medicamento.movimentacoes_semanais)) {
          erros.push(`Medicamento ${medicamento.nome || indexMedicamento} da unidade ${unidade.nome}: campo "movimentacoes_semanais" deve ser um array`);
          return;
        }
        
        // Validar movimentações semanais
        medicamento.movimentacoes_semanais.forEach((mov, indexMov) => {
          if (typeof mov !== 'object' || mov === null) {
            erros.push(`Movimentação ${indexMov} do medicamento ${medicamento.nome}: deve ser um objeto`);
            return;
          }
          
          const chaves = Object.keys(mov);
          if (chaves.length !== 1) {
            erros.push(`Movimentação ${indexMov} do medicamento ${medicamento.nome}: deve ter exatamente uma chave`);
            return;
          }
          
          const valor = mov[chaves[0]];
          if (typeof valor !== 'number') {
            erros.push(`Movimentação ${indexMov} do medicamento ${medicamento.nome}: valor deve ser um número`);
          }
        });
      });
    });
  });
  
  return erros;
}

// Função para gerar estatísticas
export function gerarEstatisticas(dados: DadosCompletos): EstatisticasGerais {
  const stats: EstatisticasGerais = {
    totalMunicipios: dados.cidades.length,
    totalUnidades: 0,
    totalMedicamentos: 0,
    totalMovimentacoes: 0,
    municipios: []
  };
  
  dados.cidades.forEach(municipio => {
    const municipioStats: EstatisticasMunicipio = {
      nome: municipio.nome,
      totalUnidades: municipio.unidades.length,
      totalMedicamentos: 0,
      unidades: []
    };
    
    municipio.unidades.forEach(unidade => {
      const unidadeStats: EstatisticasUnidade = {
        nome: unidade.nome,
        totalMedicamentos: unidade.medicamentos.length,
        totalMovimentacoes: 0
      };
      
      unidade.medicamentos.forEach(medicamento => {
        unidadeStats.totalMovimentacoes += medicamento.movimentacoes_semanais.length;
      });
      
      municipioStats.unidades.push(unidadeStats);
      municipioStats.totalMedicamentos += unidadeStats.totalMedicamentos;
    });
    
    stats.municipios.push(municipioStats);
    stats.totalUnidades += municipioStats.totalUnidades;
    stats.totalMedicamentos += municipioStats.totalMedicamentos;
    
    municipio.unidades.forEach(unidade => {
      unidade.medicamentos.forEach(medicamento => {
        stats.totalMovimentacoes += medicamento.movimentacoes_semanais.length;
      });
    });
  });
  
  return stats;
}

// Função principal
export function validarArquivo(): void {
  try {
    console.log('🔍 Validando arquivo de dados...');
    
    // Carregar dados
    const dados = carregarDados();
    
    // Validar estrutura
    const erros = validarEstrutura(dados);
    
    if (erros.length > 0) {
      console.error('❌ Erros de validação encontrados:');
      erros.forEach(erro => console.error(`   - ${erro}`));
      process.exit(1);
    }
    
    console.log('✅ Estrutura do arquivo válida!');
    
    // Gerar estatísticas
    const stats = gerarEstatisticas(dados);
    
    console.log('\n📊 Estatísticas do arquivo:');
    console.log(`   🏙️ Total de municípios: ${stats.totalMunicipios}`);
    console.log(`   🏥 Total de unidades: ${stats.totalUnidades}`);
    console.log(`   💊 Total de medicamentos: ${stats.totalMedicamentos}`);
    console.log(`   📈 Total de movimentações: ${stats.totalMovimentacoes}`);
    
    console.log('\n📋 Detalhes por município:');
    stats.municipios.forEach(municipio => {
      console.log(`\n   🏙️ ${municipio.nome}:`);
      console.log(`      🏥 Unidades: ${municipio.totalUnidades}`);
      console.log(`      💊 Medicamentos: ${municipio.totalMedicamentos}`);
      
      municipio.unidades.forEach(unidade => {
        console.log(`         - ${unidade.nome}: ${unidade.totalMedicamentos} medicamentos, ${unidade.totalMovimentacoes} movimentações`);
      });
    });
    
    console.log('\n✅ Validação concluída com sucesso!');
    
  } catch (error) {
    console.error('💥 Erro durante a validação:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  validarArquivo();
}
