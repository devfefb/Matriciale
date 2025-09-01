import React from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import UploadSemanal from '../components/FileConverter/UploadSemanal';

const ConversorArquivos = () => {
  return (
    <div>
      <Header />
      <div style={{
        display: "flex",
      }}>
        <Sidebar />
        <UploadSemanal />
      </div>
    </div>
  );
};

export default ConversorArquivos; 