import React from 'react';

const InfoTableRow = ({ medicineInfo }) => {
    return (
        <>
            <tr className='table-row medicineInfo'>
                <td className='colunaInfo'>{medicineInfo.nome}</td>
                <td className='colunaInfo'>{medicineInfo.QtdAtual}</td>
                <td className='colunaInfo'>{medicineInfo.QtdIdeal}</td>
                <td className='colunaInfo'>{medicineInfo.QtdReposicao}</td>
            </tr>
            {medicineInfo.nome === "CAF" && (
                <tr>
                    <td colSpan="4">
                        <hr className="linha-divisao" />
                    </td>
                </tr>
            )}
        </>
    )
};

export default InfoTableRow;