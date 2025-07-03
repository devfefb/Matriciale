

## Fluxograma: Extração de Algoritmo de Processamento de Dados para Gestão de Estoque

```mermaid
graph TD
    A[Início] --> B{Obtenção dos Dados Operacionais};

    B --> C[Exportar Relatório de Movimentação por Destinatário Final (Excel - Sem Cabeçalho)];
    B --> D[Exportar Balancete de Movimentações por Item (Excel - Sem Cabeçalho)];

    C --> E[Processar Relatório de Movimentação];
    D --> F[Processar Balancete de Movimentações];

    E --> E1[Atribuir ID Unidade];
    E --> E2[Identificar e Atribuir Código do Item e Nome do Item com base no Balancete];
    E --> E3[Classificar Item (REMUME, ASSISTENCIAL, etc.)];
    E --> E4[Calcular Semana: "ANO_SEMANA ANO"];
    E --> E5[Determinar Tipo de Movimentação (TP: A, E, S)];
    E --> E6[Determinar Subclassificação de Movimentação (TIPO: AA, EA, ED, etc.)];
    E --> E7[Normalizar Quantidade de Movimentação (QTDMOV: Entradas como +, Saídas como -)];
    E --> E8[Calcular Estoque Ajustado (ESTAJU)];
    E --> G[Base de Dados Operacional (Relatório de Movimentação Processado)];

    F --> F1[Ignorar Colunas em Branco];
    F --> F2[Garantir Código Sistêmico do Item (11 posições)];
    F --> H[Base de Dados Operacional (Balancete Processado)];

    G & H --> I{Construir Base para Metodologia de Reposição por Farmácia};

    I --> J[Filtrar Movimentações: TIPO = "SA" ou "SU"];
    J --> J1[Agrupar Dados por Item e Semana (Colunas Semanais de Qtd. Movimentada)];
    J --> J2[Calcular "Total Geral"];
    J --> J3[Calcular Medianas (Md04, Md08, ..., MdTt)];
    J --> J4[Calcular Ocorrências Semanais (Cont04, Cont08, ..., ContTt)];
    J --> J5[Classificar TP_Movimento (ENTRANTES, RECENTES, INATIVOS, INTERMITENTES, ORDINÁRIOS)];
    J --> K[Base de Dados para Metodologia por Farmácia];

    K --> L{Calcular MÉTODO para Reposição por Farmácia};
    L --> L1{Se TP_Movimento = "ENTRANTES"};
    L1 --> L2[MÉTODO = Quantitativo da única ocorrência];
    L --> L3{Se TP_Movimento = "INATIVOS"};
    L3 --> L4[MÉTODO = ZERO];
    L --> L5{Se TP_Movimento = "INTERMITENTES"};
    L5 --> L6[MÉTODO = Máxima / 4 (arredondar para 1 se < 1)];
    L --> L7{Se TP_Movimento = "ORDINÁRIOS" ou "RECENTES"};
    L7 --> L8[MÉTODO = Maior valor entre Md04 a MdTt];
    L --> M[MÉTODO Calculado por Item/Farmácia];

    M --> N[Calcular Estoque Ideal (MetEst = MÉTODO x Semanas Estratégicas - padrão 3)];
    N --> O[Obter Estoque Sistêmico do Balancete (Quantidade período final)];
    O --> P[Calcular Reposição por Farmácia (MetEst - Estoque Sistêmico)];
    P --> P1[Se Reposição < 0, Reposição = 0];
    P --> Q[Resultados de Reposição por Farmácia];

    I --> R{Construir Base para Metodologia de Reposição da CAF (Todas as Farmácias + CAF)};
    R --> S[Consolidar Dados de Movimentação de Todas as Farmácias e CAF];
    S --> T[Filtrar Movimentações: TIPO = "SA" ou "SU"];
    T --> T1[Agrupar Dados por Item e Semana (Colunas Semanais de Qtd. Movimentada)];
    T --> T2[Calcular "Total Geral"];
    T --> T3[Calcular Medianas (Md04, Md08, ..., MdTt)];
    T --> T4[Calcular Ocorrências Semanais (Cont04, Cont08, ..., ContTt)];
    T --> T5[Classificar TP_Movimento (ENTRANTES, RECENTES, INATIVOS, INTERMITENTES, ORDINÁRIOS)];
    T --> U[Base de Dados para Metodologia da CAF];

    U --> V{Calcular MÉTODO para Reposição da CAF};
    V --> V1{Se TP_Movimento = "ENTRANTES"};
    V1 --> V2[MÉTODO = Quantitativo da única ocorrência];
    V --> V3{Se TP_Movimento = "INATIVOS"};
    V3 --> V4[MÉTODO = ZERO];
    V --> V5{Se TP_Movimento = "INTERMITENTES"};
    V5 --> V6[MÉTODO = Máxima / 4 (arredondar para 1 se < 1)];
    V --> V7{Se TP_Movimento = "ORDINÁRIOS" ou "RECENTES"};
    V7 --> V8[MÉTODO = Maior valor entre Md04 a MdTt];
    V --> W[MÉTODO Calculado para CAF];

    W --> X[Calcular Estoque Ideal CAF (MetEst = MÉTODO x Semanas Estratégicas - padrão 12-16)];
    X --> Y[Obter Estoque Sistêmico Total (Soma de Balancetes de Todas as Unidades)];
    Y --> Z[Calcular Reposição CAF (MetEst - Estoque Sistêmico Total)];
    Z --> Z1[Se Reposição < 0, Reposição = 0];
    Z --> AA[Resultados de Reposição para CAF];

    Q & AA --> AB[Fim];
```

