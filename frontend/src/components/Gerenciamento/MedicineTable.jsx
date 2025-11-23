import React, { useState, useEffect } from 'react';
import TableHeader from './TableHeader';
import TableRow from './TableRow';
import ColorLegend from './ColorLegend';
import SearchBar from './SearchBar';
import '../../styles/MedicineTable.css';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const MedicineTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [classFilter, setClassFilter] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [municipality, setMunicipality] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        if (!user?.email) return;

        const response = await api.get('/medicines/general', {
          params: { email: user.email }
        });

        // Handle new response structure { municipality, medicines } or fallback to array
        let fetchedMedicines = [];
        let mun = '';

        if (Array.isArray(response.data)) {
          fetchedMedicines = response.data;
        } else if (response.data && response.data.medicines) {
          fetchedMedicines = response.data.medicines;
          mun = response.data.municipality;
        }

        setMunicipality(mun);

        const mappedMedicines = fetchedMedicines.map(med => ({
          id: med.id,
          codigo: med.cod_item,
          nome: med.nome,
          classificacaoItem: med.classificacao,
          classificacaoModelo: med.tp_metodo,
          unidade: med.tp_unidade_medicamento,
          qtdAtual: med.estoque,
          metodo: med.metodo,
          status: med.status
        }));

        setMedicines(mappedMedicines);
      } catch (error) {
        console.error('Erro ao buscar medicamentos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicines();
  }, [user]);

  const getStatusClass = (status) => {
    if (status === 0) return 'zerado';
    if (status <= 4) return 'quatro-semanas';
    if (status <= 8) return 'oito-semanas';
    if (status <= 12) return 'doze-semanas';
    if (status <= 16) return 'dezesseis-semanas';
    return 'mais-dezesseis-semanas';
  };

  const filteredMedicines = medicines
    .filter(med => med.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(med => !colorFilter || getStatusClass(med.status) === colorFilter)
    .filter(med => !classFilter || med.classificacaoItem === classFilter);

  return (
    <div className="medicine-table-container">
      <p className="main-title">
        Busca por Medicamentos no Município {municipality ? `- ${municipality}` : ''}
      </p>
      <div className="title-controls-legends-container">
        <div className="title-controls-container">
          <div className="controls-container">
            <SearchBar
              onSearch={setSearchTerm}
              onColorFilter={setColorFilter}
              onClassFilter={setClassFilter}
            />
          </div>
        </div>

        <div>
          <ColorLegend />
        </div>
      </div>

      <hr className="linha-divisao" />

      <table className="medicine-table">
        <TableHeader />
        <tbody>
          {loading ? (
            // Shimmer Loading Rows
            Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                <td colSpan="7">
                  <div className="shimmer-wrapper"></div>
                </td>
              </tr>
            ))
          ) : (
            filteredMedicines.map(medicine => (
              <TableRow key={medicine.id} medicine={medicine} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MedicineTable;