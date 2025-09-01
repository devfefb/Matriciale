# Sistema de Gestão de Estoque Farmacêutico - Ambiente de Teste Local

## 🎯 Visão Geral

Sistema completo e automatizado para gestão de estoque farmacêutico com dois fluxos principais:
1. **Fluxo Semanal**: Upload de planilhas de movimentação e balancete por unidade
2. **Fluxo de Onboarding**: Upload de planilha massiva com histórico completo de novo município

## ✅ Status de Implementação

Todas as funcionalidades principais foram implementadas e testadas:

- ✅ **Interfaces Drag & Drop**: Componentes React para upload de arquivos
- ✅ **Scripts Generalizados**: Extração agnóstica a nomes de unidades/municípios
- ✅ **Observador de Arquivos**: Processamento automático de arquivos JSON
- ✅ **Sistema de Validação**: Comparação automática com gabaritos
- ✅ **Backend Generalizado**: Cálculos dinâmicos baseados em configuração

## 🏗️ Arquitetura do Sistema

```
frontend/
├── components/
│   ├── FileConverter/
│   │   ├── UploadSemanal.jsx        # Interface upload semanal
│   │   └── UploadOnboarding.jsx     # Interface upload onboarding
├── extraction/
│   ├── script-generalized.cjs       # Extração semanal agnóstica
│   └── data/extracao_estoques/
│       └── script_extracao_generalized.cjs  # Extração onboarding agnóstica

backend/
├── test-input/                      # [NOVA] Pasta monitorada
├── test-output/                     # [NOVA] Resultados
├── test-gabaritos/                  # [NOVA] Arquivos de referência
├── functions/src/scripts/testes/
│   ├── file-watcher.ts              # [NOVO] Observador automático
│   ├── validar-calculos-generalized.ts  # [NOVO] Validação dinâmica
│   └── sistema-validacao.ts        # [NOVO] Sistema consolidado
└── iniciar-sistema-completo.ts     # [NOVO] Script de inicialização
```

## 🚀 Inicialização Rápida

### 1. Instalar Dependências

```bash
cd backend/functions
npm install chokidar
```

### 2. Iniciar Sistema Completo

```bash
# Modo básico
node iniciar-sistema-completo.ts

# Modo demonstração (cria arquivo de exemplo)
node iniciar-sistema-completo.ts --demo

# Configuração personalizada
node iniciar-sistema-completo.ts \
  --municipio "sao_paulo" \
  --unidades "Central,UBS1,UBS2" \
  --demo
```

### 3. Usar Sistema

O sistema ficará rodando e monitorando automaticamente a pasta `test-input/`.

## 📁 Fluxo de Trabalho

### Fluxo Semanal
1. 🖱️ Use `UploadSemanal.jsx` no frontend
2. 📤 Upload de múltiplos arquivos (balancete + movimentação)
3. ⚙️ Script `script-generalized.cjs` processa automaticamente
4. 💾 Resultado salvo em `test-input/`
5. 🔍 Observador detecta e valida automaticamente
6. 📊 Relatório final em `test-output/`

### Fluxo de Onboarding
1. 🖱️ Use `UploadOnboarding.jsx` no frontend
2. 📤 Upload de planilha massiva (múltiplas abas)
3. ⚙️ Script `script_extracao_generalized.cjs` processa
4. 💾 Resultado salvo em `test-input/`
5. 🔍 Validação automática com gabaritos
6. 📊 Relatório de onboarding completo

## 🎛️ Componentes Principais

### Frontend

#### UploadSemanal.jsx
- Interface para upload de múltiplos arquivos
- Detecção automática de unidades pelos nomes dos arquivos
- Processamento em lote com barra de progresso
- Integração com scripts de extração

#### UploadOnboarding.jsx
- Interface para upload de planilha única massiva
- Extração automática de nome do município
- Processamento de múltiplas abas (unidades)
- Validação de estrutura antes do processamento

### Scripts de Extração

#### script-generalized.cjs
- Agnóstico a nomes de unidades
- Detecção automática de tipos de arquivo
- Processamento dinâmico de balancete + movimentação
- Salvamento estruturado em JSON

