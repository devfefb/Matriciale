import React from "react";
import styles from "../../styles/RelatorioTableRow.module.css"
import { formatNumber } from "../../utils/formatNumber";

const RelatorioTableRow = ({ relatorios }) => {
    return (
        <tr className={styles.row}>
            <td><div className={styles.item}>{relatorios.classificacao}</div></td>
            <td><div className={styles.item}>{formatNumber(relatorios.cod_item, true)}</div></td>
            <td><div className={styles.item}>{relatorios.nome_item}</div></td>
            <td><div className={styles.item}>{relatorios.tp_metodo}</div></td>
            <td><div className={styles.item}>{formatNumber(relatorios.metodo)}</div></td>
            <td><div className={styles.item}>{formatNumber(relatorios.met_est)}</div></td>
            <td><div className={styles.item}>{formatNumber(relatorios.estoque)}</div></td>
            <td><div className={styles.item}>{formatNumber(relatorios.reposicao)}</div></td>
        </tr>
    )
}

export default RelatorioTableRow;