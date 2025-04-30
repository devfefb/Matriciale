import React from "react";
import styles from "../../styles/FilterRelatorio.module.css"

const FilterRelatorio = ({ showFilter, onClassificacaoFilter }) => {
    if (!showFilter) return null; // Se showFilter for false, não renderiza nada

    return (
        <div>
            <ul>
                <li onClick={() => onClassificacaoFilter("") } className={styles.primeiro_item}>Todos</li>
                <li onClick={() => onClassificacaoFilter("10 Remune") } >10 Remune</li>
                <li onClick={() => onClassificacaoFilter("assistencial")}>Assistencial</li>
                <li onClick={() => onClassificacaoFilter("proc.Judicial")}>Proc.Judicial</li>
                <li onClick={() => onClassificacaoFilter("Farmacológico")}>Farmacológico</li>
                <li onClick={() => onClassificacaoFilter("material")}>Material</li>
                <li onClick={() => onClassificacaoFilter("fraldase/ouleites")} className={styles.ultimo_item}>Fraldas e/ou Leites</li>
            </ul>
        </div>
    );
};

export default FilterRelatorio;
