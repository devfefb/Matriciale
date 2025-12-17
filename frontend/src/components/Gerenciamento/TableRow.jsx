import React from 'react';
import '../../styles/TableRow.css';
import { useNavigate } from 'react-router-dom';

const TableRow = ({ medicine }) => {

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

  const getStockMessage = (medicine) => {
    const { status, isInativo } = medicine;
    
    if (status === 0) {
      if (isInativo) {
        return 'Estoque zerado - Item Inativo';
      }
      return 'Estoque zerado - Com Dispensação (verificar motivo)';
    }
    if (status <= 4) return 'Estoque de até 4 semanas';
    if (status <= 8) return 'Estoque de até 8 semanas';
    if (status <= 12) return 'Estoque de até 12 semanas';
    if (status <= 16) {
      if (isInativo) {
        return 'Estoque de até 16 semanas - Item Inativo (ATENÇÃO: possível vencimento)';
      }
      return 'Estoque de até 16 semanas';
    }
    if (status <= 52) return 'Estoque entre 16 e 52 semanas';
    return 'Estoque superior a 52 semanas';
  };

  const getDetailsMessage = () => {
    return 'Mais detalhes sobre o medicamento'
  }

  const navigate = useNavigate();

  const handleDetailsClick = () => {
    navigate(`/medicine/${medicine.id}`);
  };

  return (
    <tr className={`table-row ${getStatusClass(medicine)}`} title={getStockMessage(medicine)}>
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