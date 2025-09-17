# Fluxo Completo do Sistema - Upload e Processamento

## Visão Geral

O sistema foi reestruturado para implementar um fluxo completo que funciona tanto em **ambiente local** quanto em **produção**, com duas etapas bem definidas:

1. **📤 Processamento Inicial**: Recebe dados do frontend → Salva no storage
2. **🧮 Processamento de Cálculos**: Lê do storage → Calcula campos → Atualiza banco

## 🔄 Novo Fluxo End-to-End

### ETAPA 1: Upload e Salvamento
```
Frontend → POST /api/upload/semanal → Storage (local/cloud)
```

**O que acontece:**
- Frontend envia dados JSON processados
- Backend salva cada arquivo no storage
- Retorna sucesso imediatamente
- Inicia processamento em background

### ETAPA 2: Processamento Automático (Background)
```
Storage → Leitura → Firestore (movimentações) → Cálculos → Firestore (campos calculados)
```

**O que acontece:**
- Lê arquivos salvos no storage
- Processa dados com classificação
- Salva movimentações semanais no Firestore
- Executa cálculos automaticamente
- Salva campos calculados no Firestore

## 🛠️ Endpoints Disponíveis

### 1. Upload Principal
```http
POST /api/upload/semanal
```
**Corpo da requisição:**
```json
{
  "tipo": "semanal",
  "municipio": "Palmares",
  "data_processamento": "2025-05-28T10:00:00Z",
  "arquivos": [
    {
      "nome_arquivo": "inventoryDataCAF.json",
      "content": {
        "unidade": "CAF",
        "periodo_inicio": "22/05/2025",
        "periodo_fim": "28/05/2025",
        "itens": [...],
        "unidade_info": {...}
      }
    }
  ]
}
```

**Resposta:**
```json
{
  "status": "success",
  "message": "Upload semanal iniciado - 2 arquivo(s) salvos no storage",
  "data": {
    "municipio": "Palmares",
    "arquivos_processados": 2,
    "arquivos_salvos_storage": 2,
    "storage_type": "local_storage",
    "processamento_status": "EM_BACKGROUND",
    "resultados": [...]
  }
}
```

### 2. Executar Cálculos Manualmente
```http
POST /api/upload/executar-calculos
```
**Corpo da requisição:**
```json
{
  "municipio": "Palmares",
  "unidade": "CAF" // opcional, se omitido processa todo município
}
```

### 3. Status do Processamento
```http
GET /api/upload/status?municipio=Palmares
```

**Resposta:**
```json
{
  "status": "success",
  "data": {
    "municipio": "Palmares",
    "arquivos_storage": 3,
    "unidades": [
      {
        "nome": "CAF",
        "total_medicamentos": 150,
        "medicamentos_com_calculos": 150,
        "ultima_atualizacao": "2025-05-28T10:30:00Z"
      }
    ]
  }
}
```

### 4. Health Check
```http
GET /api/upload/health
```

## 🗂️ Estrutura de Armazenamento

### Ambiente Local
```
backend/functions/storage/uploads/
├── Palmares/
│   ├── CAF/
│   │   └── 2025-05-28T10-30-00-000Z_inventoryDataCAF.json
│   ├── ESF3/
│   │   └── 2025-05-28T10-30-00-000Z_inventoryDataESF3.json
│   └── Olavo/
│       └── 2025-05-28T10-30-00-000Z_inventoryDataOlavo.json
```

### Ambiente de Produção (Cloud Storage)
```
uploads/
├── Palmares/
│   ├── CAF/
│   │   └── inventoryData/
│   │       └── 2025-05-28T10-30-00-000Z_uuid_inventoryDataCAF.json
```

## 📊 Estrutura do Firestore

