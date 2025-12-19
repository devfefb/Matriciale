# 🧹 Guia Rápido - Limpeza de Duplicados

## 🚀 Uso Rápido

### 1️⃣ Modo Teste (Análise sem exclusão)

```bash
cd backend/functions
npm run limpar-duplicados teste
```

**Resultado:** Relatório JSON em `src/scripts/inserir_semanas/output/`

### 2️⃣ Modo Execução (Executa a limpeza)

```bash
cd backend/functions
npm run limpar-duplicados execucao
```

**Resultado:** Duplicados removidos + Relatório JSON

---

## ⚠️ IMPORTANTE

1. **SEMPRE** execute o modo `teste` primeiro
2. Revise o relatório gerado antes de executar
3. No modo `execucao`, os dados **SERÃO EXCLUÍDOS** permanentemente

---

## 📊 O que o script faz?

✅ Varre todas as unidades de todos os municípios  
✅ Identifica medicamentos com o mesmo `nome`  
✅ Mantém apenas o que tem movimentações mais completas  
✅ Remove os duplicados (apenas no modo execução)  
✅ Gera relatório detalhado com justificativas  

---

## 🎯 Critério de Escolha

O script mantém o medicamento que:

1. **Possui intervalo completo** (2023_37 até 2025_46) - Prioridade máxima
2. **Maior completude** (% de semanas presentes no intervalo ideal)
3. **Mais movimentações** (em caso de empate)

---

## 📁 Onde encontrar os relatórios?

```
backend/functions/src/scripts/inserir_semanas/output/
├── relatorio_limpeza_teste_2025-12-19T10-30-45.json
└── relatorio_limpeza_execucao_2025-12-19T10-45-12.json
```

---

## 🔍 Exemplo de Saída

```
═══════════════════════════════════════════════════════════════
🧹 SCRIPT DE LIMPEZA DE MEDICAMENTOS DUPLICADOS
═══════════════════════════════════════════════════════════════

📊 RESUMO FINAL
🗺️ Municípios analisados: 1
🏥 Unidades analisadas: 5
📦 Medicamentos analisados: 1250
🔍 Duplicatas encontradas: 23
❌ Medicamentos que seriam excluídos: 45
```

---

## 📖 Documentação Completa

Para mais detalhes, consulte [README-LIMPEZA.md](./README-LIMPEZA.md)

