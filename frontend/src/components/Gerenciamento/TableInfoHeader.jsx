import React from 'react';
import '../../styles/TableHeader.css';

const TableInfoHeader = () => {
  return (
    <thead>
      <tr>
        <th>Nome</th>
        <th>Qtd. Atual</th>
        <th>Qtd. Ideal</th>
        <th>Qtd. Reposição</th>
      </tr>
    </thead>
  );
};

export default TableInfoHeader; 