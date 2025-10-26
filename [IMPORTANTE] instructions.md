### **Objetivo Central do Sistema**

O sistema visa automatizar a gestão de estoque e reposição de medicamentos e materiais farmacêuticos para um município. Ele processa relatórios semanais de movimentação, enriquece esses dados com classificações e regras de negócio, calcula métricas de consumo e, por fim, gera uma sugestão de reposição para cada item em cada unidade, com a capacidade de ser testado localmente simulando o ambiente de produção.

---

### **Arquitetura e Fluxo de Produção**

O fluxo de dados desde a entrada do usuário até a atualização no banco de dados em um ambiente de produção deve seguir os seguintes passos:

1.  **Upload dos Arquivos (Front-end):**
    * O usuário arrasta e solta (`drag and drop`) os arquivos Excel (`.xls`) de cada unidade (CAF e Farmácias) no componente `UploadSemanal.jsx`.
    * O front-end processa esses arquivos e os converte para o formato JSON.

2.  **Envio para a Nuvem (Front-end -> Cloud Function -> Cloud Storage):**
    * O front-end **não** envia o JSON diretamente. Ele faz uma requisição para uma Cloud Function solicitando uma URL assinada (`Signed URL`) para cada arquivo.
    * Com a URL segura em mãos, o front-end faz o upload de cada JSON diretamente para o Cloud Storage. Isso garante segurança e eficiência.

3.  **Processamento e Cálculo (Back-end - Cloud Function):**
    * O upload de um novo arquivo JSON no Cloud Storage aciona uma segunda Cloud Function, que é o coração do processamento.
    * Esta função:
        * Lê os JSONs recém-chegados.
        * Aplica as regras para extrair o valor da **movimentação semanal** (conforme detalhado abaixo, com lógica específica para a CAF).
        * Acessa o Firestore para obter o histórico de movimentações do medicamento (`movimentacoes_semanais`).
        * Adiciona a nova movimentação semanal ao histórico (ex: cria a chave `"2025_22"` se a anterior era `"2025_21"`).
        * Com o histórico atualizado, **recalcula todos os campos derivados**: medianas (`Md04`, `Md08`...), contagens (`Cont04`, `Cont08`...), `TP_Movimento`, `MÉTODO` e `Reposição`.
        * **Salva/Atualiza** o documento do medicamento no Firestore com todos os novos valores calculados.

---

### **Estrutura de Dados no Firestore**

A base de dados deve ser flexível para acomodar múltiplos municípios e suas respectivas unidades, seguindo a estrutura:

* **Coleção:** `municipio`
    * **Documento:** `{nome_do_municipio}` (ex: "Palmares")
        * **Coleção:** `unidades`
            * **Documento:** `{nome_da_unidade}` (ex: "CAF", "Farmacia Central")
                * **Coleção:** `medicamentos_unidade`
                    * **Documento:** `{codigo_do_medicamento}`
                        * **Campos:** `nome_item`, `classificacao`, `MetEst`, `Reposição`, `TP_Movimento`, `MÉTODO`, etc.
                        * **Objeto:** `movimentacoes_semanais` (mapa com chaves `ANO_SEMANA` e valores de quantidade movimentada).

---

### **Detalhamento do Processamento e Regras de Negócio**

#### **1. Enriquecimento dos Dados (Geração do JSON)**

Ao processar os arquivos Excel, os seguintes campos devem ser gerados no JSON, aplicando as regras descritas:

