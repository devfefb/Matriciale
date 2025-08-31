import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import moment from 'moment';
import './FileConverter.css';

const FileConverter = () => {
  

  return (
    <div className="file-converter-container">
      <h1>Conversor do Arquivo de Base - Matriciale</h1>
      {/* campo para inserir nome do municipio */}
      <div 
        className={`drop-zone ${isDragActive ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>Arraste e solte seu arquivo aqui ().xlsx</p>
        <button 
          className="browse-btn"
          onClick={handleBrowseClick}
        >
          Escolher Arquivo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.pdf"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
      </div>
      <div className="output-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2>Resultado (JSON):</h2>

        </div>
        <pre className="json-output">{jsonOutput}</pre>
      </div>
    </div>
  );
};

export default FileConverter; 