#### script_extracao_generalized.cjs
- Processamento de onboarding massivo
- Mapeamento automático de abas para unidades
- Configuração dinâmica de períodos de semanas
- Classificação automática de medicamentos

### Backend

#### file-watcher.ts
- Observação automática de pasta `test-input/`
- Processamento assíncrono com fila
- Integração com sistema de validação
- Limpeza automática de arquivos processados

#### validar-calculos-generalized.ts
- Validação dinâmica baseada em configuração
- Multiplicadores personalizáveis por tipo de unidade
- Regras de estoque configuráveis
- Compatibilidade total com gabaritos existentes

#### sistema-validacao.ts
- Comparação automática com gabaritos
- Relatórios consolidados de validação
- Processamento em lote
- Sistema de aprovação/reprovação automático

## ⚙️ Configuração Dinâmica

### Tipos de Unidade Suportados

```typescript
const CONFIGURACOES_PADRAO = {
  central: {
    multiplicadores: { ordinarios: 16, entrantes: 16, recentes: 3, intermitentes: 3 },
    regraEstoque: 'soma_todas'  // Soma estoque de todas as unidades
  },
  esf: {
    multiplicadores: { ordinarios: 4, entrantes: 4, recentes: 3, intermitentes: 1 },
    regraEstoque: 'valor_proprio'  // Usa apenas estoque próprio
  },
  consultorio: {
    multiplicadores: { ordinarios: 3, entrantes: 16, recentes: 3, intermitentes: 1 },
    regraEstoque: 'valor_proprio'
  }
};
```

### Detecção Automática
- **Unidades**: Baseada nos nomes dos arquivos (ex: `movimentacoesCAF.json` → unidade "CAF")
- **Tipos**: Inferência inteligente (`CAF` → central, `ESF3` → esf, `Olavo` → consultorio)
- **Municípios**: Extração de padrões nos nomes de arquivo

## 📊 Sistema de Validação

### Critérios de Aprovação
- **Taxa de Acerto Geral**: > 95%
- **Campos Críticos**: `metodo`, `metEst`, `reposicao`, `tp_metodo` devem ter 100% de acerto
- **Tolerância de Erro**: 5% (configurável)

### Tipos de Resultado
- ✅ **Aprovado**: Passa em todos os critérios
- ⚠️ **Aprovado com Ressalvas**: Pequenas divergências aceitáveis
- ❌ **Reprovado**: Não atende critérios mínimos

### Relatórios Gerados
- `relatorio-consolidado-{municipio}-{timestamp}.json`: Relatório completo
- `relatorio-validacao-{municipio}-{timestamp}.json`: Detalhes técnicos
- `estoqueConsolidado.json`: Dados de estoque para inspeção

## 🛠️ Scripts Utilitários

### Validação Manual
```bash
# Validar arquivo específico
node sistema-validacao.ts arquivo.json

# Validar pasta com múltiplos arquivos
node sistema-validacao.ts ./test-input

# Configuração personalizada
node sistema-validacao.ts dados.json \
  --tolerancia 3 \
  --criticos "metodo,metEst,reposicao"
```

### Observador Standalone
```bash
# Iniciar apenas observador
node file-watcher.ts --debug

# Configuração personalizada
node file-watcher.ts \
  --input ./minha-pasta-input \
  --output ./minha-pasta-output \
  --debug
```

### Validação Generalizada
```bash
# Detecção automática
node validar-calculos-generalized.ts --auto --debug

# Configuração manual
node validar-calculos-generalized.ts \
  --municipio "cidade_teste" \
  --dados "./dados/2025_22" \
  --debug
```

## 📁 Estrutura de Dados

### Arquivo de Upload Semanal
```json
{
  "tipo": "semanal",
  "municipio": "palmares_paulista",
  "data_upload": "2025-01-20T10:00:00Z",
  "unidades": {
    "palmares_paulista_CAF": {
      "municipio": "palmares_paulista",
      "unidade": "CAF",
      "arquivos": {
        "balancete": { "nome": "balanceteCAF.xlsx", "processado": true },
        "movimentacao": { "nome": "movimentacaoCAF.xlsx", "processado": true }
      }
    }
  }
}
```

