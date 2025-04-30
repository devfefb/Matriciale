import React, { useState } from "react";
import "../../styles/SearchBar.css";
import filtroIcon from "../../img/Icone-filtro.png";
import setaBaixoIcon from "../../img/Icone-seta-baixo.png";
import searchIcon from "../../img/Union.png";

const SearchBar = ({ onSearch, onColorFilter, onClassFilter }) => {
  const [showColorFilter, setShowColorFilter] = useState(false);
  const [showClassFilter, setShowClassFilter] = useState(false);
  const [selectedColor, setSelectedColor] = useState("Filtrar por cor");
  const [selectedClass, setSelectedClass] = useState("Filtrar por classificação");

  // Função para selecionar filtro e atualizar texto do botão
  const handleColorFilter = (filter, label) => {
    onColorFilter(filter);
    setSelectedColor(label); // Atualiza o texto do botão
    setShowColorFilter(false); // Fecha o dropdown
  };

  const handleClassFilter = (filter, label) => {
    onClassFilter(filter);
    setSelectedClass(label); // Atualiza o texto do botão
    setShowClassFilter(false); // Fecha o dropdown
  };

  return (
    <div className="search-container">
      {/* Campo de busca */}
      <div className="search-input">
        <img src={searchIcon} alt="Search Icon" className="search-icon" />
        <input
          type="text"
          placeholder="Busque medicamentos por nome"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="filter-buttons-container">
        {/* Botão para filtrar por cor */}
        <div className="filter-button">
          <button onClick={() => setShowColorFilter(!showColorFilter)}>
            <img src={filtroIcon} alt="Filter Icon" />
            {selectedColor} {/* Exibe o nome do filtro selecionado */}
            <img src={setaBaixoIcon} alt="Down Arrow" className="down-arrow" />
          </button>

          {showColorFilter && (
            <ul className="filter-dropdown">
              <li onClick={() => handleColorFilter("", "Filtrar por cor")}>Todos</li>
              <li onClick={() => handleColorFilter("zerado", "Zerado")}>Zerado</li>
              <li onClick={() => handleColorFilter("quatro-semanas", "4 Semanas")}>4 Semanas</li>
              <li onClick={() => handleColorFilter("oito-semanas", "8 Semanas")}>8 Semanas</li>
              <li onClick={() => handleColorFilter("doze-semanas", "12 Semanas")}>12 Semanas</li>
              <li onClick={() => handleColorFilter("dezesseis-semanas", "16 Semanas")}>16 Semanas</li>
              <li onClick={() => handleColorFilter("mais-dezesseis-semanas", "+16 Semanas")}>+16 Semanas</li>
            </ul>
          )}
        </div>

        {/* Botão para filtrar por classificação */}
        <div className="filter-button">
          <button onClick={() => setShowClassFilter(!showClassFilter)}>
            <img src={filtroIcon} alt="Filter Icon" />
            {selectedClass} {/* Exibe o nome do filtro selecionado */}
            <img src={setaBaixoIcon} alt="Down Arrow" className="down-arrow" />
          </button>

          {showClassFilter && (
            <ul className="filter-dropdown">
              <li onClick={() => handleClassFilter("", "Filtrar por classificação")}>Todos</li>
              <li onClick={() => handleClassFilter("Remune", "Remune")}>Remune</li>
              <li onClick={() => handleClassFilter("Assistencial", "Assistencial")}>Assistencial</li>
              <li onClick={() => handleClassFilter("Processo Judicial", "Processo Judicial")}>Processo Judicial</li>
              <li onClick={() => handleClassFilter("Farmacológico", "Farmacológico")}>Farmacológico</li>
              <li onClick={() => handleClassFilter("Material", "Material")}>Material</li>
              <li onClick={() => handleClassFilter("Fraldas e/ou leites", "Fraldas e/ou leites")}>Fraldas e/ou leites</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
