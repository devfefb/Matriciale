# Template Base de Projetos
>atualizar o readme, para refletir o que for desenvolvido neste projeto em específico!

Template base para projetos da Beets Jr, com frontend em React e backend em Node.js.

## 🚀 Tecnologias

### Frontend
- React
- Material-UI
- Styled Components
- React Router DOM
- Axios
- TypeScript
- Vite

### Backend
- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- JWT
- Jest
- Docker

## 📁 Estrutura do Projeto

```
.
├── frontend/           # Aplicação React
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   └── utils/
│   └── README.md
│
├── backend/            # API Node.js
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── interfaces/
│   │   ├── middlewares/
│   │   ├── repositories/
│   │   ├── routes/
│   │   └── services/
│   └── README.md
│
└── README.md          # Este arquivo
```

## 🔥 Configuração do Firebase

### 1. Criar Projeto no Firebase Console
1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Digite o nome do projeto (ex: "baserepo-dev")
4. Desative o Google Analytics (opcional)
5. Clique em "Criar projeto"

### 2. Configurar Authentication
1. No menu lateral, clique em "Authentication"
2. Em "Sign-in method", habilite "Email/Password"

### 3. Configurar Firestore
1. No menu lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Escolha "Iniciar no modo de teste"
4. Selecione a região mais próxima (ex: "us-east1")

### 4. Gerar Credenciais do Service Account
1. No menu lateral, clique em "Configurações do Projeto" (ícone de engrenagem)
2. Vá para a aba "Contas de serviço"
3. Clique em "Gerar nova chave privada"
4. Salve o arquivo JSON gerado

### 5. Configurar Variáveis de Ambiente
1. No backend, crie um arquivo `.env` baseado no `.env.example`
2. Preencha as variáveis com os dados do arquivo JSON baixado:
```env
FIREBASE_TYPE="service_account"
FIREBASE_PROJECT_ID="seu-projeto-id"
FIREBASE_PRIVATE_KEY_ID="chave-privada-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua-Chave-Privada\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="email-do-firebase@seu-projeto.iam.gserviceaccount.com"
FIREBASE_CLIENT_ID="seu-client-id"
FIREBASE_AUTH_URI="https://accounts.google.com/o/oauth2/auth"
FIREBASE_TOKEN_URI="https://oauth2.googleapis.com/token"
FIREBASE_AUTH_PROVIDER_X509_CERT_URL="https://www.googleapis.com/oauth2/v1/certs"
FIREBASE_CLIENT_X509_CERT_URL="https://www.googleapis.com/robot/v1/metadata/x509/seu-projeto.iam.gserviceaccount.com"
FIREBASE_UNIVERSE_DOMAIN="googleapis.com"
```

⚠️ **IMPORTANTE:**
- Nunca compartilhe ou comite o arquivo de credenciais do Firebase
- Mantenha o arquivo `.env` no `.gitignore`
- Em produção, use variáveis de ambiente seguras
- Faça backup das credenciais em local seguro

## 🔧 Instalação

1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/seu-repo.git
cd seu-repo
```

2. Instale as dependências do frontend
```bash
cd frontend
npm install
# ou
yarn install
```

3. Instale as dependências do backend
```bash
cd ../backend
npm install
# ou
yarn install
```

4. Configure as variáveis de ambiente
```bash
# Frontend
cd ../frontend
cp .env.example .env