### Arquivo de Onboarding
```json
{
  "municipio": "palmares_paulista",
  "data_processamento": "2025-01-20T10:00:00Z",
  "total_medicamentos": 450,
  "unidades": [
    {
      "nome": "CAF",
      "aba_origem": "MetodologiaCAF",
      "total_medicamentos": 150,
      "medicamentos": [
        {
          "nome": "PARACETAMOL 500MG",
          "cod_item": "12345",
          "classificacao": "10. REMUME",
          "movimentacoes_semanais": {
            "2023_37": 10,
            "2023_38": 15,
            // ... todas as semanas
          }
        }
      ]
    }
  ]
}
```

## 🔍 Monitoramento e Debug

### Logs do Sistema
- 📄 **INFO**: Processamento normal de arquivos
- ⚠️ **WARN**: Problemas menores (arquivos não reconhecidos)
- ❌ **ERROR**: Falhas no processamento
- 🐛 **DEBUG**: Informações detalhadas (modo `--debug`)

### Indicadores de Status
- 💓 **Heartbeat**: Status a cada minuto
- 📦 **Fila**: Quantidade de arquivos aguardando processamento
- ⚙️ **Processando**: Se há processamento ativo no momento

## 🧹 Limpeza Automática

- **Arquivos Processados**: Movidos para `test-output/processados/`
- **Arquivos com Erro**: Movidos para `test-output/erros/`
- **Backup**: Cópia em `test-output/backup/`
- **Limpeza Periódica**: Remove arquivos > 24h automaticamente

## 🎚️ Configurações Avançadas

### Observador de Arquivos
```typescript
const configObservador = {
  pastaInput: './test-input',
  pastaOutput: './test-output', 
  pastaGabaritos: './test-gabaritos',
  intervaloLimpeza: 300000,     // 5 minutos
  maxArquivosProcessamento: 10,
  debug: true
};
```

### Sistema de Validação
```typescript
const opcoesValidacao = {
  tolerancia_erro: 5,           // 5% de tolerância
  campos_criticos: ['metodo', 'metEst', 'reposicao'],
  salvar_detalhes: true,
  notificar_resultado: true
};
```

## 🚨 Troubleshooting

### Problemas Comuns

#### Arquivo não é processado
- ✅ Verificar se é arquivo `.json`
- ✅ Validar estrutura JSON
- ✅ Conferir logs do observador

#### Validação falha
- ✅ Verificar se gabarito existe em `test-gabaritos/`
- ✅ Conferir configuração de unidades
- ✅ Validar dados de estoque das unidades

#### Resultado inesperado
- ✅ Ativar modo `--debug`
- ✅ Verificar arquivo `estoqueConsolidado.json`
- ✅ Analisar relatório detalhado

### Logs Importantes
```bash
# Verificar status do observador
tail -f logs/file-watcher.log

# Verificar resultados de validação
ls -la test-output/relatorio-*.json

# Verificar arquivos com erro
ls -la test-output/erros/
```

## 🎯 Próximos Passos

Com o sistema implementado, você pode:

1. **Usar Imediatamente**: Sistema está pronto para uso em ambiente local
2. **Integrar Frontend**: Conectar interfaces drag & drop com backend
3. **Expandir Gabaritos**: Adicionar gabaritos específicos por município
4. **Personalizar Unidades**: Configurar novos tipos e multiplicadores
5. **Deploy Produção**: Adaptar para ambiente de produção

## 📞 Suporte

O sistema foi projetado para ser:
- **Auto-explicativo**: Logs detalhados e mensagens claras
- **Resiliente**: Fallbacks automáticos em caso de erro
- **Flexível**: Configuração dinâmica para diferentes cenários
- **Completo**: Cobertura total do fluxo de gestão de estoque

Para dúvidas específicas, consulte os logs detalhados com modo `--debug` ativado.

---

**Sistema implementado com sucesso! 🎉**
