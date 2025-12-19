# 🔄 Script de Reprocessamento - Emergência

Script para reprocessar itens não encontrados durante a atualização de movimentações semanais.

## 🚀 Uso Rápido

### Usar arquivo mais recente automaticamente
```bash
cd backend/functions
npm run reprocessar-nao-encontrados
```

### Usar arquivo específico
```bash
npm run reprocessar-nao-encontrados src/scripts/inserir_semanas/output/nao_encontrados_2025-12-18T22-06-13-136Z.json
```

## 📋 O que o script faz

1. ✅ Lê o JSON de não encontrados
2. ✅ **Ignora** automaticamente itens com todas movimentações zeradas
3. ✅ **Rebusca** no banco com estratégias flexíveis:
   - Busca exata
   - Busca com trim (remove espaços)
   - Busca case-insensitive (ignora maiúsculas/minúsculas)
4. ✅ **Insere** movimentações se encontrar o medicamento
5. ✅ Gera relatórios detalhados

## 📊 Estratégias de Busca

O script tenta encontrar medicamentos de 3 formas:

### 1. Busca Exata
```
"PARACETAMOL 500MG" === "PARACETAMOL 500MG" ✅
```

### 2. Busca com Trim
```
"PARACETAMOL 500MG " (com espaço) → "PARACETAMOL 500MG" ✅
```

### 3. Busca Case-Insensitive
```
"paracetamol 500mg" → "PARACETAMOL 500MG" ✅
"Paracetamol 500Mg" → "PARACETAMOL 500MG" ✅
```

## 📁 Arquivos Gerados

- **`reprocessamento_[timestamp].json`** - Relatório completo com todos os detalhes
- **`ainda_nao_encontrados_[timestamp].json`** - Itens que ainda não foram encontrados (se houver)

## 📝 Exemplo de Saída

```
🔄 REPROCESSAMENTO DE ITENS NÃO ENCONTRADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Usando arquivo mais recente: nao_encontrados_2025-12-18T22-06-13-136Z.json

📊 Total de itens a reprocessar: 100

[1/100] CAF - PARACETAMOL 500MG
   🔍 Encontrado case-insensitive: "Paracetamol 500mg"
   ✅ PARACETAMOL 500MG: [2025_23, 2025_24, 2025_25] atualizadas

[2/100] CAF - MEDICAMENTO TESTE
   ⏭️  Ignorado (movimentações zeradas)

[3/100] Olavo - DIPIRONA
   ⚠️  Ainda não encontrado

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 REPROCESSAMENTO CONCLUÍDO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Resumo:
   ✅ Encontrados e atualizados: 75
   ⏭️  Ignorados (zerados): 20
   ⚠️  Ainda não encontrados: 5
   ❌ Erros: 0
   📈 Taxa de sucesso: 93.75%

📄 Relatório: reprocessamento_2025-12-18T22-30-00.json
⚠️  Ainda não encontrados: ainda_nao_encontrados_2025-12-18T22-30-00.json
```

## 🔍 Estrutura do Relatório

```json
{
  "encontrados": 75,
  "atualizados": 75,
  "erros": 0,
  "ignorados_zerados": 20,
  "ainda_nao_encontrados": 5,
  "detalhes": [
    {
      "unidade": "CAF",
      "medicamento": "PARACETAMOL 500MG",
      "status": "atualizado",
      "mensagem": "Movimentações inseridas com sucesso"
    },
    {
      "unidade": "CAF",
      "medicamento": "MEDICAMENTO TESTE",
      "status": "ignorado_zerado",
      "mensagem": "Todas as movimentações são zero"
    },
    {
      "unidade": "Olavo",
      "medicamento": "DIPIRONA",
      "status": "ainda_nao_encontrado",
      "mensagem": "Medicamento não existe no banco"
    }
  ]
}
```

## ⚠️ Observações

1. **Seguro**: Preserva dados existentes (mesma lógica do script principal)
2. **Automático**: Ignora movimentações zeradas
3. **Inteligente**: Tenta múltiplas estratégias de busca
4. **Rastreável**: Gera relatórios detalhados
5. **Iterativo**: Pode executar múltiplas vezes até não haver mais itens encontráveis

## 💡 Dicas

- Execute após o script principal
- Revise os relatórios gerados
- Pode executar múltiplas vezes (cada execução tenta novamente)
- Itens ignorados (zerados) não contam na taxa de sucesso

