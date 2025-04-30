import styles from "../../styles/RelatorioTable.module.css";
import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const RelatorioImpressao = () => {
  const currentDate = new Date();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("autoPrint") === "true") {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [searchParams]);

  const relatorios = [
    {
      classificacao: '10 Remune',
      codItem: '021.001.092',
      nome: 'AAS - Ácido Acetil Salicilico 100MG',
      tpMetodo: '1.Ordinários',
      metodo: 730,
      metEst: 2190,
      estoque: 1720,
      reposicao: 470
    },
    {
      classificacao: '10 Remune',
      codItem: '301.002.001',
      nome: 'Aciclovir 200 MG CPR',
      tpMetodo: '1.Ordinários',
      metodo: 190,
      metEst: 510,
      estoque: 140,
      reposicao: 430
    },
    {
      classificacao: '10 Remune',
      codItem: '301.002.002',
      nome: 'Aciclovir Creme 5% 10G',
      tpMetodo: '1.Ordinários',
      metodo: 4,
      metEst: 12,
      estoque: 5,
      reposicao: 7
    },
    {
      classificacao: '10 Remune',
      codItem: '304.002.001',
      nome: 'Ácido Folico 5MG',
      tpMetodo: '1.Ordinários',
      metodo: 200,
      metEst: 600,
      estoque: 400,
      reposicao: 200
    },
    {
      classificacao: 'Farmacológico',
      codItem: '013.001.003',
      nome: 'Ácido Valproico 500MG',
      tpMetodo: '2.Intermitentes',
      metodo: 80,
      metEst: 143,
      estoque: 140,
      reposicao: 520
    },
    // adicione os outros dados aqui
  ];

  return (
    <div className={styles.container_relatorio}>
      <div className={styles.header_relatorio}>
        <div>
          <p className={styles.header_relatorio_txt1}>
            Nome: <span>{"<Nome Unidade>"}</span>
          </p>
          <p className={styles.header_relatorio_txt2}>
            Data: {currentDate.toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className={styles.header_relatorio_txt1}>
            Unidade: <span>{"<Tipo Unidade>"}</span>
          </p>
          <p className={styles.header_relatorio_txt3}>
            Farmácia, UBS, Pronto Socorro.
          </p>
        </div>
      </div>

      <table className={styles.tabela_relatorio} style={{ borderCollapse: "separate", borderSpacing: "0px 11.62px", width: "100%" }}>
        <thead>
          <tr style={{ backgroundColor: "#ECECEC" }}>
            <th>Classificação</th>
            <th>Cód.Item</th>
            <th>Nome</th>
            <th>TP.Metodo</th>
            <th>Método</th>
            <th>Met.Est.</th>
            <th>Estoque</th>
            <th>Reposição</th>
          </tr>
        </thead>
        <tbody>
          {relatorios.map((item, index) => (
            <tr key={index}>
              <td>{item.classificacao}</td>
              <td>{item.codItem}</td>
              <td>{item.nome}</td>
              <td>{item.tpMetodo}</td>
              <td>{item.metodo}</td>
              <td>{item.metEst}</td>
              <td>{item.estoque}</td>
              <td>{item.reposicao}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RelatorioImpressao;
