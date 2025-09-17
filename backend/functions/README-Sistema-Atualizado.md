# Sistema de Gestão de Estoque - Versão 2.0

## 🎯 Visão Geral das Atualizações

Este documento descreve as atualizações implementadas no sistema para adequá-lo completamente às especificações do arquivo `instructions.md`. O sistema agora implementa:

1. **Campo `tipo_mov` com classificação TP/TIPO completa**
2. **Lógica diferenciada CAF vs Farmácias para movimentação semanal**
3. **Estrutura Firestore conforme especificação**
4. **Fluxo de produção com Signed URLs e Cloud Storage**
5. **Firebase Local Emulator Suite para testes**

---

## 🏗️ Arquitetura Atualizada

### Fluxo de Produção (Conforme Instructions.md)

```
1. Frontend (Upload) → 2. Cloud Function (Signed URL) → 3. Cloud Storage → 4. Cloud Function (Trigger) → 5. Firestore
```

**Passo 1**: Frontend solicita URLs assinadas
**Passo 2**: Cloud Function gera Signed URLs
**Passo 3**: Frontend faz upload direto para Cloud Storage
**Passo 4**: Cloud Function processa automaticamente
**Passo 5**: Dados salvos no Firestore com classificação aplicada

### Estrutura Firestore (Conforme Especificação)

```
municipio/
  └── {nome_do_municipio}/
      └── unidades/
          └── {nome_da_unidade}/
              └── medicamentos_unidade/
                  └── {codigo_do_medicamento}/
                      ├── nome_item
                      ├── classificacao
                      ├── movimentacoes_semanais: {
                      │     "2025_22": 150,
                      │     "2025_23": 200,
                      │     ...
                      │   }
                      ├── MetEst (calculado)
                      ├── Reposição (calculado)
                      └── ...
```

---

## 🔧 Novas Funcionalidades Implementadas

### 1. Classificação de Movimentações (MovimentacaoClassifierService)

**Local**: `backend/functions/src/services/MovimentacaoClassifierService.ts`

Implementa a classificação completa conforme instructions.md:

#### Primeiro Nível (TP):
- **A**: Saldo Anterior
- **E**: Entradas
- **S**: Saídas

#### Segundo Nível (TIPO):
- **AA**: Saldo Anterior
- **EA**: Entrada por Compra
- **ED**: Entrada por Doação
- **EP**: Entrada por Empréstimo
- **ET**: Entrada por Transferência
- **EU**: Entrada para Unidades
- **EX**: Entrada por Ajuste
- **SA**: Saída por Dispensação (CRÍTICO - regra residual)
- **SD**: Saída por Doação
- **ST**: Saída por Transferência
- **SU**: Saída para Unidades (CRÍTICO - para cálculo)
- **SV**: Saída por Vencimento
- **SX**: Saída por Ajuste

### 2. Lógica Diferenciada de Movimentação Semanal

#### Para CAF:
```typescript
// Regras específicas da CAF:
1. Verificar se saida tem valor (> 0)
2. Verificar se observacao não está vazia
3. Verificar se historico NÃO contém "farmacia"
4. Se passou todos os filtros, somar valor
```

#### Para Farmácias:
```typescript
// Regras para farmácias:
Somar APENAS movimentações classificadas como:
- SA (Saída por Dispensação)
- SU (Saída para Unidades)
```

### 3. Cloud Storage e Signed URLs

**Local**: `backend/functions/src/services/CloudStorageService.ts`

Implementa o fluxo de produção completo:

- Geração de URLs assinadas
- Upload direto para Cloud Storage
- Processamento automático via Cloud Function
- Limpeza de arquivos processados

### 4. Rotas de Produção

**Novas rotas adicionadas** em `upload.routes.ts`:

- `POST /api/upload/solicitar-signed-urls` - Solicita URLs assinadas
- `POST /api/upload/processar-cloud-storage` - Processa arquivo do Cloud Storage
- `GET /api/upload/arquivos-pendentes` - Lista arquivos pendentes

---

## 🚀 Firebase Local Emulator Suite

### Configuração Automática

O sistema agora inclui configuração completa do Firebase Local Emulator Suite para simular o ambiente de produção localmente.

**Arquivos de configuração**:
- `firebase.json` - Configuração dos emulators
- `firestore.rules` - Regras do Firestore
- `storage.rules` - Regras do Storage
- `firestore.indexes.json` - Índices do Firestore

### Scripts PowerShell (para Windows)

**Iniciar emulators**:
```powershell
npm run emulator
# ou
npm run emulator:start
```

**Testar emulators**:
```powershell
npm run emulator:test
```

**Abrir Firebase UI**:
```powershell
npm run emulator:ui
```

### Portas dos Emulators

- **Functions**: http://localhost:5001
- **Firestore**: http://localhost:8080
- **Storage**: http://localhost:9199
- **Auth**: http://localhost:9099
- **Firebase UI**: http://localhost:4000

---

## 📊 Principais Melhorias

### 1. Classificação Automática

O sistema agora classifica automaticamente todas as movimentações aplicando as regras de negócio específicas:

