import React, { useEffect } from 'react';
import TableInfoHeader from './TableInfoHeader';
import { useParams } from 'react-router-dom';
import InfoTableRow from './InfoTableRow';
import Header from '../Header';
import Sidebar from '../Sidebar';

const MedicineInfoTable = () => {

    const { nome } = useParams();
    //const { codigo , nome } = useParams(); // Para quando for possívelmente necessário usar o código usar o codigo do remédio

    useEffect(() => {window.scrollTo(0, 0);}, []); // Para a página sempre começar no topo quando carregada

    const medicineInfo = [
        {
            nome: "CAF",
            QtdAtual: 712 ,
            QtdIdeal: 1500,
            QtdReposicao: 788
        },

        {
            nome: "Drogasil",
            QtdAtual: 57,
            QtdIdeal: 500,
            QtdReposicao: 443
        },

        {
            nome: "Droga Raia",
            QtdAtual: 84,
            QtdIdeal: 200,
            QtdReposicao: 116
        },

        {
            nome: "Pague Menos",
            QtdAtual: 219,
            QtdIdeal: 300,
            QtdReposicao: 81
        },

        {
            nome: "Farma Ponte",
            QtdAtual: 385,
            QtdIdeal: 400,
            QtdReposicao: 15
        },
    ];


    const cafMedicine = medicineInfo.find(medicine => medicine.nome === "CAF") ? [medicineInfo.find(medicine => medicine.nome === "CAF")] : []; //Filtro para elementos com CAF
    const filteredMedicineInfo = medicineInfo.filter(medicine => medicine.nome !== "CAF"); //Filtro para elementos sem CAF
    const orderedMedicineInfo = medicineInfo.sort((a, b) => {
        if (a.nome === "CAF") return -1;
        if (b.nome === "CAF") return 1;
        return a.nome.localeCompare(b.nome);
    });

    return (
        <>  <Header/>
            <div
                style={{
                    display: "flex"
                }}
            >
                <Sidebar/>
                <div className="medicine-table-container">
                    <p className="main-title-gerenciamento">Detalhes do Medicamento {decodeURIComponent(nome)}</p>
                    <table className="medicine-table">
                        <TableInfoHeader />
                        <tbody> 
                            {orderedMedicineInfo.map(medicineInfo => (
                                <InfoTableRow medicineInfo={medicineInfo} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
};

export default MedicineInfoTable;     