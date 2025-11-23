import React from 'react';
import '../../styles/TableRow.css';
import { useNavigate } from 'react-router-dom';

const TableRow = ({ medicine }) => {

  const getStatusClass = (status) => {
    if (status === 0) return 'zerado';
    if (status <= 4) return 'quatro-semanas';
    if (status <= 8) return 'oito-semanas';
    if (status <= 12) return 'doze-semanas';
    if (status <= 16) return 'dezesseis-semanas';
    return 'mais-dezesseis-semanas';
  };

  const getStockMessage = (status) => {
    if (status === 0) return 'Estoque zerado';
    if (status <= 4) return 'Estoque de 4 semanas';
    if (status <= 8) return 'Estoque de 8 semanas';
    if (status <= 12) return 'Estoque de 12 semanas';
    if (status <= 16) return 'Estoque de 16 semanas';
    return 'Estoque superior a 16 semanas';
  };

  const getDetailsMessage = () => {
    return 'Mais detalhes sobre o medicamento'
  }

  const navigate = useNavigate();

  const handleDetailsClick = () => {
    navigate(`/medicine/${medicine.id}`);
  };

  return (
    <tr className={`table-row ${getStatusClass(medicine.status)}`} title={getStockMessage(medicine.status)}>
      <td className="coluna-codigo">{medicine.codigo}</td>
      <td className="coluna-nome">{medicine.nome}</td>
      <td className="coluna-class-item">{medicine.classificacaoItem}</td>
      <td className="coluna-class-modelo">{medicine.classificacaoModelo}</td>
      <td className="coluna-unidade">{medicine.unidade}</td>
      <td className="coluna-quantidade">{medicine.qtdAtual}</td>
      <td>
        <button className="details-button" onClick={handleDetailsClick} title={getDetailsMessage()}>Detalhes</button>
      </td>
    </tr>
  );
};

export default TableRow;