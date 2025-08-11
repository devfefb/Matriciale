# Scripts de Inserção de Dados no Firebase

Este conjunto de scripts automatiza a inserção de dados de medicamentos do arquivo `extracao_movimentacoes_semanais.json` no Firebase Firestore.

## 📁 Estrutura dos Scripts

```
src/scripts/
├── interfaces.ts          # Interfaces TypeScript compartilhadas
├── utils.ts              # Utilitários compartilhados
├── inserir-banco.ts      # Script principal de inserção
├── validar-dados.ts      # Script de validação
├── executar-insercao.ts  # Executor de inserção
└── executar-validacao.ts # Executor de validação
```

## 🏗️ Estrutura do Banco de Dados

O script organiza os dados na seguinte estrutura:

```
municipio (coleção)
└── Palmares (documento)
    └── unidades (coleção)
        ├── CAF (documento)
        │   └── medicamentos_unidade (coleção)
        │       └── [hash_id] (documento)
        │           ├── nome: string
        │           ├── cod_item: string
        │           ├── classificacao: string
        │           ├── movimentacoes_semanais: map
        │           ├── data_criacao: timestamp
        │           └── data_atualizacao: timestamp
        ├── ESF3 (documento)
        └── Olavo (documento)
```

## 📋 Pré-requisitos

1. **Variáveis de ambiente configuradas** no arquivo `.env`:
   ```
   FIREBASE_PROJECT_ID=seu-projeto-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
   FIREBASE_TYPE=service_account
   FIREBASE_PRIVATE_KEY_ID=chave-privada-id
   FIREBASE_CLIENT_ID=client-id
   FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
   FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
   FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
   FIREBASE_UNIVERSE_DOMAIN=googleapis.com
   ```

2. **Arquivo de dados** `extracao_movimentacoes_semanais.json` no diretório `scripts/dados/`

## 🚀 Como Executar

### Validação de Dados
```bash
cd backend/functions
npm run validar-dados
```

### Inserção de Dados
```bash
cd backend/functions
npm run inserir-dados
```

## ✨ Funcionalidades

### ✅ Validação de Dados
- Script de validação para verificar estrutura do JSON antes da inserção
- Validação completa de todos os campos obrigatórios
- Geração de estatísticas detalhadas dos dados
- Identificação de erros estruturais

### ✅ Processamento Hierárquico
- Processa município por município
- Para cada município, processa unidade por unidade
- Para cada unidade, insere medicamento por medicamento

### ✅ Geração de IDs Únicos
- Cada medicamento recebe um ID único baseado em hash do nome + código
- Evita duplicatas e permite atualizações

### ✅ Tratamento de Erros
- Continua processamento mesmo se um medicamento falhar
- Logs detalhados de sucessos e erros
- Relatório final com estatísticas

### ✅ Dados de Auditoria
- `data_criacao`: Timestamp de quando o documento foi criado
- `data_atualizacao`: Timestamp da última atualização

### ✅ Conversão de Dados
- Converte array de movimentações semanais para formato Map do Firestore
- Preserva estrutura original dos dados

### ✅ Código Organizado
- Interfaces TypeScript compartilhadas
- Utilitários reutilizáveis
- Sem duplicação de código
- Estrutura modular

## 📊 Logs e Monitoramento

O script fornece logs detalhados:

```
🚀 Iniciando inserção de dados no Firebase...
📁 Arquivo carregado com 1 município(s)

🏙️ Processando município: Palmares

🏥 Processando unidade: CAF
✅ Medicamento inserido: AAS - ÁCIDO ACETIL SALICILICO 100MG (325023001)
📊 Unidade CAF: 1 medicamentos inseridos, 0 erros

📈 Município Palmares: Total de 1 medicamentos inseridos, 0 erros

🎉 Processamento concluído!
📊 Resumo final:
   ✅ Total de medicamentos inseridos: 1
   ❌ Total de erros: 0
   📈 Taxa de sucesso: 100.00%
```

## 🔧 Arquitetura dos Scripts

### `interfaces.ts`
- Define todas as interfaces TypeScript compartilhadas
- Garante tipagem consistente entre módulos

### `utils.ts`
- Funções utilitárias reutilizáveis
- Geração de hash, processamento de dados, validação de ambiente

### `inserir-banco.ts`
- Lógica principal de inserção no Firebase
- Processamento hierárquico dos dados

### `validar-dados.ts`
- Validação completa da estrutura JSON
- Geração de estatísticas detalhadas

### `executar-insercao.ts` e `executar-validacao.ts`
- Scripts de entrada para execução
- Verificação de pré-requisitos

## 🛡️ Tratamento de Erros

- **Arquivo não encontrado**: Verifica se o arquivo JSON existe
- **Estrutura inválida**: Valida se o JSON tem a estrutura esperada
- **Erro de conexão**: Trata falhas de conexão com o Firebase
- **Dados inválidos**: Continua processamento ignorando registros problemáticos
- **Variáveis de ambiente**: Validação obrigatória antes da execução

## 🔐 Segurança

- Usa credenciais de service account do Firebase
- Não expõe dados sensíveis nos logs
- Validação de variáveis de ambiente obrigatórias
- Conexão segura via `firebase.ts`

## 🔄 Manutenção

Para atualizar dados existentes:
- O script usa `merge: true` para atualizar documentos existentes
- IDs únicos garantem que medicamentos sejam atualizados, não duplicados
- Timestamps de atualização são sempre atualizados

## 🐛 Troubleshooting

### Erro: "Variáveis de ambiente não configuradas"
- Verifique se o arquivo `.env` existe e está configurado
- Confirme se todas as variáveis obrigatórias estão definidas

### Erro: "Arquivo não encontrado"
- Verifique se `extracao_movimentacoes_semanais.json` está em `scripts/dados/`
- Confirme o nome e extensão do arquivo

### Erro: "Estrutura do JSON inválida"
- Execute `npm run validar-dados` para ver detalhes dos erros
- Verifique se o JSON tem o campo `cidades` como array

### Erro de conexão com Firebase
- Verifique as credenciais no arquivo `.env`
- Confirme se o projeto Firebase está ativo
- Verifique permissões da service account

## 📈 Melhorias Implementadas

- ✅ **Organização**: Todo código movido para `src/scripts/`
- ✅ **Modularização**: Interfaces e utilitários compartilhados
- ✅ **Tipagem**: TypeScript completo com interfaces
- ✅ **Reutilização**: Sem duplicação de código
- ✅ **Manutenibilidade**: Estrutura clara e organizada
- ✅ **Consistência**: Uso das variáveis `db` e `auth` do `firebase.ts`
