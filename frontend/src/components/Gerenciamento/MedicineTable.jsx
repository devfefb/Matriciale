import React, { useState } from 'react';
import TableHeader from './TableHeader';
import TableRow from './TableRow';
import ColorLegend from './ColorLegend';
import SearchBar from './SearchBar';
import '../../styles/MedicineTable.css';

const MedicineTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [classFilter, setClassFilter] = useState(""); // linha inserida agora
  
  // Dados mockados (substituir pelo Firebase posteriormente)
  const medicines = [
    {
      codigo: '302001001',
      nome: 'Ácido Valpróico',
      classificacaoItem: 'Remune',
      classificacaoModelo: 'Ordinários',
      unidade: 'CP',
      qtdAtual: 0,
      status: 'zerado'
    },
    {
      codigo: '2000031',
      nome: 'Paracetamol',
      classificacaoItem: 'Remune',
      classificacaoModelo: 'Ordinários',
      unidade: 'CP',
      qtdAtual: 0,
      status: 'zerado'
    },
    {
      codigo: '2000067',
      nome: 'Losartana',
      classificacaoItem: 'Remune',
      classificacaoModelo: 'Intermitente',
      unidade: 'AMP',
      qtdAtual: 150,
      status: 'quatro-semanas'
    },
    {
      codigo: '3000002',
      nome: 'Metformina',
      classificacaoItem: 'Remune',
      classificacaoModelo: 'Inativo',
      unidade: 'CP',
      qtdAtual: 345,
      status: 'oito-semanas'
    },
    {
      codigo: '228001001',
      nome: 'Mirtazapina',
      classificacaoItem: 'Assistencial',
      classificacaoModelo: 'Intermitente',
      unidade: 'FR',
      qtdAtual: 236,
      status: 'oito-semanas'
    },
    {
      codigo: '301002001',
      nome: 'Aciclovir',
      classificacaoItem: 'Remune',
      classificacaoModelo: 'Ordinários',
      unidade: 'AMP',
      qtdAtual: 1198,
      status: 'doze-semanas'
    },
    {
      codigo: '21001060',
      nome: 'Ivermectina',
      classificacaoItem: 'Remune',
      classificacaoModelo: 'Ordinários',
      unidade: 'FR',
      qtdAtual: 1000,
      status: 'doze-semanas'
    },
    {
      codigo: '1001007',
      nome: 'Omeprazol',
      classificacaoItem: 'Remune',
      classificacaoModelo: 'Ordinários',
      unidade: 'AMP',
      qtdAtual: 1457,
      status: 'dezesseis-semanas'
    },
    {
      codigo: '22001007',
      nome: 'Amoxicilina',
      classificacaoItem: 'Remune',
      classificacaoModelo: 'Ordinários',
      unidade: 'CP',
      qtdAtual: 2000,
      status: 'mais-dezesseis-semanas'
    },
  ];

  const filteredMedicines = medicines
    .filter(med => med.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(med => !colorFilter || med.status === colorFilter)
    .filter(med => !classFilter || med.classificacaoItem === classFilter); // linha inserida agora. tome cuidado com o ;

  return (
    <div className="medicine-table-container">
      <p className="main-title">Busca por Medicamentos no Município Xxxxxxxxxxxx</p>
      <div className="title-controls-legends-container">
        <div className="title-controls-container"> 
          <div className="controls-container"> 
            <SearchBar 
              onSearch={setSearchTerm}
              onColorFilter={setColorFilter}
              onClassFilter={setClassFilter} // linha inserida agora
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
          {filteredMedicines.map(medicine => (
            <TableRow key={medicine.codigo} medicine={medicine} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MedicineTable; 