# Backend
cd ../backend
cp .env.example .env
```

6. Inicie os servidores

Em um terminal:
```bash
cd frontend
npm run dev
# ou
yarn dev
```

Em outro terminal:
```bash
cd backend
npm run dev
# ou
yarn dev
```

## 📚 Scripts Disponíveis

### Frontend
- `dev`: Inicia o servidor de desenvolvimento
- `build`: Gera a build de produção
- `preview`: Visualiza a build de produção
- `lint`: Executa o linter
- `test`: Executa os testes

### Backend
- `dev`: Inicia o servidor de desenvolvimento
- `build`: Gera a build de produção
- `start`: Inicia o servidor em produção
- `test`: Executa os testes
- `lint`: Executa o linter
- `migrate`: Executa as migrações do banco

## 🌐 Endpoints

### Autenticação
- `POST /api/auth/login`: Login de usuário
- `POST /api/auth/register`: Registro de usuário
- `POST /api/auth/refresh`: Refresh token
- `POST /api/auth/logout`: Logout de usuário

### Usuários
- `GET /api/users`: Lista usuários
- `GET /api/users/:id`: Obtém usuário
- `POST /api/users`: Cria usuário
- `PUT /api/users/:id`: Atualiza usuário
- `DELETE /api/users/:id`: Remove usuário

### Dashboard
- `GET /api/dashboard`: Dados do dashboard
- `GET /api/dashboard/stats`: Estatísticas
- `GET /api/dashboard/chart`: Dados do gráfico

## 🔒 Autenticação

A autenticação é feita via JWT (JSON Web Token):

1. O usuário faz login com email e senha
2. O backend retorna um token JWT
3. O token é armazenado no localStorage
4. O token é enviado no header `Authorization` em todas as requisições
5. O token expira após 24 horas

## 🎨 Temas

A aplicação utiliza o Material-UI para tematização:

- Cores primárias e secundárias customizadas
- Tipografia personalizada
- Componentes estilizados
- Modo escuro/claro
- Responsividade

## ⚡ Performance

Otimizações implementadas:

### Frontend
- Code splitting
- Lazy loading
- Memoização
- Tree shaking
- Bundle optimization

### Backend
- Caching
- Rate limiting
- Compression
- Connection pooling
- Query optimization

## 🔐 Segurança

Medidas de segurança:

- HTTPS
- JWT
- CORS
- Helmet
- Rate limiting
- Input validation
- SQL injection protection
- XSS protection
- CSRF protection
- Password hashing
- Error masking

## 🧪 Testes

### Frontend
- Jest
- React Testing Library
- Cypress
- Testes unitários
- Testes de integração
- Testes e2e

### Backend
- Jest
- Supertest
- Testes unitários
- Testes de integração
- Testes e2e

## 📖 Documentação

Cada pasta contém seu próprio README com:

- Propósito
- Estrutura
- Exemplos
- Boas práticas
- Padrões
- Responsabilidades

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

> Obs.: Em caso de dúvidas ou sugestões, tratar com Gustavo Moraes, Diretor de Projetos.
> Email: gustavo.moraes@beetsjr.com

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.





























# Prompts para Cursor AI - Sistema de Gestão de Estoque Farmacêutico

## PROMPT 1: FASE 1 - Integração e Generalização do Ambiente de Teste Local

### Contexto do Sistema
Você está trabalhando em um sistema de gestão de estoque farmacêutico que possui dois fluxos principais:
1. **Fluxo Semanal**: Upload de planilhas de movimentação e balancete por unidade
2. **Fluxo de Onboarding**: Upload de planilha massiva com histórico completo de novo município

### Estado Atual do Código
- ✅ **JÁ IMPLEMENTADO**: Lógica de recálculo completa e validada em `backend/scripts/testes/validar-calculos.ts`
- ✅ **JÁ IMPLEMENTADO**: Scripts de extração no frontend (`frontend/extraction/script.cjs` e `frontend/extraction/data/extracao_estoques/script_extracao.cjs`)
- ✅ **JÁ IMPLEMENTADO**: Motor de onboarding em `backend/scripts/inserir_semanas/`
- ❌ **NÃO IMPLEMENTADO**: Interfaces drag & drop para upload
- ❌ **NÃO IMPLEMENTADO**: Generalização para remover referências fixas a nomes de unidades/municípios
- ❌ **NÃO IMPLEMENTADO**: Orquestração automatizada do fluxo de teste local

### Objetivos da Fase 1
Transformar o processo de teste manual atual em um fluxo automatizado e robusto para ambiente local.

### Tarefas Específicas

#### 1. Implementar Interfaces Drag & Drop
- Criar dois componentes de frontend distintos:
  - Interface para **Fluxo Semanal**: Upload de múltiplas planilhas (movimentação + balancete) por unidade
  - Interface para **Fluxo de Onboarding**: Upload de uma única planilha massiva histórica
- Integrar com os scripts de extração existentes (`script.cjs` e `script_extracao.cjs`)
- Implementar feedback visual de progresso e validação de arquivos

#### 2. Generalizar o Código (Tornar Agnóstico)
- **Frontend**: Refatorar `script.cjs` e `script_extracao.cjs` para:
  - Extrair dinamicamente nome da unidade/município a partir dos nomes dos arquivos
  - Eliminar qualquer referência hardcoded a nomes específicos (ex: CAF, Olavo, ESF3)
  - Implementar parsing inteligente dos nomes de arquivo para identificar unidade e tipo de dados

- **Backend**: Revisar e refatorar `validar-calculos.ts` e scripts relacionados para:
  - Aceitar parâmetros dinâmicos de unidade/município
  - Remover dependências de nomes fixos de entidades

#### 3. Orquestrar Fluxo de Teste Local
Implementar sistema de pastas e observação automática:

```
projeto/
├── test-input/          # Pasta observada pelo backend
├── test-output/         # Resultados dos cálculos
├── test-gabaritos/      # Arquivos de referência para validação
```

- **Frontend**: Após extração, salvar JSON em `test-input/`
- **Backend**: Implementar observador de pasta (`fs.watch` ou similar) que:
  - Detecta novos arquivos JSON em `test-input/`
  - Dispara `validar-calculos.ts` automaticamente
  - Salva resultado em `test-output/`
  - Remove arquivo processado de `test-input/`

#### 4. Sistema de Validação Consolidado
- Implementar comparação automática entre saída gerada e gabarito esperado
- Criar interface para visualizar diferenças e aprovar/rejeitar resultados
- Sistema de versionamento de gabaritos para diferentes cenários de teste

### Estrutura Esperada Pós-Implementação
```
frontend/
├── components/
│   ├── UploadSemanal.vue/jsx     # Interface drag&drop fluxo semanal
│   └── UploadOnboarding.vue/jsx  # Interface drag&drop onboarding
├── extraction/
│   ├── script.cjs                # [REFATORADO] Agnóstico a unidades
│   └── data/extracao_estoques/
│       └── script_extracao.cjs   # [REFATORADO] Agnóstico a municípios

