import React from 'react';
import '../../styles/TableRow.css';
import { useNavigate } from 'react-router-dom';

const TableRow = ({ medicine }) => {

  const getStatusClass = (qtdAtual) => {
    if (qtdAtual === 0) return 'zerado';
    if (qtdAtual <= 200) return 'quatro-semanas';
    if (qtdAtual <= 700) return 'oito-semanas';
    if (qtdAtual <= 1200) return 'doze-semanas';
    if (qtdAtual <= 1500) return 'dezesseis-semanas';
    return 'mais-dezesseis-semanas';
  };

  const getStockMessage = (qtdAtual) => {
    if (qtdAtual === 0) return 'Estoque zerado';
    if (qtdAtual <= 200) return 'Estoque de 4 semanas';
    if (qtdAtual <= 700) return 'Estoque de 8 semanas';
    if (qtdAtual <= 1200) return 'Estoque de 12 semanas';
    if (qtdAtual <= 1500) return 'Estoque de 16 semanas';
    return 'Estoque superior a 16 semanas';
  };

  const getDetailsMessage = () => {
    return 'Mais detalhes sobre o medicamento'
  }

  const navigate = useNavigate();

  const handleDetailsClick = () => {
    navigate(`/medicine/${medicine.codigo}/${encodeURIComponent(medicine.nome)}`);
  };

  return (
      <tr className={`table-row ${getStatusClass(medicine.qtdAtual)}`} title={getStockMessage(medicine.qtdAtual)}>
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