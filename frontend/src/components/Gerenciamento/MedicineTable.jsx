import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import TableHeader from './TableHeader';
import TableRow from './TableRow';
import ColorLegend from './ColorLegend';
import SearchBar from './SearchBar';
import '../../styles/MedicineTable.css';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const MedicineTable = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [colorFilter, setColorFilter] = useState(searchParams.get('colorFilter') || '');
  const [classFilter, setClassFilter] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [municipality, setMunicipality] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Atualiza o filtro quando o parâmetro da URL mudar
  useEffect(() => {
    const urlColorFilter = searchParams.get('colorFilter');
    if (urlColorFilter) {
      setColorFilter(urlColorFilter);
    }
  }, [searchParams]);

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

        const mappedMedicines = fetchedMedicines
          .map(med => ({
            id: med.id,
            codigo: med.cod_item,
            nome: med.nome,
            classificacaoItem: med.classificacao,
            classificacaoModelo: med.tp_metodo,
            unidade: med.tp_unidade_medicamento,
            qtdAtual: med.estoque,
            metodo: med.metodo,
            status: med.status,
            isInativo: med.isInativo || med.tp_metodo === "3.INATIVOS"
          }))
          // Ordenação alfabética por nome
          .sort((a, b) => {
            const nomeA = (a.nome || '').toLowerCase();
            const nomeB = (b.nome || '').toLowerCase();
            return nomeA.localeCompare(nomeB, 'pt-BR');
          });

        setMedicines(mappedMedicines);
      } catch (error) {
        console.error('Erro ao buscar medicamentos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicines();
  }, [user]);

  // Nova função de classificação detalhada
  const getStatusClass = (medicine) => {
    const { status, isInativo } = medicine;
    
    // Categoria Roxo: Itens Zerados
    if (status === 0) {
      if (isInativo) {
        return 'zerado-inativo'; // Roxo escuro
      }
      return 'zerado-dispensacao'; // Roxo atual
    }
    
    // Categorias normais (0-16 semanas)
    if (status <= 4) return 'quatro-semanas';
    if (status <= 8) return 'oito-semanas';
    if (status <= 12) return 'doze-semanas';
    if (status <= 16) {
      if (isInativo) {
        return 'dezesseis-semanas-inativo'; // Alerta especial
      }
      return 'dezesseis-semanas';
    }
    
    // Categoria Acima de 16 Semanas
    if (status <= 52) return 'azul-claro'; // 16-52 semanas
    return 'azul-escuro'; // 52+ semanas
  };

  const filteredMedicines = medicines
    .filter(med => med.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(med => !colorFilter || getStatusClass(med) === colorFilter)
    .filter(med => {
      if (!classFilter) return true;
      const medClass = (med.classificacaoItem || '').toLowerCase().trim();
      const filterClass = classFilter.toLowerCase().trim();
      return medClass.includes(filterClass);
    });

  return (
    <div className="medicine-table-container">
      <p className="main-title" style={{ color: 'var(--text-azul-escuro)' }}>
        Busca por Medicamentos no Município {municipality ? `- ${municipality}` : ''}
      </p>
      
      {/* Legenda ocupando toda a largura */}
      <div className="legend-section">
        <ColorLegend />
      </div>

      {/* Filtros e busca numa linha só */}
      <div className="filters-section">
        <SearchBar
          onSearch={setSearchTerm}
          onColorFilter={setColorFilter}
          onClassFilter={setClassFilter}
          colorFilter={colorFilter}
        />
      </div>

      <hr className="linha-divisao" />

      <table className="medicine-table">
        <TableHeader />
        <tbody>
          {loading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <tr key={index} className="shimmer-row">
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