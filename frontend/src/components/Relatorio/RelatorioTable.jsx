import React, { useState, useRef, useEffect } from "react";
import { CiFilter } from "react-icons/ci";
import RelatorioTableRow from "./RelatorioTableRow";
import FilterRelatorio from "./FilterRelatorio";
import styles from "../../styles/RelatorioTable.module.css"
import FilterCodItem from "./FilterCodItem";
import FilterNomeItem from "./FilterNomeItem";
import FilterModelo from "./FilterModelo";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

const RelatorioTable = () => {
    const currentDate = new Date();
    const [classificacaoFilter, setClassificacaoFilter] = useState('');
    const [codItemFilter, setCodItemFilter] = useState('');
    const [nomeItemFilter, setNomeItemFilter] = useState('');
    const [modeloFilter, setModeloFilter] = useState('');
    const [showFilterClass, setShowFilterClass] = useState(false);
    const [showFilterCod, setShowFilterCod] = useState(false);
    const [showFilterNome, setShowFilterNome] = useState(false);
    const [showFilterMod, setShowFilterMod] = useState(false);

    const [units, setUnits] = useState([]);
    const [selectedUnit, setSelectedUnit] = useState('');
    const [relatorios, setRelatorios] = useState([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        const fetchUnits = async () => {
            try {
                if (!user?.email) return;
                const response = await api.get('/medicines/units', {
                    params: { email: user.email }
                });
                setUnits(response.data);
                if (response.data.length > 0) {
                    // Default to CAF if available, otherwise first unit
                    const defaultUnit = response.data.includes('CAF') ? 'CAF' : response.data[0];
                    setSelectedUnit(defaultUnit);
                }
            } catch (error) {
                console.error("Erro ao buscar unidades:", error);
            }
        };
        fetchUnits();
    }, [user]);

    useEffect(() => {
        const fetchReport = async () => {
            if (!selectedUnit || !user?.email) return;
            setLoading(true);
            try {
                const response = await api.get('/medicines/report', {
                    params: { email: user.email, unit: selectedUnit }
                });
                setRelatorios(response.data);
            } catch (error) {
                console.error("Erro ao buscar relatório:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [selectedUnit, user]);

    const filteredRelatorio = relatorios.filter((item) => {
        const filterClass = !classificacaoFilter
            || (item.classificacao && item.classificacao.toLocaleLowerCase().includes(classificacaoFilter.toLocaleLowerCase()));

        const filterCod = !codItemFilter
            || (item.cod_item && item.cod_item.toLocaleLowerCase().includes(codItemFilter.toLocaleLowerCase()));

        const filterNome = !nomeItemFilter
            || (item.nome_item && item.nome_item.toLocaleLowerCase().includes(nomeItemFilter.toLocaleLowerCase()));

        const filterMod = !modeloFilter
            || (item.tp_metodo && item.tp_metodo.toLocaleLowerCase().includes(modeloFilter.toLocaleLowerCase()));

        return filterClass && filterCod && filterNome && filterMod;
    });

    const handleClickClass = () => {
        setShowFilterClass(prev => !prev);
    };

    const handleClickCod = () => {
        setShowFilterCod(prev => !prev);
    }

    const handleClickNome = () => {
        setShowFilterNome(prev => !prev);
    }

    const handleClickModelo = () => {
        setShowFilterMod(prev => !prev);
    }

    const printRef = useRef();

    const handlePrint = () => {
        const printContent = printRef.current.innerHTML;
        const originalContent = document.body.innerHTML;

        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload(); // Para recarregar os scripts/react normalmente
    };

    const getUnitType = (unitName) => {
        if (unitName === 'ESF3') return 'UBS';
        if (unitName === 'CAF') return 'CAF';
        return 'Farmácia';
    };

    return (
        <div className={styles.container_relatorio} ref={printRef}>
            <div className={styles.header_relatorio}>
                <div>
                    <p className={styles.header_relatorio_txt1}>Nome: <span>{selectedUnit || 'Selecione uma unidade'}</span></p>
                    <p className={styles.header_relatorio_txt2}>Data: {currentDate.toLocaleDateString()}</p>
                    <button onClick={handlePrint} className="no-print">
                        Imprimir Relatório
                    </button>

                    <div className="unit-selector no-print" style={{ marginTop: '10px' }}>
                        <label htmlFor="unit-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>Selecionar Unidade:</label>
                        <select
                            id="unit-select"
                            value={selectedUnit}
                            onChange={(e) => setSelectedUnit(e.target.value)}
                            style={{ padding: '5px', borderRadius: '4px' }}
                        >
                            {units.map(unit => (
                                <option key={unit} value={unit}>{unit}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <p className={styles.header_relatorio_txt1}>Unidade: <span>{getUnitType(selectedUnit)}</span></p>
                    <p className={styles.header_relatorio_txt3}>Farmácia, UBS, Pronto Socorro.</p>
                </div>
            </div>
            <table className={styles.tabela_relatorio}
                style={{
                    borderCollapse: "separate",
                    borderSpacing: "0px 11.62px",
                    width: "100%",
                    overflowY: "auto",
                }}>
                <thead>
                    <tr
                        style={{
                            position: "sticky",
                            backgroundColor: "#F3F1EE",
                        }}>
                        <th
                            onClick={handleClickClass}
                            style={{
                                cursor: "pointer",
                            }}
                        >
                            Item<CiFilter size="18" />
                            <FilterRelatorio
                                showFilter={showFilterClass}
                                onClassificacaoFilter={setClassificacaoFilter}
                            />
                        </th>
                        <th
                            onClick={handleClickCod}
                            style={{
                                cursor: "pointer",
                            }}
                        >Código Item<CiFilter size="18" />
                            <FilterCodItem
                                showFilter={showFilterCod}
                                onCodItemFilter={setCodItemFilter}
                            />
                        </th>
                        <th
                            onClick={handleClickNome}
                            style={{
                                cursor: "pointer",
                            }}
                        >Nome Item<CiFilter size="18" />
                            <FilterNomeItem
                                showFilter={showFilterNome}
                                onNomeItemFilter={setNomeItemFilter}
                            />
                        </th>
                        <th
                            onClick={handleClickModelo}
                            style={{
                                cursor: "pointer"
                            }}
                        >Classificação<br />
                            Modelo<CiFilter size="18" />
                            <FilterModelo
                                showFilter={showFilterMod}
                                onModeloFilter={setModeloFilter}
                            />
                        </th>
                        <th>Qtde<br />Modelo</th>
                        <th>Estoque<br />ideal</th>
                        <th>Estoque<br />atual</th>
                        <th>Qtde<br />Reposição</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Carregando...</td></tr>
                    ) : (
                        filteredRelatorio.map((item) => (
                            <RelatorioTableRow key={item.id || item.cod_item} relatorios={item} />
                        ))
                    )}
                </tbody>
            </table>
            <style>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default RelatorioTable;
