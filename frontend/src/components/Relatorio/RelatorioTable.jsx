import React, { useState, useRef } from "react";
import { CiFilter } from "react-icons/ci";
import RelatorioTableRow from "./RelatorioTableRow";
import FilterRelatorio from "./FilterRelatorio";
import styles from "../../styles/RelatorioTable.module.css"

const RelatorioTable = () => {
    const currentDate = new Date();
    const [classificacaoFilter, setClassificacaoFilter] = useState('');
    const [showFilter, setShowFilter] = useState(false);

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
        classificacao: '10 Remune',
        codItem: '304.004.001',
        nome: 'Ácido Tranexâmico 250MG - Transamin',
        tpMetodo: '1.Ordinários',
        metodo: 88,
        metEst: 264,
        estoque: 136,
        reposicao: 128
        },
        {
        classificacao: '10 Remune',
        codItem: '302.001.001',
        nome: 'Ácido Valproico 250MG',
        tpMetodo: '1.Ordinários',
        metodo: 200,
        metEst: 1800,
        estoque: 1610,
        reposicao: 190
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
        {
        classificacao: '10 Remune',
        codItem: '203.001.001',
        nome: 'Albendazol 40 MG/ML Frasco 10ML',
        tpMetodo: '1.Ordinários',
        metodo: 10,
        metEst: 30,
        estoque: 23,
        reposicao: 7 
        },
        {
        classificacao: 'Farmacológico',
        codItem: '301.003.001',
        nome: 'Albendazol 400MG',
        tpMetodo: '1.Ordinários',
        metodo: 12,
        metEst: 36,
        estoque: 15,
        reposicao: 21
        },
        {
        classificacao: 'Farmacológico',
        codItem: '309.002.001',
        nome: 'Alopurinol 300MG',
        tpMetodo: '1.Ordinários',
        metodo: 210,
        metEst: 630,
        estoque: 720,
        reposicao: 0
        },
        {
        classificacao: '10 Remune',
        codItem: '309.002.022',
        nome: 'Alopurinol 100MG',
        tpMetodo: '1.Ordinários',
        metodo: 90,
        metEst: 270,
        estoque: 450,
        reposicao: 0
        },
        {
        classificacao: '10 Remune',
        codItem: '305.001.004',
        nome: 'Ambroxol Xarope Adulto',
        tpMetodo: '1.Ordinários',
        metodo: 41,
        metEst: 123,
        estoque: 52,
        reposicao: 71
        },
        {
        classificacao: 'Assistencial',
        codItem: '305.001.005',
        nome: 'Ambroxol Xarope Infantil',
        tpMetodo: '1.Ordinários',
        metodo: 15,
        metEst: 45,
        estoque: 34,
        reposicao: 11
        },
    ];
    

    const filteredRelatorio = relatorios.filter((item) => {
        if (!classificacaoFilter) return true;
        return item.classificacao.toLowerCase() === classificacaoFilter.toLowerCase();
    });

    // Função que alterna a visibilidade do filtro
    const handleThClick = () => {
        setShowFilter(prev => !prev);
    };

    const printRef = useRef();

    const handlePrint = () => {
        const printContent = printRef.current.innerHTML;
        const originalContent = document.body.innerHTML;

        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload(); // Para recarregar os scripts/react normalmente
    };

    return (
        <div className={styles.container_relatorio} ref={printRef}>
            <div className={styles.header_relatorio}>
                <div>
                    <p className={styles.header_relatorio_txt1}>Nome: <span>{"<Nome Unidade>"}</span></p>
                    <p className={styles.header_relatorio_txt2}>Data: {currentDate.toLocaleDateString()}</p>
                    <button onClick={handlePrint}>
                        Imprimir Relatório
                    </button>
                </div>
                <div>
                    <p className={styles.header_relatorio_txt1}>Unidade: <span>{"<Tipo Unidade>"}</span></p>
                    <p className={styles.header_relatorio_txt3}>Farmácia, UBS, Pronto Socorro.</p>
                </div>
            </div>
            <table className={styles.tabela_relatorio} 
            style={{
                borderCollapse: "separate",
                borderSpacing: "0px 11.62px",
                width: "100%",
                overflowY: "auto"
            }}>
                <thead>
                    <tr
                    style={{
                        position: "sticky",
                        top: "0",
                        backgroundColor: "#E9E6E0"
                    }}>
                        <th onClick={handleThClick} style={{cursor: "pointer"}}>
                            Classificação <CiFilter size="20"/>
                            {/* Passa a prop que controla a exibição */}
                            <FilterRelatorio 
                                showFilter={showFilter}
                                onClassificacaoFilter={setClassificacaoFilter} 
                            />
                        </th>
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
                    {filteredRelatorio.map((item) => (
                        <RelatorioTableRow key={item.codItem} relatorios={item} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RelatorioTable;