backend/
├── scripts/
│   ├── testes/
│   │   ├── validar-calculos.ts   # [EXISTENTE] Motor de cálculo
│   │   └── file-watcher.ts       # [NOVO] Observador de pasta test-input
│   └── inserir_semanas/          # [EXISTENTE] Motor onboarding
├── test-input/                   # [NOVA] Pasta monitorada
├── test-output/                  # [NOVA] Resultados
└── test-gabaritos/               # [NOVA] Arquivos de referência
```

### Critérios de Sucesso
- [ ] Upload via drag&drop funcional para ambos os fluxos
- [ ] Sistema funciona com qualquer nome de unidade/município extraído do arquivo
- [ ] Fluxo completamente automatizado: upload → extração → processamento → resultado
- [ ] Validação automática contra gabaritos com interface de comparação
- [ ] Zero intervenção manual necessária no processo de teste

---

## PROMPT 2: FASE 2 - Transição para Ambiente de Produção

### Contexto da Fase 2
Com a Fase 1 concluída, você possui um ambiente de teste local totalmente funcional e automatizado. Agora o objetivo é adaptar este fluxo para operar em produção na nuvem, mantendo a mesma lógica de cálculo mas alterando apenas as camadas de entrada e saída de dados.

### Estado Atual (Pós-Fase 1)
- ✅ **IMPLEMENTADO NA FASE 1**: Sistema de teste local automatizado
- ✅ **IMPLEMENTADO NA FASE 1**: Interfaces drag & drop funcionais
- ✅ **IMPLEMENTADO NA FASE 1**: Código generalizado (agnóstico a unidades/municípios)
- ✅ **JÁ EXISTIA**: Estrutura MVC atual
- ❌ **NÃO IMPLEMENTADO**: Rota para envio de JSONs para cloud storage
- ❌ **NÃO IMPLEMENTADO**: Integração com cloud storage para processamento
- ❌ **NÃO IMPLEMENTADO**: Sistema de eventos do storage para disparar backend
- ❌ **NÃO IMPLEMENTADO**: Persistência no banco de dados (modo production)

### Objetivos da Fase 2
Migrar o fluxo local para produção na nuvem, utilizando a mesma lógica de cálculo com diferentes camadas de I/O.

### Arquitetura Alvo
```
PRODUÇÃO:
Frontend → Cloud Storage → Event Trigger → Backend → Database
   ↓            ↓              ↓            ↓         ↓
Upload     JSON Storage    Auto-trigger   Cálculo   Persistência

TESTE (Fase 1):
Frontend → Local Folder → File Watcher → Backend → Local File
   ↓            ↓              ↓           ↓         ↓
