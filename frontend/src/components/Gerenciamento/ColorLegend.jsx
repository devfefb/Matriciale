import React from 'react';
import '../../styles/ColorLegend.css';

const ColorLegend = () => {
  return (
    <div className="color-legend">
      <p className="titulo-legenda">Duração do estoque por cores</p>
      <div className="legend-items">
        <div className="legend-item zerado">
          <span className="color-circle1"></span>
          <span>Zerado</span>
        </div>
        <div className="legend-item quatro-semanas">
          <span className="color-circle2"></span>
          <span>4 semanas</span>
        </div>
      </div>
      <div className="legend-items">
        <div className="legend-item oito-semanas">
          <span className="color-circle3"></span>
          <span>8 semanas</span>
        </div>
        <div className="legend-item doze-semanas">
          <span className="color-circle4"></span>
          <span>12 semanas</span>
        </div>
      </div>
      <div className="legend-items">
        <div className="legend-item dezesseis-semanas">
          <span className="color-circle5"></span>
          <span>16 semanas</span>
        </div>
        <div className="legend-item mais-dezesseis-semanas">
          <span className="color-circle6"></span>
          <span>+16 semanas</span>
        </div>
      </div>
    </div>
  );
};

export default ColorLegend; 