-----

### Detalhamento dos Passos do Fluxograma:

Este fluxograma descreve os passos para processar os dados operacionais de movimentação e balancete, criando uma base de dados robusta e aplicando uma metodologia de reposição de estoque para farmácias individuais e para a Central de Abastecimento Farmacêutico (CAF).

-----

### 1\. Obtenção dos Dados Operacionais

  * **Exportar Relatório de Movimentação por Destinatário Final:** Obtenha o arquivo Excel (`.xls`) do relatório de movimentação, que **perde os cabeçalhos** ao ser exportado do sistema. Este relatório contém informações detalhadas por item e é gerado para cada unidade (CAF e farmácias).
  * **Exportar Balancete de Movimentações por Item:** Obtenha o arquivo Excel (`.xls`) do balancete de movimentações, também **sem cabeçalhos**. Este arquivo fornece o estoque dos itens em um período específico (semanal).

-----

### 2\. Processamento dos Arquivos de Input

#### 2.1. Processar Relatório de Movimentação:

Este estágio foca em transformar o relatório bruto em uma base de dados estruturada e enriquecida.

  * **Atribuir ID Unidade:** Para cada arquivo de movimentação, atribua um **ID numérico único** à unidade (CAF ou farmácia) para diferenciá-las. A ordem pode ser baseada na representatividade da farmácia.
  * **Identificar e Atribuir Código do Item e Nome do Item:** Como os cabeçalhos são perdidos, o **Código do Item** (código sistêmico de 11 posições) e o **Nome do Item** serão inferidos e atribuídos sequencialmente com base no arquivo de **Balancete**, especificamente para os itens que tiveram "Quantidade de entradas no período" OU "Quantidade de saídas no período" diferente de ZERO.
  * **Classificar Item:** Para cada item, determine e atribua sua **Classificação** (e.g., **REMUME**, **ASSISTENCIAL**, **PROCESSO JUDICIAL**, **FARMACOLÓGICO**, **MATERIAL**, **FRALDAS e/ou LEITES**). Esta classificação é realizada na implantação e revisada semanalmente.
  * **Calcular Semana:** Crie uma nova coluna "Semana" no formato "**ANO\_SEMANA ANO**" para cada movimentação, crucial para cálculos de sazonalidade.
  * **Determinar Tipo de Movimentação (TP):** Com base no campo "Histórico" e nas colunas "Entradas" e "Saídas" do arquivo original:
      * **"A"** (SALDO ANTERIOR): Se "Histórico" contiver "SALDO ANTERIOR".
      * **"E"** (Entradas): Se o campo "Entradas" for diferente de "branco".
      * **"S"** (Saídas): Se o tipo não for "A" ou "E" E o campo "Saídas" for diferente de ZERO.
  * **Determinar Subclassificação de Movimentação (TIPO):** Aprofunde a classificação do campo "TP" usando descrições no campo "Histórico" e "Documento":
      * **"AA"**: "SALDO ANTERIOR".
      * **"EA"**: ENTRADA DE FORNECEDORES (compras), via "E" e nomes de fornecedores/Notas Fiscais.
      * **"ED"**: ENTRADA POR DOAÇÕES, via "E" e "DOAÇÃO".
      * **"EP"**: ENTRADA POR EMPRÉSTIMOS ENTRE MUNICÍPIOS, via "E" e descrições específicas.
      * **"ET"**: ENTRADA POR TRANSFERÊNCIAS (entre CAF e Farmácias), via "E" e nome da farmácia.
      * **"EU"**: ENTRADA POR TRANSFERÊNCIAS PARA DEMAIS UNIDADES DO MUNICÍPIO, via "E" e nome da unidade.
      * **"EX"**: ENTRADA POR AJUSTES DE ESTOQUES, via "E" e descrições de acerto/quebra.
      * **"SA"**: SAÍDA POR DISPENSAÇÃO AOS PACIENTES, via "S" e nomes de pacientes (classificação residual).
      * **"SD"**: SAÍDA POR DOAÇÕES, via "S" e "DOAÇÃO".
      * **"ST"**: SAÍDA POR TRANSFERÊNCIAS (entre CAF e Farmácias), via "S" e nome da farmácia.
      * **"SU"**: SAÍDA POR TRANSFERÊNCIAS PARA DEMAIS UNIDADES DO MUNICÍPIO, via "S" e nome da unidade.
      * **"SV"**: SAÍDA POR VENCIMENTO DA DATA DE VALIDADE DO ITEM, via "S" e descrições "VENCIDO" ou "PERDA POR VALIDADE".
      * **"SX"**: SAÍDA POR AJUSTES DE ESTOQUES, via "S" e descrições de acerto/quebra.
  * **Normalizar Quantidade de Movimentação (QTDMOV):** Crie uma coluna "QTDMOV" onde "Entradas" são valores positivos e "Saídas" são valores negativos.
  * **Calcular Estoque Ajustado (ESTAJU):** Calcule o saldo (estoque) do item por movimentação. A soma final por item deve coincidir com a "Quantidade período final" do Balancete.