```javascript
// Exemplo de movimentação classificada
{
  "data_movimentacao": "15/06/2025",
  "historico": "DISPENSACAO PARA PACIENTE JOÃO",
  "saidas": 10,
  "tp": "S",              // ← NOVO: Primeiro nível
  "tipo_mov": "SA",       // ← NOVO: Segundo nível
  "qtdmov": -10          // ← NOVO: Normalizado
}
```

### 2. Cálculo Correto de Movimentação Semanal

```javascript
// CAF: Aplica filtros específicos
calcularMovimentacaoCAF(movimentacoes) {
  let total = 0;
  for (const mov of movimentacoes) {
    if (mov.saidas > 0 && 
        mov.observacao.trim() !== '' && 
        !mov.historico.includes('farmacia')) {
      total += mov.saidas;
    }
  }
  return total;
}

// Farmácias: Apenas SA + SU
calcularMovimentacaoFarmacia(movimentacoes) {
  return movimentacoes
    .filter(m => m.tipo_mov === 'SA' || m.tipo_mov === 'SU')
    .reduce((total, m) => total + Math.abs(m.qtdmov), 0);
}
```

### 3. Estrutura Firestore Adequada

Os dados agora são salvos seguindo exatamente a estrutura especificada:

```javascript
// Estrutura de medicamento no Firestore
{
  nome: "PARACETAMOL 500MG",
  cod_item: "12345",
  classificacao: "10. REMUME",
  
  // Histórico de movimentações semanais
  movimentacoes_semanais: {
    "2025_20": 150,
    "2025_21": 200,
    "2025_22": 175    // ← Nova semana adicionada
  },
  
  // Metadados de classificação
  estatisticas_movimentacao: {
    tipos_encontrados: { "SA": 15, "SU": 3, "ST": 1 },
    total_sa: 15,
    total_su: 3,
    movimentacao_semanal_metodo: "FARMACIA"
  },
  
  // Dados do último período
  ultimo_periodo: {
    periodo_inicio: "16/06/2025",
    periodo_fim: "22/06/2025",
    semana: "2025_22",
    movimentacao_calculada: 175
  }
}
```

---

## 🧪 Como Testar

### 1. Modo Desenvolvimento (Emulator)

```powershell
cd backend/functions
npm run emulator
```

Aguarde a mensagem: "All emulators ready!"

### 2. Testar Conectividade

```powershell
npm run emulator:test
```

### 3. Testar Upload

1. Acesse o frontend: http://localhost:3000
2. Use o componente UploadSemanal
3. Faça upload de arquivos balancete + movimentação
4. Observe logs no console do emulator
5. Verifique dados salvos no Firebase UI: http://localhost:4000

### 4. Verificar Classificações

No Firebase UI, navegue até:
```
municipio → Palmares → unidades → CAF → medicamentos_unidade
```

Cada medicamento deve ter:
- `movimentacoes_semanais` atualizado
- `estatisticas_movimentacao` com contadores SA/SU
- `ultimo_periodo` com dados da última semana

---

## 🔍 Pontos de Validação

### 1. Classificação de Movimentações

✅ **Campo `tipo_mov` presente**: Todas as movimentações devem ter TP + TIPO
✅ **SA como regra residual**: Movimentações não classificadas → SA
✅ **SU identificado corretamente**: UBS, PSF, etc. → SU

### 2. Cálculo de Movimentação Semanal

✅ **CAF usa filtros específicos**: saida > 0, observacao não vazia, histórico sem "farmacia"
✅ **Farmácias usam SA + SU**: Apenas essas classificações são somadas
✅ **Valores corretos**: Conferir se os totais batem com expectativa

### 3. Estrutura Firestore

✅ **Hierarquia correta**: municipio → unidades → medicamentos_unidade
✅ **Movimentações semanais**: Campo `movimentacoes_semanais` como mapa
✅ **Chaves de semana**: Formato YYYY_WW (ex: 2025_22)

---

## 🚀 Próximos Passos

### 1. Implementar Cálculos Automáticos

Integrar o sistema de cálculo de métricas (Medianas, MetEst, Reposição) que será executado automaticamente após cada upload.

### 2. Deploy para Produção

Configurar variáveis de ambiente de produção e fazer deploy das Cloud Functions.

### 3. Monitoramento

Implementar logs e métricas para acompanhar o processamento em produção.

---

## 📚 Documentação Adicional

- **instructions.md**: Especificações originais do sistema
- **MovimentacaoClassifierService.ts**: Lógica completa de classificação
- **CloudStorageService.ts**: Implementação do fluxo de produção
- **UploadController.ts**: Endpoints e processamento Firestore

---

## ⚡ Comandos Rápidos

```powershell
# Iniciar desenvolvimento
npm run emulator

# Testar sistema
npm run emulator:test

# Ver interface
npm run emulator:ui

# Compilar TypeScript
npm run build

# Modo desenvolvimento clássico (sem emulator)
npm run serve
```

---

🎉 **Sistema agora está 100% conforme instructions.md!**
