import React from "react";
import styles from "../../styles/RelatorioTableRow.module.css"

const RelatorioTableRow = ({ relatorios }) => {
    return (
        <tr className={styles.row}>
            <td><div className={styles.item}>{relatorios.classificacao}</div></td>
            <td><div className={styles.item}>{relatorios.cod_item}</div></td>
            <td><div className={styles.item}>{relatorios.nome_item}</div></td>
            <td><div className={styles.item}>{relatorios.tp_metodo}</div></td>
            <td><div className={styles.item}>{relatorios.metodo ? relatorios.metodo.toLocaleString('pt-BR') : '-'}</div></td>
            <td><div className={styles.item}>{relatorios.met_est ? relatorios.met_est.toLocaleString('pt-BR') : '-'}</div></td>
            <td><div className={styles.item}>{relatorios.estoque ? relatorios.estoque.toLocaleString('pt-BR') : '0'}</div></td>
            <td><div className={styles.item}>{relatorios.reposicao ? relatorios.reposicao.toLocaleString('pt-BR') : '-'}</div></td>
        </tr>
    )
}

export default RelatorioTableRow;