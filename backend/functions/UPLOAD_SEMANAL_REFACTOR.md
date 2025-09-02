# Refatoração do Upload Semanal

## Visão Geral

A implementação do upload semanal foi refatorada para seguir as melhores práticas de desenvolvimento local e produção para Cloud Functions, com estrutura modular e salvamento condicional baseado em `NODE_ENV`.

## Estrutura dos Arquivos

### 1. `app.ts` - Configuração do Express
- Contém toda a configuração da aplicação Express (middlewares, CORS, rotas)
- **NÃO** inicia o servidor com `app.listen()`
- Exporta apenas a instância do app
- CORS configurado condicionalmente para desenvolvimento e produção

### 2. `index.ts` - Entry Point para Cloud Functions
- Ponto de entrada **exclusivo** para Firebase Cloud Functions
- Importa a instância do app de `app.ts`
- Exporta como Cloud Function: `export const api = onRequest(app)`

### 3. `local-dev.ts` - Entry Point para Desenvolvimento Local
- Ponto de entrada **exclusivo** para desenvolvimento local
- Importa a instância do app de `app.ts`
- Inicia o servidor Express com `app.listen(PORT, ...)`
- Define `NODE_ENV=development` e `DISABLE_AUTH=true`

## Lógica de Salvamento Condicional

### FileStorageService

O novo `FileStorageService` implementa salvamento condicional baseado em `NODE_ENV`:

#### Desenvolvimento (`NODE_ENV=development`)
```typescript
// Salva arquivos no sistema de arquivos local
const result = await FileStorageService.salvarArquivoJSON(buffer, nomeArquivo);
// Retorna: { success: true, path: "uploads/arquivo.json", url: "file://..." }
```

#### Produção (`NODE_ENV=production`)
```typescript
// Faz upload para Firebase Storage
const result = await FileStorageService.salvarArquivoJSON(buffer, nomeArquivo);
// Retorna: { success: true, path: "uploads/semanal/arquivo.json", url: "https://..." }
```

## Nova Estrutura de Upload Otimizada

### Frontend para Backend

O frontend agora envia um payload JSON otimizado:

```javascript
const dadosParaEnvio = {
  tipo: 'semanal',
  municipio: 'municipio_teste',
  data_processamento: new Date().toISOString(),
  arquivos: [
    {
      nome_arquivo: 'inventoryDataCAF.json',
      content: {
        periodo_inicio: '15/11/2024',
        periodo_fim: '21/11/2024',
        itens: [/* array de itens */]
      }
    },
    {
      nome_arquivo: 'inventoryDataOlavo.json',
      content: {
        periodo_inicio: '15/11/2024',
        periodo_fim: '21/11/2024',
        itens: [/* array de itens */]
      }
    }
  ]
};
```

### Processamento no Backend

1. **Validação**: Verifica estrutura e conteúdo JSON
2. **Criação de Buffer**: Converte objetos para Buffer JSON
3. **Salvamento Condicional**: Usa `FileStorageService` baseado em `NODE_ENV`
4. **Metadados Firestore**: Salva informações no Firestore
5. **Resposta**: Retorna detalhes do processamento

## Como Usar

### Desenvolvimento Local

```bash
# 1. Instalar dependências
cd backend/functions
npm install

# 2. Configurar variáveis de ambiente
cp env.example .env

# 3. Iniciar servidor local
npm run dev
# ou
node src/local-dev.ts
```

### Produção (Cloud Functions)

```bash
# 1. Build do TypeScript
npm run build

# 2. Deploy para Firebase
firebase deploy --only functions
```

### Testando a Implementação

```bash
# Execute o script de teste
node test-upload-structure.js
```

## Endpoints

### POST /api/upload/semanal

#### Request Body
```json
{
  "tipo": "semanal",
  "municipio": "municipio_teste",
  "data_processamento": "2024-11-22T10:00:00.000Z",
  "arquivos": [
    {
      "nome_arquivo": "inventoryDataCAF.json",
      "content": {
        "periodo_inicio": "15/11/2024",
        "periodo_fim": "21/11/2024",
        "itens": [...]
      }
    }
  ]
}
```

#### Response (Desenvolvimento)
```json
{
  "status": "success",
  "message": "Upload semanal processado com sucesso - 2 arquivo(s) salvos",
  "data": {
    "municipio": "municipio_teste",
    "arquivos_processados": 2,
    "environment": "development",
    "storage_type": "local_filesystem",
    "arquivos_gerados": ["inventoryData_municipio_teste_CAF_2024-11-22.json"],
    "resultados": [
      {
        "unidade": "CAF",
        "arquivo_original": "inventoryDataCAF.json",
        "arquivo_salvo": "uploads/inventoryData_municipio_teste_CAF_2024-11-22.json",
        "url": "file:///.../uploads/inventoryData_municipio_teste_CAF_2024-11-22.json",
        "periodo": "15/11/2024 a 21/11/2024",
        "total_itens": 1
      }
    ]
  }
}
```

#### Response (Produção)
```json
{
  "status": "success",
  "message": "Upload semanal processado com sucesso - 2 arquivo(s) salvos",
  "data": {
    "municipio": "municipio_teste",
    "arquivos_processados": 2,
    "environment": "production",
    "storage_type": "firebase_storage",
    "arquivos_gerados": ["inventoryData_municipio_teste_CAF_2024-11-22.json"],
    "resultados": [
      {
        "unidade": "CAF",
        "arquivo_original": "inventoryDataCAF.json",
        "arquivo_salvo": "uploads/semanal/inventoryData_municipio_teste_CAF_2024-11-22.json",
        "url": "https://storage.googleapis.com/...",
        "periodo": "15/11/2024 a 21/11/2024",
        "total_itens": 1
      }
    ]
  }
}
```

## Benefícios da Refatoração

### 1. **Separação de Responsabilidades**
- `app.ts`: Configuração Express
- `index.ts`: Cloud Functions
- `local-dev.ts`: Desenvolvimento local

### 2. **Flexibilidade de Storage**
- Desenvolvimento: Arquivos locais
- Produção: Firebase Storage

### 3. **Estrutura Otimizada**
- Upload JSON direto (sem Base64)
- Validação de estrutura
- Metadados no Firestore

### 4. **Facilidade de Teste**
- Script de teste automatizado
- Logs detalhados
- Validação de estrutura

### 5. **Manutenibilidade**
- Código modular
- Tipagem TypeScript
- Tratamento de erros robusto

## Troubleshooting

### Erro: "Backend não está acessível"
- Verifique se o servidor está rodando: `npm run dev`
- Confirme a porta: `http://localhost:3001`

### Erro: "Resposta vazia do servidor"
- Verifique logs do backend
- Confirme estrutura do payload JSON

### Erro: "Firebase Storage"
- Verifique configuração do Firebase
- Confirme permissões do Storage

### Erro: "JSON inválido"
- Valide estrutura do `content` nos arquivos
- Confirme campos obrigatórios: `periodo_inicio`, `periodo_fim`, `itens`
