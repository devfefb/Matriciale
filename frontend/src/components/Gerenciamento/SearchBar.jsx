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
              
              {/* Categoria Roxo - Itens Zerados */}
              <li className="filter-category">Itens Zerados</li>
              <li onClick={() => handleColorFilter("zerado-inativo", "Zerado Inativo")}>
                <span className="filter-indent">Zerado Inativo</span>
              </li>
              <li onClick={() => handleColorFilter("zerado-dispensacao", "Zerado c/ Dispensação")}>
                <span className="filter-indent">Zerado c/ Dispensação</span>
              </li>
              
              {/* Categorias Normais */}
              <li className="filter-category">Estoque Normal</li>
              <li onClick={() => handleColorFilter("quatro-semanas", "4 Semanas")}>
                <span className="filter-indent">4 Semanas</span>
              </li>
              <li onClick={() => handleColorFilter("oito-semanas", "8 Semanas")}>
                <span className="filter-indent">8 Semanas</span>
              </li>
              <li onClick={() => handleColorFilter("doze-semanas", "12 Semanas")}>
                <span className="filter-indent">12 Semanas</span>
              </li>
              <li onClick={() => handleColorFilter("dezesseis-semanas", "16 Semanas")}>
                <span className="filter-indent">16 Semanas</span>
              </li>
              
              {/* Categoria Alto Estoque */}
              <li className="filter-category">Alto Estoque</li>
              <li onClick={() => handleColorFilter("azul-claro", "16-52 Semanas")}>
                <span className="filter-indent">16-52 Semanas</span>
              </li>
              <li onClick={() => handleColorFilter("azul-escuro", "+52 Semanas")}>
                <span className="filter-indent">+52 Semanas</span>
              </li>
              
              {/* Alertas */}
              <li className="filter-category">Alertas</li>
              <li onClick={() => handleColorFilter("dezesseis-semanas-inativo", "16 Sem. Inativo (Alerta)")}>
                <span className="filter-indent">16 Sem. Inativo</span>
              </li>
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
