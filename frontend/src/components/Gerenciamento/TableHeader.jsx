import React from 'react';
import '../../styles/TableHeader.css';

const TableHeader = () => {
  return (
    <thead>
      <tr>
        <th>Código</th>
        <th>Nome</th>
        <th>Classificação Item</th>
        <th>Classificação Modelo</th>
        <th>Unidade</th>
        <th>Qtd. Atual</th>
        <th></th>
      </tr>
    </thead>
  );
};

export default TableHeader; 