# Modo de Desenvolvimento - Upload e Validação

## 🎯 Objetivos Implementados

Durante a fase de desenvolvimento e validação, o sistema foi configurado para:

1. **📤 Salvar JSON no Storage**: O arquivo processado pelo frontend é salvo corretamente
2. **🚫 NÃO modificar banco**: Nenhuma operação de escrita no Firestore é executada
3. **✅ Gerar validação local**: Arquivos de validação são criados em pasta local
4. **🔍 Permitir inspeção**: JSON original fica disponível para análise

## 🔧 Modificações Implementadas

### 1. Nova Lógica de Movimentação Semanal (executar-calculos.ts)

```typescript
// Nova função para atualizar movimentações com sufixos
function atualizarMovimentacaoSemanal(
  movimentacoesAtuais: { [key: string]: number },
  anoSemana: string,
  novoValor: number
): { [key: string]: number } {
  // Cenário 1: Índice livre
  if (!movimentacoesAtuais[anoSemana]) {
    movimentacoesAtuais[anoSemana] = novoValor;
    return movimentacoesAtuais;
  }
  
  // Cenário 2: Índice ocupado - usar sufixo _2, _3, etc.
  let sufixo = 2;
  let chaveAlternativa = `${anoSemana}_${sufixo}`;
  
  while (movimentacoesAtuais[chaveAlternativa]) {
    sufixo++;
    chaveAlternativa = `${anoSemana}_${sufixo}`;
  }
  
  movimentacoesAtuais[chaveAlternativa] = novoValor;
  return movimentacoesAtuais;
}
```

**Regras implementadas:**
- ✅ Se `2025_22` não existe → cria `2025_22: valor`
- ✅ Se `2025_22` já existe → cria `2025_22_2: valor`
- ✅ Se `2025_22_2` existe → cria `2025_22_3: valor`
- ✅ Medicamentos não encontrados → registra valor `0`

### 2. Upload Controller Desativado (UploadController.ts)

```typescript
// TEMPORARIAMENTE DESATIVADO: Não executar cálculos automáticos
// Em vez disso, executar apenas validação para gerar arquivos locais
console.log(`📋 [BACKGROUND] Executando VALIDAÇÃO para ${municipio} (sem modificar banco)...`);

try {
  // Executar validação que gera arquivos locais sem tocar no banco
  await validarCalculosComGabarito();
  console.log(`✅ [BACKGROUND] Validação concluída - arquivos gerados em output_validacao/`);
} catch (error) {
  console.warn(`⚠️ [BACKGROUND] Erro na validação (não crítico):`, error);
}
```

**Mudanças principais:**
- ✅ Imports de `executar-calculos` desativados
- ✅ Chama `validar-calculos` em vez de executar cálculos
- ✅ Todos os métodos de salvamento no Firestore simulam operações
- ✅ Logs indicam claramente que banco não foi modificado

### 3. Endpoints Atualizados

```typescript
// Endpoint executar-calculos também apenas valida
console.log(`⚠️ [CALCULOS] ATENÇÃO: Execução de cálculos DESATIVADA temporariamente`);
console.log(`📋 [CALCULOS] Executando apenas validação para gerar arquivos locais...`);

try {
  await validarCalculosComGabarito();
  console.log(`✅ [CALCULOS] Validação concluída - verifique pasta output_validacao/`);
} catch (error) {
  console.error(`❌ [CALCULOS] Erro na validação:`, error);
}
```

## 📁 Estrutura de Arquivos Gerados

### Storage Local (JSON Original)
```
backend/functions/storage/uploads/
├── PalmaresTest/
│   ├── TESTE/
│   │   └── 2025-05-28T10-30-00-000Z_inventoryDataTESTE.json
│   ├── CAF/
│   │   └── 2025-05-28T10-30-00-000Z_inventoryDataCAF.json
│   └── ESF3/
│       └── 2025-05-28T10-30-00-000Z_inventoryDataESF3.json
```

### Validação Local (Cálculos)
```
backend/functions/src/scripts/testes/output_validacao/
├── relatorio-validacao.json          # Relatório completo
├── relatorio-resumido.json          # Resumo executivo
└── estoqueConsolidado.json          # Estoque consolidado
```

## 🧪 Como Testar

### 1. Teste Automático Completo
```bash
cd backend/functions
npx ts-node src/scripts/testes/test-storage-apenas.ts
```

### 2. Teste Manual Passo a Passo

1. **Iniciar servidor**:
   ```bash
   cd backend/functions
   npm run dev
   ```

2. **Fazer upload no frontend**:
   - Selecionar arquivos de movimentação e balancete
   - Processar normalmente
   - ✅ Deve salvar JSON no storage
   - ❌ NÃO deve alterar banco

3. **Verificar storage**:
   ```bash
   ls -la backend/functions/storage/uploads/
   ```

4. **Verificar validação**:
   ```bash
   ls -la backend/functions/src/scripts/testes/output_validacao/
   ```

5. **Executar cálculos manuais**:
   ```bash
   curl -X POST http://localhost:3000/api/upload/executar-calculos \
     -H "Content-Type: application/json" \
     -d '{"municipio":"PalmaresTest"}'
   ```

## 🔍 Verificações de Segurança

### ✅ O que DEVE acontecer:
- JSON processado salvo no storage local
- Logs indicando modo desenvolvimento
- Arquivos de validação gerados
- Resposta HTTP indicando sucesso

### ❌ O que NÃO deve acontecer:
- Nenhuma escrita no Firestore
- Nenhuma criação de documentos no banco
- Nenhuma atualização de movimentações semanais
- Nenhuma execução de cálculos no banco

### 🔍 Como verificar:
```bash
# 1. Verificar logs do servidor
# Deve mostrar: "[FIRESTORE DESATIVADO]" em várias linhas

# 2. Verificar storage
find backend/functions/storage -name "*.json" -type f

# 3. Verificar validação
find backend/functions/src/scripts/testes/output_validacao -name "*.json" -type f

# 4. Verificar que banco não foi alterado
# Use Firebase Console ou query para confirmar
```

## 🚀 Para Ativar Modo Produção (Futuro)

Quando estiver pronto para produção:

1. **Reativar imports**:
   ```typescript
   import { executarCalculosParaMunicipio, executarCalculosParaUnidade } from '../scripts/testes/executar-calculos';
   ```

2. **Trocar validação por execução**:
   ```typescript
   // Trocar isto:
   await validarCalculosComGabarito();
   
   // Por isto:
   const resultado = await executarCalculosParaMunicipio(municipio);
   ```

3. **Reativar salvamento no Firestore**:
   - Remover comentários "TEMPORARIAMENTE DESATIVADO"
   - Restaurar lógica original de `processarDadosParaFirestore`

## 📊 Status Atual

- ✅ **Nova lógica de movimentação implementada**
- ✅ **Upload salva apenas no storage**
- ✅ **Banco de dados protegido contra alterações**
- ✅ **Validação gera arquivos locais**
- ✅ **JSON original disponível para inspeção**
- ✅ **Endpoints funcionais em modo desenvolvimento**

## 🎯 Próximos Passos

1. **Testar upload completo** com dados reais do frontend
2. **Verificar JSON salvo no storage** com dados corretos
3. **Analisar arquivos de validação** gerados
4. **Confirmar que banco não foi alterado**
5. **Ajustar lógica conforme necessário**

**Importante**: O arquivo `validar-calculos.ts` permanece intocado, conforme solicitado!