#### 2.2. Processar Balancete de Movimentações:

Este estágio prepara o balancete para ser usado como referência e para extrair informações sobre o estoque atual.

  * **Ignorar Colunas em Branco:** Descarte as colunas vazias presentes no arquivo.
  * **Garantir Código Sistêmico do Item:** Valide o formato do **Código sistêmico do item** (texto, 11 posições, 9 números e 2 pontos).

-----

### 3\. Construção da Base de Dados para Metodologia de Reposição

#### 3.1. Base para Aplicação da Metodologia de Reposição por Farmácia:

Esta base é criada para cada farmácia individualmente, focando nas saídas para pacientes e transferências para outras unidades.

  * **Filtrar Movimentações:** Selecione apenas as movimentações com "TIPO" igual a "**SA**" (Saída por Dispensação aos Pacientes) ou "**SU**" (Saída por Transferências para Demais Unidades do Município).
  * **Agrupar Dados por Item e Semana:** Crie colunas que representem a quantidade de movimentações para cada item por semana. Itens sem movimentação em uma semana devem ter valor "NULL" ou "EM BRANCO".
  * **Calcular "Total Geral":** Some as movimentações de cada item ao longo de toda a série histórica para indicar sua representatividade.
  * **Calcular Medianas:** Calcule as medianas das quantidades movimentadas para diferentes períodos de tempo para analisar a sazonalidade:
      * "**Md04**" (Últimas 4 semanas - Mês)
      * "**Md08**" (Últimas 8 semanas - Bimestre)
      * "**Md12**" (Últimas 12 semanas - Trimestre)
      * "**Md16**" (Últimas 16 semanas - Quadrimestre)
      * "**Md26**" (Últimas 26 semanas - Semestre)
      * "**Md52**" (Últimas 52 semanas - Anual)
      * "**MdAno**" (Semanas do Ano Atual)
      * "**MdTt**" (Toda série histórica)
  * **Calcular Máxima:** Encontre a quantidade semanal máxima movimentada desde o início da série histórica semanal.
  * **Calcular Ocorrências Semanais:** Conte a frequência de movimentação semanal (independentemente da quantidade movimentada) para diferentes períodos:
      * "**Cont04**" (Últimas 4 semanas)
      * "**Cont08**" (Últimas 8 semanas)
      * "**Cont12**" (Últimas 12 semanas)
      * "**Cont16**" (Últimas 16 semanas)
      * "**Cont26**" (Últimas 26 semanas)
      * "**Cont52**" (Últimas 52 semanas)
      * "**ContAno**" (Ano Atual)
      * "**ContTt**" (Toda série histórica)
  * **Classificar TP\_Movimento:** Classifique os itens com base na frequência de ocorrências semanais:
      * **ENTRANTES**: Primeira ocorrência na última semana.
      * **RECENTES**: $\\ge 50%$ de ocorrências nas últimas 26 semanas (se a série histórica for menor, são ORDINÁRIOS).
      * **INATIVOS**: Nenhuma ocorrência nas últimas 16 semanas.
      * **INTERMITENTES**: $\< 50%$ de ocorrências nas últimas 52 semanas (ou série histórica menor).
      * **ORDINÁRIOS**: $\\ge 50%$ de ocorrências nas últimas 52 semanas (ou série histórica menor).

#### 3.2. Cálculo do MÉTODO para Reposição por Farmácia:

Este passo define a lógica de cálculo do método de reposição para cada item, com base na sua classificação de movimentação.

  * **Se TP\_Movimento = "ENTRANTES"**: MÉTODO = Quantitativo da única ocorrência.
  * **Se TP\_Movimento = "INATIVOS"**: MÉTODO = ZERO.
  * **Se TP\_Movimento = "INTERMITENTES"**: MÉTODO = "Máxima" / 4 (arredondar para 1 se o resultado for menor que 1).
  * **Se TP\_Movimento = "ORDINÁRIOS" ou "RECENTES"**: MÉTODO = Maior valor entre as medianas calculadas (**Md04** até **MdTt**).

#### 3.3. Cálculo de Estoque Ideal e Reposição por Farmácia:

  * **Calcular Estoque Ideal (MetEst):** Multiplique o MÉTODO calculado pela quantidade de semanas estratégicas definida para o estoque da farmácia (e.g., 3 semanas por padrão, podendo ser 2 ou 4).
  * **Obter Estoque Sistêmico:** Recupere o estoque atual de cada item do campo "Quantidade período final" do arquivo de Balancete. Este valor deve refletir o estoque físico da farmácia.
  * **Calcular Reposição:** Subtraia o Estoque Sistêmico do Estoque Ideal (**MetEst - Estoque Sistêmico**). Se o resultado for negativo (excesso de estoque), a reposição será ZERO. Caso contrário, utilize o valor calculado.

-----

### 4\. Base para Aplicação da Metodologia de Reposição da CAF

Esta seção é similar ao processamento por farmácia, mas consolida dados de todas as farmácias e da CAF.

  * **Consolidar Dados de Movimentação:** Agregue as movimentações de todas as farmácias e da CAF em uma única base.
  * **Filtrar Movimentações:** Assim como para as farmácias, filtre por "TIPO" igual a "**SA**" ou "**SU**" (apesar de ser incomum para a CAF ter "SA").
  * **Agrupar Dados por Item e Semana:** Crie colunas semanais para as quantidades movimentadas consolidadas.
  * **Calcular "Total Geral", Medianas e Ocorrências Semanais:** Realize os mesmos cálculos de Total Geral, Medianas (Md04 a MdTt) e Ocorrências Semanais (Cont04 a ContTt) para a base consolidada.
  * **Classificar TP\_Movimento:** Classifique os itens (ENTRANTES, RECENTES, INATIVOS, INTERMITENTES, ORDINÁRIOS) com base nas ocorrências consolidadas.

#### 4.1. Cálculo do MÉTODO para Reposição da CAF:

A lógica de cálculo do MÉTODO é a mesma aplicada às farmácias individuais.

  * **Se TP\_Movimento = "ENTRANTES"**: MÉTODO = Quantitativo da única ocorrência.
  * **Se TP\_Movimento = "INATIVOS"**: MÉTODO = ZERO.
  * **Se TP\_Movimento = "INTERMITENTES"**: MÉTODO = "Máxima" / 4 (arredondar para 1 se o resultado for menor que 1).
  * **Se TP\_Movimento = "ORDINÁRIOS" ou "RECENTES"**: MÉTODO = Maior valor entre as medianas calculadas (**Md04** até **MdTt**).

#### 4.2. Cálculo de Estoque Ideal e Reposição da CAF:

  * **Calcular Estoque Ideal CAF (MetEst):** Multiplique o MÉTODO calculado pela quantidade de semanas estratégicas para o estoque da CAF (e.g., 12 a 16 semanas).
  * **Obter Estoque Sistêmico Total:** Some os campos "Quantidade período final" de **todos** os arquivos de Balancete (de todas as farmácias e da CAF) para obter o estoque sistêmico consolidado.
  * **Calcular Reposição CAF:** Subtraia o Estoque Sistêmico Total do Estoque Ideal CAF (**MetEst - Estoque Sistêmico Total**). Se o resultado for negativo (excesso de estoque), a reposição será ZERO. Caso contrário, utilize o valor calculado.

-----

### Observações Finais:

  * **Automatização:** Este fluxograma serve como base para a criação de um algoritmo que pode ser implementado em linguagens de programação como Python (com bibliotecas como Pandas para manipulação de dados Excel), R, ou ferramentas ETL.
  * **Tratamento de Erros/Robustez:** O algoritmo deve incluir tratamentos para dados ausentes, formatos inconsistentes e outras anomalias que possam surgir dos arquivos de entrada operacionais.
  * **Parametrização:** A quantidade de semanas para o estoque ideal (3 para farmácias, 12-16 para CAF) deve ser parametrizável para permitir flexibilidade na estratégia.

Este fluxograma fornece um guia claro para estruturar o algoritmo de processamento de dados para otimizar a gestão de estoque.

