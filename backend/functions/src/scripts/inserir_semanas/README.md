# Atualização de Movimentações Semanais

Script para atualizar movimentações semanais de medicamentos a partir de planilhas Excel.

## 📋 Estrutura da Planilha

A planilha `movimentacoes_atualizacao.xlsx` deve ter a seguinte estrutura:

### Abas
- **CAF**: Dados da unidade CAF
- **Olavo**: Dados da unidade Olavo  
- **ESF3**: Dados da unidade ESF3

### Colunas
| Coluna | Conteúdo | Observação |
|--------|----------|------------|
| 0 (A) | Classificação | Ignorada pelo script |
| 1 (B) | Nome do Medicamento | Usado para buscar no banco |
| 2+ (C→) | Semanas (2025_23, 2025_24, ...) | Valores de movimentação |

### Exemplo de estrutura:
```
| Classificação | NOME_ITEM              | 2025_23 | 2025_24 | 2025_25 |
|---------------|------------------------|---------|---------|---------|
| Remume        | PARACETAMOL 500MG      | 150     | 200     | 180     |
| Assistencial  | DIPIRONA SODICA 500MG  | 300     | 250     | 275     |
```

## 🚀 Como Usar

### Modo Teste (Recomendado primeiro)
Lê a planilha e salva os dados em JSON **sem alterar o banco**:

```bash
cd backend/functions
npm run atualizar-movimentacoes teste
```

**Resultado:** Cria arquivo `output/teste_movimentacoes_[timestamp].json` com todos os dados que seriam inseridos.

### Modo Execução
Lê a planilha e **atualiza o banco de dados**:

```bash
cd backend/functions
npm run atualizar-movimentacoes execucao
```

**Resultado:** 
- Atualiza o campo `movimentacoes_semanais` de cada medicamento
- Preserva movimentações existentes (não sobrescreve)
- Gera relatório detalhado em `output/relatorio_execucao_[timestamp].json`
- Gera relatório de não encontrados em `output/nao_encontrados_[timestamp].json` (se houver)

## 📊 Fluxo de Processamento

1. **Leitura da Planilha**
   - Lê arquivo Excel
   - Identifica abas (unidades)
   - Extrai headers (semanas) da primeira linha
   - Processa cada medicamento

2. **Modo Teste**
   - Valida estrutura dos dados
   - Salva JSON com preview
   - Exibe estatísticas

3. **Modo Execução**
   - Conecta ao Firestore
   - Para cada unidade:
     - Busca medicamento por nome
     - Mescla movimentações (preserva existentes)
     - Atualiza `data_atualizacao`
   - Gera relatório com sucessos/erros

## 📁 Localização dos Arquivos

- **Planilha de entrada**: `Palmares_data/movimentacoes_atualizacao.xlsx`
- **Saída modo teste**: `backend/functions/src/scripts/inserir_semanas/output/teste_movimentacoes_*.json`
- **Relatório execução**: `backend/functions/src/scripts/inserir_semanas/output/relatorio_execucao_*.json`
- **Relatório não encontrados**: `backend/functions/src/scripts/inserir_semanas/output/nao_encontrados_*.json`

## ⚙️ Configurações

No arquivo `atualizar-movimentacoes.ts`:

```typescript
const ARQUIVO_PLANILHA = path.join(__dirname, '../../../../../../Palmares_data/movimentacoes_atualizacao.xlsx');
const MUNICIPIO = 'Palmares';
```

## 🔍 Validações

O script realiza as seguintes validações:

- ✅ Verifica existência do arquivo Excel
- ✅ Valida estrutura das abas
- ✅ Verifica headers (semanas)
- ✅ Valida dados numéricos
- ✅ Busca medicamento por nome exato
- ✅ Preserva movimentações existentes
- ⚠️ Reporta medicamentos não encontrados

## 📈 Estatísticas Geradas

### Modo Teste
- Total de unidades processadas
- Total de medicamentos
- Total de movimentações

### Modo Execução
- Medicamentos atualizados (sucesso)
- Erros de processamento
- Medicamentos não encontrados no banco
- Taxa de sucesso
- Detalhes por medicamento e unidade

### Relatório de Não Encontrados
Arquivo JSON específico contendo:
- Total de itens não encontrados
- Lista detalhada com:
  - Unidade
  - Nome do medicamento
  - Movimentações esperadas (para referência)

## ⚠️ Observações Importantes