* **`tipo_mov` (Classificação da Movimentação):** Este é um campo crucial que ainda precisa ser inserido nos JSONs. A lógica é a seguinte:
    * **Primeiro Nível (TP):**
        * `A`: Se `Histórico` contém "SALDO ANTERIOR".
        * `E`: Se a coluna `Entradas` for diferente de zero/vazia.
        * `S`: Se não for `A` ou `E` e a coluna `Saídas` for diferente de zero.
    * **Segundo Nível (TIPO) - Detalhamento de TP:**
        * `AA`: "SALDO ANTERIOR".
        * `EA`: Entrada por Compra (TP='E' e Histórico bate com nomes de fornecedores validados pelo campo `Documento`).
        * `ED`: Entrada por Doação (TP='E' e Histórico contém "DOAÇÃO").
        * `EP`: Entrada por Empréstimo (TP='E' e Histórico contém "TRANSFERENCIA ENTRE MUNICIPIOS", etc.).
        * `ET`: Entrada por Transferência (TP='E' e Histórico contém nome de outra farmácia do município).
        * `EU`: Entrada para Unidades (TP='E' e Histórico contém nome de UBS, Pronto Atendimento, etc.).
        * `EX`: Entrada por Ajuste (TP='E' e Histórico contém "ACERTO DE ESTOQUE", "QUEBRA", etc.).
        * **`SA`**: Saída por Dispensação (TP='S' e Histórico contém nome de paciente. É a regra residual, aplicada após todas as outras classificações de saída).
        * `SD`: Saída por Doação (TP='S' e Histórico contém "DOAÇÃO").
        * `ST`: Saída por Transferência (TP='S' e Histórico contém nome de outra farmácia).
        * **`SU`**: Saída para Unidades (TP='S' e Histórico contém nome de UBS, etc.).
        * `SV`: Saída por Vencimento (TP='S' e Histórico contém "VENCIDO" ou "PERDA POR VALIDADE").
        * `SX`: Saída por Ajuste (TP='S' e Histórico contém "ACERTO DE ESTOQUE", etc.).

* **`QTDMOV`:** Normalização das colunas `Entradas` (valor positivo) e `Saídas` (valor negativo).

#### **2. Lógica de Cálculo da Movimentação Semanal (Extração do Valor do JSON)**

Esta é a lógica que precisa ser modificada e implementada com máxima atenção, pois define a base para todos os outros cálculos.

* **Se a unidade for a CAF:**
    1.  Para cada item, iterar sobre seu array de movimentações.
    2.  Para cada movimentação, verificar o campo `saida`. Se for nulo ou zero, ignorar e ir para a próxima.
    3.  Se `saida` tiver valor, verificar o campo `observacao`. Se `observacao` estiver vazio, **ignorar o valor**.
    4.  Se `observacao` não estiver vazio, verificar o campo `historico`. Se `historico` **NÃO** contiver a string "farmacia", **considerar o valor de `saida`** para a soma da movimentação.
    5.  O valor total calculado para a movimentação na CAF será somado aos valores obtidos nas outras unidades para compor a demanda total.

* **Se a unidade NÃO for a CAF (Farmácias):**
    1.  Para cada item, iterar sobre seu array de movimentações.
    2.  O critério principal é o campo `TIPO` (ou `tipo_mov` no JSON).
    3.  Somar as quantidades (`QTDMOV` ou `Saídas`) apenas das movimentações classificadas como:
        * **`SA` – SAÍDA POR DISPENSAÇÃO AOS PACIENTES**
        * **`SU` – SAÍDA POR TRANSFERÊNCIAS PARA DEMAIS UNIDADES DO MUNICÍPIO**
    4.  A soma desses valores para a semana resulta na movimentação semanal daquela farmácia para aquele item.

---

### **Pontos Chave para Implementação e Ação**

1.  **Ambiente de Teste Local:** Para que o sistema possa ser testado localmente como se estivesse em produção, é necessário configurar o **Firebase Local Emulator Suite**. Ele permite rodar versões locais do Firestore, Cloud Functions e Storage, simulando o ambiente da nuvem na sua máquina.

2.  **Modificar o Processamento:** O código da Cloud Function que processa os JSONs deve ser ajustado para implementar a **lógica de cálculo de movimentação** descrita acima, com a diferenciação explícita entre CAF e as demais farmácias.

3.  **Atenção aos Cálculos Dependentes:** Os cálculos da metodologia de reposição (Medianas, Contagens, `MÉTODO`, etc.) dependem **criticamente** da base de dados gerada a partir das movimentações `SA` e `SU`. A precisão na classificação e filtro desses dois tipos é fundamental para a acurácia do sistema.

4.  **Evolução do `validar-calculos`:** O script `validar-calculos` é um excelente ponto de partida. No fluxo de produção, sua lógica deve ser integrada à Cloud Function de processamento. A etapa final, que atualmente apenas simula, deve ser implementada para **efetivamente escrever os dados calculados no documento correspondente no Firestore**.

5.  **Configuração Dinâmica:** O sistema deve ser capaz de lidar com diferentes municípios e unidades dinamicamente. Os nomes ("Palmares", "CAF", etc.) devem ser passados como parâmetros ou extraídos do contexto do arquivo sendo processado, e não fixos no código (`hardcoded`).