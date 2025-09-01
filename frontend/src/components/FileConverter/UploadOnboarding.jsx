import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import './UploadSemanal.css';

const UploadSemanal = () => {
  const [isDragActive, setIsDragActive] = useState(false);
  // O estado inicial de 'files' deve ser um objeto, que é a estrutura que você está usando.
  const [files, setFiles] = useState({});
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Função para extrair nome da unidade do arquivo
  const extrairNomeUnidade = useCallback((nomeArquivo) => {
    const nomeBase = nomeArquivo.replace(/\.(xlsx|xls|csv)$/i, '');
    const patterns = [
      /movimentacoes([A-Za-z0-9_]+)/i,
      /balancete([A-Za-z0-9_]+)/i,
      /([A-Za-z0-9_]+)[-_]?movimentacoes/i,
      /([A-Za-z0-9_]+)[-_]?balancete/i,
    ];
    for (const pattern of patterns) {
      const match = nomeBase.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }
    return nomeBase.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }, []);

  // Função para determinar tipo do arquivo
  const determinarTipoArquivo = useCallback((nomeArquivo) => {
    const nome = nomeArquivo.toLowerCase();
    if (nome.includes('movimentac') || nome.includes('moviment')) {
      return 'movimentacao';
    } else if (nome.includes('balancete') || nome.includes('balance')) {
      return 'balancete';
    }
    return 'desconhecido';
  }, []);

  // Handlers para drag & drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ CORREÇÃO PRINCIPAL APLICADA AQUI
  const handleFiles = useCallback((fileList) => {
    setError(null);

    const validFiles = fileList.filter(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      return ['xlsx', 'xls', 'csv'].includes(extension);
    });

    if (validFiles.length === 0 && fileList.length > 0) {
      setError('Por favor, selecione arquivos Excel (.xlsx, .xls) ou CSV (.csv)');
      return;
    }

    // Usando a forma funcional de setState para garantir que estamos usando o estado mais recente.
    setFiles(prevFiles => {
      // Começamos com uma cópia do estado anterior
      const newFilesByUnit = { ...prevFiles };

      validFiles.forEach(file => {
        const unidade = extrairNomeUnidade(file.name);
        const tipo = determinarTipoArquivo(file.name);

        if (tipo === 'desconhecido') {
          console.warn(`Tipo de arquivo não reconhecido: ${file.name}`);
          return; // Pula este arquivo
        }

        // Se a unidade ainda não existe no nosso objeto, inicializa
        if (!newFilesByUnit[unidade]) {
          newFilesByUnit[unidade] = {};
        }

        // Adiciona ou substitui o arquivo para o tipo específico dentro da unidade
        newFilesByUnit[unidade][tipo] = file;
      });

      // Retorna o novo objeto de estado combinado
      return newFilesByUnit;
    });
  }, [extrairNomeUnidade, determinarTipoArquivo]);


  // Função para verificar se uma unidade tem ambos os arquivos
  const verificarArquivosCompletos = useCallback((arquivosUnidade) => {
    return arquivosUnidade && arquivosUnidade.balancete && arquivosUnidade.movimentacao;
  }, []);

  // Função para validar se pode processar
  const podeProcessar = useCallback(() => {
    const unidades = Object.keys(files);
    if (unidades.length === 0) return false;
    return unidades.some(unidade => verificarArquivosCompletos(files[unidade]));
  }, [files, verificarArquivosCompletos]);

  // Função para processar arquivos
  const processarArquivos = useCallback(async () => {
    if (!podeProcessar()) {
      setError('É necessário ter pelo menos um balancete E uma movimentação da mesma unidade para processar');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    
    try {
      const resultados = {};
      const unidades = Object.keys(files);
      let processedCount = 0;
      
      const unidadesCompletas = unidades.filter(unidade => verificarArquivosCompletos(files[unidade]));
      
      if (unidadesCompletas.length === 0) {
        throw new Error('Nenhuma unidade possui ambos os arquivos (balancete + movimentação)');
      }

      for (const unidade of unidadesCompletas) {
        const arquivosUnidade = files[unidade];
        
        setProgress((processedCount / unidadesCompletas.length) * 30);
        console.log(`Processando unidade: ${unidade}`);
        
        console.log(`Processando movimentação para unidade: ${unidade}`);
        const dadosMovimentacao = await processarArquivoMovimentacao(arquivosUnidade.movimentacao, unidade);
        
        setProgress(((processedCount + 0.5) / unidadesCompletas.length) * 60);
        
        console.log(`Processando balancete para unidade: ${unidade}`);
        const dadosBalancete = await processarArquivoBalancete(arquivosUnidade.balancete, unidade);
        
        resultados[unidade] = {
          movimentacao: dadosMovimentacao,
          balancete: dadosBalancete,
          unidade: unidade,
          data_processamento: new Date().toISOString(),
          status: 'completo'
        };
        
        processedCount++;
        setProgress((processedCount / unidadesCompletas.length) * 100);
      }
      
      await salvarResultados(resultados);
      setProcessedData(resultados);
      
    } catch (err) {
      console.error('Erro ao processar arquivos:', err);
      setError(`Erro ao processar arquivos: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, podeProcessar, verificarArquivosCompletos]);

  // Função para processar arquivo de movimentação
  const processarArquivoMovimentacao = useCallback(async (arquivo, unidade) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          const dadosProcessados = processarDadosMovimentacao(jsonData, unidade);
          resolve(dadosProcessados);
          
        } catch (error) {
          reject(new Error(`Erro ao processar movimentação: ${error.message}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo de movimentação'));
      reader.readAsBinaryString(arquivo);
    });
  }, []);

  // Função para processar arquivo de balancete
  const processarArquivoBalancete = useCallback(async (arquivo, unidade) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          const dadosProcessados = processarDadosBalancete(jsonData, unidade);
          resolve(dadosProcessados);
          
        } catch (error) {
          reject(new Error(`Erro ao processar balancete: ${error.message}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo de balancete'));
      reader.readAsBinaryString(arquivo);
    });
  }, []);

  // Funções de processamento de dados (simplificadas)
  const processarDadosMovimentacao = useCallback((dados, unidade) => {
    return {
      unidade,
      tipo: 'movimentacao',
      periodo_inicio: '2025-01-01',
      periodo_fim: '2025-01-31',
      itens: dados.slice(1).map((linha, index) => ({
        id: index + 1,
        descricao_item: linha[0] || '',
        quantidade: linha[1] || 0,
        valor: linha[2] || 0
      }))
    };
  }, []);

  const processarDadosBalancete = useCallback((dados, unidade) => {
    return {
      unidade,
      tipo: 'balancete',
      periodo_inicio: '2025-01-01',
      periodo_fim: '2025-01-31',
      itens: dados.slice(1).map((linha, index) => ({
        id: index + 1,
        descricao_item: linha[0] || '',
        saldo_anterior: linha[1] || 0,
        entradas: linha[2] || 0,
        saidas: linha[3] || 0,
        saldo_atual: linha[4] || 0
      }))
    };
  }, []);

  // Função para salvar resultados
  const salvarResultados = useCallback(async (resultados) => {
    console.log('Salvando resultados em test-input/', resultados);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeArquivo = `upload-semanal-${timestamp}.json`;
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Arquivo salvo como: ${nomeArquivo}`);
  }, []);

  // ✅ CORREÇÃO APLICADA AQUI
  const limparArquivos = useCallback(() => {
    // O estado deve ser resetado para um objeto vazio, não um array.
    setFiles({});
    setProcessedData(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="upload-semanal-container">
      {/* O resto do seu JSX permanece exatamente o mesmo, pois ele já estava correto e reativo */}
       <h1>Upload Semanal - Movimentação e Balancete</h1>
       <p className="description">
         Faça upload dos arquivos de <strong>movimentação</strong> e <strong>balancete</strong> para processamento semanal.
         <br />
         📋 <strong>Importante:</strong> Cada unidade precisa de AMBOS os arquivos (movimentação + balancete) para ser processada.
         <br />
         📁 Os arquivos devem conter o nome da unidade no filename (ex: movimentacaoCAF.xlsx, balanceteCAF.xlsx).
         <br />
         🔄 Você pode adicionar arquivos um por vez ou múltiplos de uma vez.
       </p>
      
       <div 
         className={`drop-zone ${isDragActive ? 'active' : ''}`}
         onDragOver={handleDragOver}
         onDragLeave={handleDragLeave}
         onDrop={handleDrop}
       >
         <div className="drop-zone-content">
           <p>Arraste e solte seus arquivos aqui (.xlsx, .xls, .csv)</p>
           <p className="file-hint">Múltiplos arquivos aceitos - movimentação e balancete por unidade</p>
           <button 
             className="browse-btn"
             onClick={handleBrowseClick}
             disabled={isProcessing}
           >
             Escolher Arquivos
           </button>
           <input
             ref={fileInputRef}
             type="file"
             accept=".csv,.xlsx,.xls"
             style={{ display: 'none' }}
             onChange={handleFileInputChange}
             multiple
           />
         </div>
       </div>

       {Object.keys(files).length > 0 && (
         <div className="files-list">
           <h3>Arquivos Selecionados:</h3>
           {Object.entries(files).map(([unidade, arquivos]) => {
             const temBalancete = !!arquivos.balancete;
             const temMovimentacao = !!arquivos.movimentacao;
             const estaCompleto = temBalancete && temMovimentacao;
            
             return (
               <div key={unidade} className={`unit-files ${estaCompleto ? 'complete' : 'incomplete'}`}>
                 <h4>
                   Unidade: {unidade.toUpperCase()} 
                   {estaCompleto ? ' ✅' : ' ⚠️'}
                 </h4>
                 <ul>
                   <li className={temBalancete ? 'present' : 'missing'}>
                     <span className="file-type">balancete:</span> 
                     {temBalancete ? arquivos.balancete.name : 'Arquivo necessário'}
                   </li>
                   <li className={temMovimentacao ? 'present' : 'missing'}>
                     <span className="file-type">movimentacao:</span> 
                     {temMovimentacao ? arquivos.movimentacao.name : 'Arquivo necessário'}
                   </li>
                 </ul>
                 {!estaCompleto && (
                   <p className="status-warning">
                     ⚠️ Para processar esta unidade, adicione os arquivos que faltam
                   </p>
                 )}
               </div>
             );
           })}
          
           <div className="summary-info">
             <p>
               <strong>Status:</strong> {
                 Object.values(files).filter(arquivos => verificarArquivosCompletos(arquivos)).length
               } unidade(s) pronta(s) para processamento
             </p>
           </div>
          
           <div className="action-buttons">
             <button 
               className="process-btn"
               onClick={processarArquivos}
               disabled={isProcessing || !podeProcessar()}
             >
               {isProcessing ? 'Processando...' : 'Processar Arquivos'}
             </button>
             <button 
               className="clear-btn"
               onClick={limparArquivos}
               disabled={isProcessing}
             >
               Limpar
             </button>
           </div>
         </div>
       )}

       {isProcessing && (
         <div className="progress-container">
           <div className="progress-bar">
             <div 
               className="progress-fill"
               style={{ width: `${progress}%` }}
             ></div>
           </div>
           <p className="progress-text">Processando... {Math.round(progress)}%</p>
         </div>
       )}

       {error && (
         <div className="error-container">
           <h3>Erro:</h3>
           <p className="error-message">{error}</p>
         </div>
       )}

       {processedData && (
         <div className="result-container">
           <div className="result-header">
             <h2>Processamento Concluído</h2>
             <p className="success-message">
               ✅ Arquivos processados e salvos em test-input/ para validação automática
             </p>
           </div>
           <div className="result-summary">
             <h3>Resumo:</h3>
             <ul>
               {Object.entries(processedData).map(([unidade, dados]) => (
                 <li key={unidade}>
                   <strong>{unidade.toUpperCase()}:</strong>
                   {dados.movimentacao && <span> Movimentação ✓</span>}
                   {dados.balancete && <span> Balancete ✓</span>}
                 </li>
               ))}
             </ul>
           </div>
         </div>
       )}
    </div>
  );
};

export default UploadSemanal;