### Município → Unidades → Medicamentos
```
municipio/
├── Palmares/
│   ├── unidades/
│   │   ├── CAF/
│   │   │   ├── medicamentos_unidade/
│   │   │   │   ├── PARACETAMOL001/
│   │   │   │   │   ├── nome: "PARACETAMOL 500MG COMP"
│   │   │   │   │   ├── movimentacoes_semanais: {
│   │   │   │   │   │   "2025_22": 150,
│   │   │   │   │   │   "2025_21": 120
│   │   │   │   │   }
│   │   │   │   │   ├── contagens: { Cont04: 4, Cont08: 8, ... }
│   │   │   │   │   ├── medianas: { Md04: 125, Md08: 110, ... }
│   │   │   │   │   ├── tp_metodo: "1.ORDINÁRIOS"
│   │   │   │   │   ├── metodo: 150
│   │   │   │   │   ├── metEst: 2400
│   │   │   │   │   ├── estoque: 1500
│   │   │   │   │   ├── reposicao: 900
│   │   │   │   │   └── analise_reposicao: {...}
```

## 🧮 Cálculos Executados

O sistema executa automaticamente todos os cálculos do Excel:

1. **Contagens**: Cont04, Cont08, Cont12, Cont16, Cont26, Cont52, ContAno, ContTt
2. **Medianas**: Md04, Md08, Md12, Md16, Md26, Md52, MdAno, MdTt
3. **Máxima**: Valor máximo histórico
4. **TP_Metodo**: Classificação (1.ORDINÁRIOS, 2.INTERMITENTES, etc.)
5. **Método**: Valor calculado baseado no tipo
6. **MetEst**: Método × multiplicador da unidade
7. **Estoque**: Valor atual do estoque consolidado
8. **Reposição**: MetEst - Estoque
9. **Análise de Reposição**: Status e percentual de cobertura

## 🧪 Testando o Sistema

### 1. Executar o servidor local
```bash
cd backend/functions
npm run dev
```

### 2. Executar teste automatizado
```bash
cd backend/functions
npx ts-node src/scripts/testes/test-fluxo-completo.ts
```

### 3. Teste manual via frontend
1. Faça upload dos arquivos no frontend
2. Acompanhe os logs do servidor
3. Verifique `/api/upload/status?municipio=SeuMunicipio`
4. Confirme dados no Firestore

## 🔧 Configuração

### Variáveis de Ambiente
```env
NODE_ENV=development
STORAGE_BUCKET_URL=your-bucket-url # opcional para desenvolvimento
```

### Para Ambiente Local
- O sistema usa armazenamento local automaticamente
- Arquivos salvos em `backend/functions/storage/uploads/`
- Firebase Firestore continua sendo usado para dados

### Para Ambiente de Produção
- Configure `STORAGE_BUCKET_URL` no `.env`
- Sistema usa Cloud Storage automaticamente
- Cloud Functions processam arquivos via triggers

## 📝 Logs e Monitoramento

O sistema gera logs detalhados para acompanhar o processamento:

```
🚀 [UPLOAD SEMANAL] Endpoint chamado!
📊 [UPLOAD SEMANAL] Dados recebidos: ...
💾 [UPLOAD SEMANAL] ETAPA 1: Salvando arquivos no storage...
🔄 [UPLOAD SEMANAL] ETAPA 2: Processando arquivos do storage...
🧮 [CÁLCULOS] Iniciando cálculos para município: Palmares
✅ [CÁLCULOS] PARACETAMOL 500MG (CAF): Sucesso - TP: 1.ORDINÁRIOS, Reposição: 900
```

## 🎯 Benefícios do Novo Fluxo

1. **✅ Funciona em Local e Produção**: Mesmo código, diferentes storages
2. **✅ Processamento Assíncrono**: Frontend não fica travado
3. **✅ Rastreabilidade**: Acompanha cada etapa do processamento
4. **✅ Recuperação**: Pode re-executar cálculos se necessário
5. **✅ Validação**: Mesmo algoritmo do script de validação
6. **✅ Escalabilidade**: Preparado para grandes volumes

## 🚨 Pontos de Atenção

1. **Estoque Consolidado**: Depende dos arquivos JSON de todas as unidades
2. **Processamento em Background**: Pode levar alguns segundos para completar
3. **Storage Local**: Em desenvolvimento, arquivos ficam na pasta `storage/`
4. **Firestore**: Estrutura deve estar criada (município → unidades)

## 📞 Suporte

Se encontrar problemas:

1. Verifique logs do servidor
2. Confirme configuração do Firebase
3. Execute o teste automatizado
4. Verifique arquivos no storage
5. Consulte endpoint `/api/upload/status`
