import React from 'react';
import '../../styles/ColorLegend.css';

const ColorLegend = () => {
  return (
    <div className="color-legend">
      <p className="titulo-legenda">Duração do estoque por cores</p>
      
      <div className="legend-content">
        {/* Categoria Roxo - Itens Zerados */}
        <div className="legend-category">
          <p className="categoria-titulo">Itens Zerados</p>
          <div className="legend-items">
            <div className="legend-item">
              <span className="color-circle-zerado-inativo"></span>
              <span>Zerado Inativo</span>
            </div>
            <div className="legend-item">
              <span className="color-circle-zerado-dispensacao"></span>
              <span>Zerado c/ Disp.</span>
            </div>
          </div>
        </div>

        {/* Categorias Normais (0-16 semanas) */}
        <div className="legend-category">
          <p className="categoria-titulo">Estoque Normal</p>
          <div className="legend-items">
            <div className="legend-item">
              <span className="color-circle2"></span>
              <span>4 sem.</span>
            </div>
            <div className="legend-item">
              <span className="color-circle3"></span>
              <span>8 sem.</span>
            </div>
            <div className="legend-item">
              <span className="color-circle4"></span>
              <span>12 sem.</span>
            </div>
            <div className="legend-item">
              <span className="color-circle5"></span>
              <span>16 sem.</span>
            </div>
          </div>
        </div>

        {/* Categoria Acima de 16 Semanas */}
        <div className="legend-category">
          <p className="categoria-titulo">Alto Estoque</p>
          <div className="legend-items">
            <div className="legend-item">
              <span className="color-circle-azul-claro"></span>
              <span>16-52 sem.</span>
            </div>
            <div className="legend-item">
              <span className="color-circle-azul-escuro"></span>
              <span>+52 sem.</span>
            </div>
          </div>
        </div>

        {/* Alerta Especial */}
        <div className="legend-category">
          <p className="categoria-titulo alerta">Alertas</p>
          <div className="legend-items">
            <div className="legend-item">
              <span className="color-circle-alerta"></span>
              <span>16 sem. Inativo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorLegend; 