1. **Nomes devem ser exatos**: O script busca medicamentos pelo nome. Certifique-se que os nomes na planilha correspondem exatamente aos nomes no banco.

2. **Preservação de dados**: O script **não apaga** movimentações existentes, apenas adiciona novas semanas.

3. **Sempre rode o modo teste primeiro**: Valide os dados antes de executar no banco.

4. **Backup recomendado**: Antes de executar o modo execução, considere fazer backup do banco.

## 🐛 Troubleshooting

### "Medicamento não encontrado"
- Verifique se o nome na planilha é exatamente igual ao do banco (maiúsculas/minúsculas)
- Confira espaços extras no início/fim do nome
- Verifique se o medicamento existe na unidade correta

### "Arquivo não encontrado"
- Verifique o caminho da planilha na variável `ARQUIVO_PLANILHA`
- Certifique-se que o arquivo está no local correto

### "Unidade não encontrada"
- Verifique o mapeamento de abas no código
- Confirme que a unidade existe no Firestore

## 📝 Exemplo de Saída

### Modo Teste
```
🧪 ========== MODO TESTE ==========
📖 Lendo planilha: D:\...\movimentacoes_atualizacao.xlsx

📋 Processando aba/unidade: CAF -> CAF
   📅 Semanas encontradas: 2025_23, 2025_24, 2025_25
   ✅ 150 medicamentos processados

📊 Total de unidades processadas: 3

💾 Arquivo de teste salvo: output/teste_movimentacoes_2025-01-15T10-30-00.json

📊 Estatísticas do teste:
   🏥 Unidades: 3
   💊 Medicamentos: 450
   📅 Total de movimentações: 1350
```

### Modo Execução (Com Itens Não Encontrados)
```
🚀 ========== MODO EXECUÇÃO ==========
⚠️  ATENÇÃO: Este modo irá ATUALIZAR o banco de dados!

🏥 Processando unidade: CAF
   ✅ PARACETAMOL 500MG: semanas [2025_23, 2025_24, 2025_25] atualizadas
   ⚠️ Medicamento não encontrado: "MEDICAMENTO TESTE 123"
   ✅ DIPIRONA SODICA 500MG: semanas [2025_23, 2025_24, 2025_25] atualizadas
   📊 149 sucessos, 0 erros, 1 não encontrados

📄 Relatório de execução salvo: output/relatorio_execucao_2025-12-18T22-00-00.json
⚠️  Relatório de não encontrados salvo: output/nao_encontrados_2025-12-18T22-00-00.json

🎉 ========== PROCESSAMENTO CONCLUÍDO ==========
📊 Resumo final:
   ✅ Medicamentos atualizados: 449
   ❌ Erros: 0
   ⚠️  Medicamentos não encontrados: 1
   📈 Taxa de sucesso: 99.78%

📄 Relatório detalhado: output/relatorio_execucao_2025-12-18T22-00-00.json

⚠️  1 medicamentos não foram encontrados no banco!
📋 Relatório de não encontrados: output/nao_encontrados_2025-12-18T22-00-00.json

💡 Dica: Verifique se os nomes na planilha correspondem exatamente aos nomes no banco.
   O relatório contém a lista completa de medicamentos e suas movimentações esperadas.
```

### Formato do Relatório de Não Encontrados
```json
{
  "timestamp": "2025-12-18T22:00:00.000Z",
  "total": 1,
  "itens": [
    {
      "unidade": "CAF",
      "medicamento": "MEDICAMENTO TESTE 123",
      "movimentacoes_esperadas": {
        "2025_23": 100,
        "2025_24": 150,
        "2025_25": 120
      }
    }
  ]
}
```

## 🔄 Script de Emergência: Reprocessar Não Encontrados

Se houver itens não encontrados após a execução, use o script de reprocessamento:

```bash
npm run reprocessar-nao-encontrados
```

Este script:
- ✅ Lê o JSON de não encontrados
- ✅ Ignora automaticamente itens com movimentações zeradas
- ✅ Rebusca com estratégias flexíveis (trim, case-insensitive)
- ✅ Insere as movimentações se encontrar

📖 **Documentação completa:** `REPROCESSAMENTO.md`

## 🔗 Arquivos Relacionados

- `atualizar-movimentacoes.ts` - Script principal
- `executar-atualizacao.ts` - Ponto de entrada
- `reprocessar-nao-encontrados.ts` - Script de emergência
- `inserir-semana.ts` - Script original (referência)

