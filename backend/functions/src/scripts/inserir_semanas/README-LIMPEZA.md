# Script de Limpeza de Medicamentos Duplicados

## 📋 Descrição

Este script foi desenvolvido para identificar e remover medicamentos duplicados no banco de dados Firebase. Ele varre todas as unidades de todos os municípios, procurando documentos na coleção `medicamentos_unidade` que possuem o mesmo campo `nome`.

## 🎯 Funcionalidades

### Identificação de Duplicatas

O script agrupa medicamentos por nome e identifica quando existem múltiplos documentos com o mesmo nome dentro de uma mesma unidade.

### Critério de Seleção

Quando duplicatas são encontradas, o script mantém apenas **um** documento baseado nos seguintes critérios (em ordem de prioridade):

1. **Intervalo Completo**: Medicamentos que possuem movimentações semanais de `2023_37` até `2025_46` (100% de completude)
2. **Maior Completude**: Se nenhum possui intervalo completo, mantém o que tem maior percentual de semanas presentes no intervalo ideal
3. **Total de Movimentações**: Em caso de empate, mantém o que possui mais semanas registradas

## 🔧 Modos de Operação

### Modo Teste

Apenas analisa o banco e gera um relatório detalhado **SEM EXECUTAR EXCLUSÕES**.

```bash
# No diretório backend/functions
npm run limpar-duplicados teste
```

**O que faz:**
- ✅ Varre todo o banco de dados
- ✅ Identifica medicamentos duplicados
- ✅ Analisa completude das movimentações
- ✅ Gera relatório JSON com todas as análises e justificativas
- ❌ **NÃO EXCLUI** nenhum documento

### Modo Execução

Executa a limpeza real, **REMOVENDO** os medicamentos duplicados do banco.

```bash
# No diretório backend/functions
npm run limpar-duplicados execucao
```

**O que faz:**
- ✅ Varre todo o banco de dados
- ✅ Identifica medicamentos duplicados
- ✅ Analisa completude das movimentações
- ✅ **EXCLUI** os documentos duplicados (mantendo apenas o melhor)
- ✅ Gera relatório JSON com o resultado da limpeza

## ⚠️ ATENÇÃO

**SEMPRE execute o modo `teste` primeiro!**

1. Execute `npm run limpar-duplicados teste`
2. Revise o relatório gerado em `output/relatorio_limpeza_teste_*.json`
3. Valide as escolhas e justificativas
4. Só então execute `npm run limpar-duplicados execucao`

## 📊 Relatório Gerado

O script gera um arquivo JSON detalhado na pasta `output/` com o seguinte formato:

```json
{
  "dataExecucao": "2025-12-19T...",
  "modo": "teste",
  "totalMunicipios": 1,
  "totalUnidades": 5,
  "totalMedicamentosAnalisados": 1250,
  "totalDuplicatasEncontradas": 23,
  "totalMedicamentosExcluidos": 45,
  "unidades": [
    {
      "municipio": "Palmares",
      "unidade": "Hospital Municipal",
      "totalMedicamentos": 250,
      "medicamentosDuplicados": [
        {
          "nomeMedicamento": "PARACETAMOL 500MG",
          "totalDuplicatas": 3,
          "medicamentoMantido": {
            "id": "abc123",
            "cod_item": "1001",
            "completude": 100,
            "temIntervaloCompleto": true,
            "intervaloEncontrado": "2023_37 a 2025_46 (115 semanas)",
            "justificativa": "Possui intervalo completo (2023_37 até 2025_46) - 100% de completude"
          },
          "medicamentosExcluidos": [
            {
              "id": "def456",
              "cod_item": "1001",
              "completude": 87.5,
              "temIntervaloCompleto": false,
              "intervaloEncontrado": "2024_01 a 2025_46 (98 semanas)"
            }
          ]
        }
      ]
    }
  ]
}
```

## 📈 Exemplo de Saída no Console

```
═══════════════════════════════════════════════════════════════
🧹 SCRIPT DE LIMPEZA DE MEDICAMENTOS DUPLICADOS
═══════════════════════════════════════════════════════════════
📋 Modo: TESTE
⏰ Data/Hora: 19/12/2025 10:30:45
═══════════════════════════════════════════════════════════════

ℹ️ MODO TESTE: Apenas análise, nenhum dado será excluído

🗺️ Total de municípios encontrados: 1

🏙️ Processando município: Palmares
   📍 Total de unidades: 5

  🏥 Processando unidade: Hospital Municipal
     📦 Total de medicamentos: 250
     🔍 Duplicata encontrada: "PARACETAMOL 500MG" (3 ocorrências)
        ✅ Mantido: ID abc123 - Possui intervalo completo (2023_37 até 2025_46) - 100% de completude
        ❌ Excluídos: 2 documentos
     📊 Total de duplicatas: 1

═══════════════════════════════════════════════════════════════
📊 RESUMO FINAL
═══════════════════════════════════════════════════════════════
🗺️ Municípios analisados: 1
🏥 Unidades analisadas: 5
📦 Medicamentos analisados: 1250
🔍 Duplicatas encontradas: 23
❌ Medicamentos que seriam excluídos: 45

💡 Para executar a limpeza, rode novamente com modo='execucao'

📄 Relatório salvo em: output/relatorio_limpeza_teste_2025-12-19T...json
═══════════════════════════════════════════════════════════════
```