Upload     test-input/    Observador    Cálculo   test-output/
```

### Tarefas Específicas

#### 1. Integrar com Cloud Storage
- **Frontend**: Modificar componentes de upload para:
  - Detectar modo de operação (test vs production) via variável de ambiente
  - **Modo Production**: Enviar JSON extraído diretamente para bucket cloud storage
  - **Modo Test**: Manter comportamento da Fase 1 (salvar em pasta local)
  - Utilizar rota MVC existente para upload para storage

- **Backend**: Implementar trigger de eventos do storage:
  - Configurar listener para eventos de criação de arquivo no bucket
  - Mapear eventos para disparar o mesmo motor de cálculo (`validar-calculos.ts`)
  - Implementar download automático do JSON do storage para processamento

#### 2. Sistema de Modo de Operação
Implementar chave seletora já mencionada no documento:

```typescript
enum OperationMode {
  TEST = 'test',
  PRODUCTION = 'production'
}

// Controle via variável de ambiente
const MODE = process.env.OPERATION_MODE || OperationMode.TEST;
```

#### 3. Integrar com Banco de Dados
- **Refatorar `validar-calculos.ts`** para suportar duplo modo:
  - **Modo Test**: Salvar resultado como arquivo em `test-output/` (comportamento atual)
  - **Modo Production**: Persistir dados calculados diretamente nas tabelas do banco

- **Implementar camada de persistência**:
  - Mapear estrutura do JSON calculado para schema do banco
  - Implementar transações para garantir consistência
  - Atualizar campos: `qtd_saidas_periodo`, `qtd_periodo_final`, medianas (Md04, etc.), Máximo, Metodo, MetEst, Reposição, contadores

#### 4. Orquestração Completa do Fluxo de Produção
Implementar ciclo completo automatizado:

1. **Upload**: Administrador faz upload via interface drag&drop
2. **Extração**: Frontend extrai dados e gera JSON
3. **Storage**: JSON enviado para cloud storage via rota MVC
4. **Trigger**: Evento de storage dispara processamento backend
5. **Processamento**: Backend executa `validar-calculos.ts` em modo production
6. **Persistência**: Dados calculados salvos no banco de dados
7. **Limpeza**: Arquivo temporário removido do storage

#### 5. Tratamento de Erros e Monitoramento
- Implementar logs detalhados para rastreamento do fluxo
- Sistema de retry para falhas temporárias
- Notificações de erro para administrador
- Métricas de performance e uso

### Estrutura de Código (Adições/Modificações)

```
backend/
├── scripts/
│   ├── calculos/                    # [NOVA] Ambiente de produção
│   │   ├── production-processor.ts  # [NOVO] Orquestrador produção
│   │   └── database-adapter.ts      # [NOVO] Camada persistência BD
│   ├── testes/
│   │   └── validar-calculos.ts      # [REFATORADO] Suporte duplo modo
│   └── shared/
│       ├── operation-mode.ts        # [NOVO] Enum e controle de modo
│       └── storage-events.ts        # [NOVO] Listeners cloud storage
├── controllers/                     # [EXISTENTE] Estrutura MVC
├── models/                          # [EXISTENTE] 
└── routes/                          # [EXISTENTE] Rota storage já existe

frontend/
├── components/
│   ├── UploadSemanal.vue/jsx        # [REFATORADO] Suporte duplo modo
│   └── UploadOnboarding.vue/jsx     # [REFATORADO] Suporte duplo modo
└── config/
    └── environment.ts               # [NOVO] Configuração modo operação
```

### Integração com Estrutura MVC Existente
- **Controllers**: Utilizar controller existente para upload, adicionar controller para processamento
- **Models**: Mapear para entidades do banco (medicamentos, movimentações, estoques)
- **Routes**: Usar rota existente para storage, adicionar rotas para status e monitoramento

### Critérios de Sucesso
- [ ] Sistema funciona identicamente em modo test (local) e production (nuvem)
- [ ] Upload → storage → trigger → processamento → banco funcionando automaticamente
- [ ] Zero modificação necessária na lógica de cálculo (`validar-calculos.ts`)
- [ ] Dados persistidos corretamente no banco de dados
- [ ] Limpeza automática de arquivos temporários
- [ ] Logs e monitoramento implementados
- [ ] Fluxo completo testado end-to-end em ambiente de produção

### Validação Final
- Testar ambos os fluxos (Semanal e Onboarding) em produção
- Verificar consistência de dados entre modo test e production
- Confirmar performance adequada para volumes esperados (ex: JSON 10.7 MB)
- Validar tratamento de erros e recuperação