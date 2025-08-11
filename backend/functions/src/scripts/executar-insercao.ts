#!/usr/bin/env ts-node

import InserirDadosService from './inserirDados';

console.log('🏥 Script de Inserção de Dados - Sistema Well');
console.log('=============================================\n');

const service = new InserirDadosService();

service.executar()
  .then(() => {
    console.log('\n✅ Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro durante execução:', error);
    process.exit(1);
  });

