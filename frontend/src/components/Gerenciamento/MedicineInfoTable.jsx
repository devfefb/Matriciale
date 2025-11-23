import React, { useEffect, useState } from 'react';
import TableInfoHeader from './TableInfoHeader';
import { useParams } from 'react-router-dom';
import InfoTableRow from './InfoTableRow';
import Header from '../Header';
import Sidebar from '../Sidebar';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const MedicineInfoTable = () => {
    const { id } = useParams();
    const [medicineInfo, setMedicineInfo] = useState([]);
    const [medicineName, setMedicineName] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        window.scrollTo(0, 0);

        const fetchDetails = async () => {
            try {
                if (!user?.email || !id) return;

                const response = await api.get(`/medicines/details/${id}`, {
                    params: { email: user.email }
                });

                const data = response.data.map(item => ({
                    nome: item.unidade, // The component expects 'nome' to be the unit name based on previous mock data
                    QtdAtual: item.estoque,
                    QtdIdeal: item.met_est,
                    QtdReposicao: item.reposicao
                }));

                setMedicineInfo(data);

                // Set medicine name from the first item (assuming all items refer to the same medicine)
                if (response.data.length > 0) {
                    setMedicineName(response.data[0].nome);
                }
            } catch (error) {
                console.error('Erro ao buscar detalhes:', error);
            }
        };

        fetchDetails();
    }, [id, user]);

    // Logic to order: CAF first, then others alphabetically
    const orderedMedicineInfo = [...medicineInfo].sort((a, b) => {
        if (a.nome === "CAF") return -1;
        if (b.nome === "CAF") return 1;
        return a.nome.localeCompare(b.nome);
    });

    return (
        <>  <Header />
            <div
                style={{
                    display: "flex"
                }}
            >
                <Sidebar />
                <div className="medicine-table-container">
                    <p className="main-title-gerenciamento">Detalhes do Medicamento {medicineName}</p>
                    <table className="medicine-table">
                        <TableInfoHeader />
                        <tbody>
                            {orderedMedicineInfo.map((info, index) => (
                                <InfoTableRow key={index} medicineInfo={info} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
};

export default MedicineInfoTable;