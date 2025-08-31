import { extrairCamposCalculados, salvarResultadoEmJson } from './gabarito/extrair-campos-calculados';

async function main(): Promise<void> {
  try {
    const dados = extrairCamposCalculados();
    const caminho = salvarResultadoEmJson(dados);
    // eslint-disable-next-line no-console
    console.log(`✅ Extração concluída. Saída: ${caminho}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Erro na extração:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().then(() => process.exit(0));
}