## 🔍 Como Funciona Internamente

### 1. Varredura do Banco

O script percorre a seguinte hierarquia:
```
municipio (collection)
└── [nome_municipio] (document)
    └── unidades (collection)
        └── [nome_unidade] (document)
            └── medicamentos_unidade (collection)
                └── [id] (document)
```

### 2. Agrupamento por Nome

Para cada unidade, agrupa todos os medicamentos pelo campo `nome`.

### 3. Análise de Completude

Para cada medicamento, calcula:
- **Completude**: Percentual de semanas presentes no intervalo ideal (2023_37 a 2025_46)
- **Intervalo Completo**: Boolean indicando se possui todas as 115 semanas esperadas
- **Intervalo Encontrado**: String mostrando primeira e última semana presentes

### 4. Seleção do Melhor

Quando múltiplos medicamentos com mesmo nome são encontrados:
1. Prioriza quem tem `temIntervaloCompleto = true`
2. Se nenhum tem, prioriza maior `completude`
3. Se empate, prioriza maior número de semanas

### 5. Execução (apenas no modo execução)

Exclui os documentos marcados para remoção usando `FirebaseFirestore.DocumentReference.delete()`.

## 🛠️ Tecnologias Utilizadas

- **TypeScript**: Linguagem principal
- **Firebase Admin SDK**: Acesso ao Firestore
- **Node.js**: Runtime

## 📝 Variáveis de Ambiente Necessárias

Certifique-se de ter as seguintes variáveis configuradas no `.env`:

```env
NODE_ENV=development
FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_PRIVATE_KEY=sua-chave
FIREBASE_CLIENT_EMAIL=seu-email
```

## 🐛 Tratamento de Erros

- Medicamentos sem campo `nome` são ignorados (com warning)
- Erros ao processar unidades são capturados e logados, mas não interrompem o processo
- Erros ao excluir documentos (no modo execução) são logados individualmente

## 📦 Estrutura de Arquivos

```
backend/functions/src/scripts/inserir_semanas/
├── limpar-duplicados.ts        # Script principal com toda a lógica
├── executar-limpeza.ts         # Wrapper para execução
├── output/                     # Pasta onde os relatórios são salvos
│   ├── relatorio_limpeza_teste_*.json
│   └── relatorio_limpeza_execucao_*.json
└── README-LIMPEZA.md          # Esta documentação
```

## 🎓 Exemplos de Uso

### Cenário 1: Primeira Análise

```bash
# 1. Execute o modo teste
npm run limpar-duplicados teste

# 2. Abra e revise o relatório gerado
# output/relatorio_limpeza_teste_2025-12-19T....json

# 3. Se tudo estiver correto, execute a limpeza
npm run limpar-duplicados execucao
```

### Cenário 2: Executar Apenas Análise

```bash
# Para gerar um relatório sem risco de exclusão
npm run limpar-duplicados teste
```

### Cenário 3: Execução Direta do TypeScript

```bash
# Usando ts-node diretamente
ts-node src/scripts/inserir_semanas/limpar-duplicados.ts teste
ts-node src/scripts/inserir_semanas/limpar-duplicados.ts execucao
```

## ❓ FAQ

**P: O que acontece se todos os medicamentos duplicados tiverem a mesma completude?**
R: O script mantém o primeiro encontrado na ordem de listagem do Firestore.

**P: O script pode ser executado em produção?**
R: Sim, mas certifique-se de testar em desenvolvimento primeiro e sempre execute o modo teste antes.

**P: O que acontece se a execução for interrompida no meio?**
R: Os documentos já excluídos não serão recuperados. Sempre revise o modo teste antes.

**P: Posso executar o script múltiplas vezes?**
R: Sim, se executar novamente após uma limpeza, ele não encontrará mais duplicatas (a menos que novas tenham sido inseridas).

## 🚀 Próximos Passos Após a Limpeza

1. Verificar os logs de execução
2. Revisar o relatório JSON gerado
3. Opcionalmente, executar scripts de validação para confirmar a integridade dos dados
4. Documentar as estatísticas de limpeza para referência futura

