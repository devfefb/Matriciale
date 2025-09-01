import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';

const UploadSemanal = () => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState({});
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Função melhorada para extrair nome da unidade do arquivo
  const extrairNomeUnidade = useCallback((nomeArquivo) => {
    const nomeBase = nomeArquivo.replace(/\.(xlsx|xls|csv)$/i, '');
    
    // Patterns mais específicos para capturar a unidade
    const patterns = [
      /movimentac[ao]?[es]?[-_]?([A-Za-z0-9]+)/i,
      /balancete[-_]?([A-Za-z0-9]+)/i,
      /([A-Za-z0-9]+)[-_]?movimentac/i,
      /([A-Za-z0-9]+)[-_]?balancete/i,
      /([A-Za-z0-9]+)$/i // Fallback para nome simples
    ];
    
    for (const pattern of patterns) {
      const match = nomeBase.match(pattern);
      if (match && match[1] && match[1].length >= 2) {
        return match[1].toUpperCase().trim();
      }
    }
    
    // Se não encontrou padrão, usar o nome base limpo
    return nomeBase.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'DESCONHECIDO';
  }, []);

  // Função para determinar tipo do arquivo
  const determinarTipoArquivo = useCallback((nomeArquivo) => {
    const nome = nomeArquivo.toLowerCase();
    if (nome.includes('movimentac') || nome.includes('moviment')) {
      return 'movimentacao';
    } else if (nome.includes('balancete') || nome.includes('balance')) {
      return 'balancete';
    }
    return null;
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
  }, []);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  }, []);

  // Função principal para lidar com arquivos
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

    // Processar cada arquivo
    const newFilesToAdd = {};
    const errors = [];

    validFiles.forEach(file => {
      const unidade = extrairNomeUnidade(file.name);
      const tipo = determinarTipoArquivo(file.name);

      if (!tipo) {
        errors.push(`Não foi possível identificar o tipo do arquivo: ${file.name}. Use 'movimentacao' ou 'balancete' no nome.`);
        return;
      }

      if (!unidade || unidade === 'DESCONHECIDO') {
        errors.push(`Não foi possível identificar a unidade no arquivo: ${file.name}`);
        return;
      }

      // Inicializar unidade se não existir
      if (!newFilesToAdd[unidade]) {
        newFilesToAdd[unidade] = {};
      }

      newFilesToAdd[unidade][tipo] = file;
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    // Atualizar estado com validação de unidades
    setFiles(prevFiles => {
      const updatedFiles = { ...prevFiles };
      
      // Adicionar novos arquivos
      Object.keys(newFilesToAdd).forEach(unidade => {
        if (!updatedFiles[unidade]) {
          updatedFiles[unidade] = {};
        }
        
        // Verificar se já existe arquivo do mesmo tipo para a unidade
        Object.keys(newFilesToAdd[unidade]).forEach(tipo => {
          updatedFiles[unidade][tipo] = newFilesToAdd[unidade][tipo];
        });
      });

      return updatedFiles;
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
    
    // Verificar se há pelo menos uma unidade com ambos os arquivos
    const unidadesCompletas = unidades.filter(unidade => verificarArquivosCompletos(files[unidade]));
    return unidadesCompletas.length > 0;
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

      setProgress(20);
      console.log(`📦 Processando ${unidadesCompletas.length} unidades completas...`);
      
      // Enviar para o backend para processamento
      setProgress(50);
      const dadosBackend = await salvarResultados(resultados);
      
      setProgress(80);
      
      // Estruturar dados de resposta
      const resultadosFinais = {
        status: 'sucesso',
        municipio: dadosBackend.municipio || 'municipio_teste',
        arquivo_gerado: dadosBackend.arquivo_gerado,
        unidades_processadas: dadosBackend.unidades_processadas || unidadesCompletas,
        total_unidades: dadosBackend.total_unidades || unidadesCompletas.length,
        data_processamento: dadosBackend.timestamp || new Date().toISOString(),
        caminho_arquivo: dadosBackend.caminho
      };
      
      setProgress(100);
      setProcessedData(resultadosFinais);
      
    } catch (err) {
      console.error('Erro ao processar arquivos:', err);
      setError(`Erro ao processar arquivos: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
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

  // Funções de processamento de dados
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

     // Função para testar conectividade com backend
   const testarConectividade = useCallback(async () => {
     try {
       console.log('🔍 Testando conectividade com backend...');
       
       // Primeiro teste: rota geral
       console.log('📡 Testando /api/test...');
       const testResponse = await fetch('/api/test');
       if (testResponse.ok) {
         const testResult = await testResponse.json();
         console.log('✅ Rota /api/test acessível:', testResult);
       } else {
         console.log('❌ Erro na rota /api/test:', testResponse.status, testResponse.statusText);
       }
       
       // Segundo teste: rota específica de upload
       console.log('📡 Testando /api/upload/health...');
       const healthResponse = await fetch('/api/upload/health');
       if (healthResponse.ok) {
         const healthResult = await healthResponse.json();
         console.log('✅ Rota /api/upload/health acessível:', healthResult);
         return true;
       } else {
         console.log('❌ Erro na rota /api/upload/health:', healthResponse.status, healthResponse.statusText);
         const errorText = await healthResponse.text();
         console.log('📄 Resposta de erro:', errorText);
         return false;
       }
       
     } catch (error) {
       console.error('❌ Erro de rede ao testar backend:', error);
       return false;
     }
   }, []);

   // Função para salvar resultados no backend
   const salvarResultados = useCallback(async (resultados) => {
     try {
       // Primeiro testar conectividade
       const conectado = await testarConectividade();
       if (!conectado) {
         throw new Error('Backend não está acessível. Verifique se o servidor está rodando.');
       }

       console.log('📤 Enviando dados para o backend...');
       
       // Preparar FormData com os arquivos
       const formData = new FormData();
       formData.append('municipio', 'municipio_teste'); // Pode ser configurado dinamicamente
       
       // Adicionar arquivos ao FormData
       Object.entries(files).forEach(([unidade, arquivos]) => {
         if (arquivos.balancete) {
           formData.append('arquivos', arquivos.balancete);
         }
         if (arquivos.movimentacao) {
           formData.append('arquivos', arquivos.movimentacao);
         }
       });
       
       // Fazer requisição para o backend
       console.log('🌐 Fazendo requisição para: /api/upload/semanal');
       
       const response = await fetch('/api/upload/semanal', {
         method: 'POST',
         body: formData,
         // Não definir Content-Type - deixar o browser definir para FormData
       });
       
       console.log('📡 Resposta recebida:', {
         status: response.status,
         statusText: response.statusText,
         headers: Object.fromEntries(response.headers.entries())
       });
       
       // Verificar se a resposta tem conteúdo
       const responseText = await response.text();
       console.log('📄 Conteúdo da resposta:', responseText);
       
       if (!responseText) {
         throw new Error('Resposta vazia do servidor');
       }
       
       let result;
       try {
         result = JSON.parse(responseText);
       } catch (parseError) {
         console.error('❌ Erro ao fazer parse do JSON:', parseError);
         throw new Error(`Resposta inválida do servidor: ${responseText.substring(0, 200)}...`);
       }
       
       if (response.ok && result.status === 'success') {
         console.log('✅ Dados salvos com sucesso no backend:', result.data);
         return result.data;
       } else {
         throw new Error(result.message || `Erro HTTP ${response.status}: ${response.statusText}`);
       }
       
     } catch (error) {
       console.error('❌ Erro ao salvar no backend:', error);
       throw new Error(`Falha ao comunicar com o backend: ${error.message}`);
     }
   }, [files]);

  const limparArquivos = useCallback(() => {
    setFiles({});
    setProcessedData(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Remover arquivo específico
  const removerArquivo = useCallback((unidade, tipo) => {
    setFiles(prevFiles => {
      const newFiles = { ...prevFiles };
      if (newFiles[unidade]) {
        delete newFiles[unidade][tipo];
        // Se a unidade não tem mais arquivos, remove ela também
        if (Object.keys(newFiles[unidade]).length === 0) {
          delete newFiles[unidade];
        }
      }
      return newFiles;
    });
  }, []);

  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    },
    title: {
      color: '#333',
      textAlign: 'center',
      marginBottom: '10px'
    },
    description: {
      backgroundColor: '#f8f9fa',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #e9ecef'
    },
    dropZone: {
      border: '2px dashed #007bff',
      borderRadius: '8px',
      padding: '40px 20px',
      textAlign: 'center',
      backgroundColor: isDragActive ? '#e3f2fd' : '#f8f9ff',
      marginBottom: '20px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    dropZoneActive: {
      borderColor: '#0056b3',
      backgroundColor: '#e3f2fd'
    },
    browseBtn: {
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px',
      marginTop: '10px'
    },
    filesList: {
      backgroundColor: '#fff',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px'
    },
    unitFiles: {
      border: '1px solid #ddd',
      borderRadius: '5px',
      padding: '15px',
      marginBottom: '15px'
    },
    unitComplete: {
      backgroundColor: '#d4edda',
      borderColor: '#28a745'
    },
    unitIncomplete: {
      backgroundColor: '#fff3cd',
      borderColor: '#ffc107'
    },
    fileItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid #eee'
    },
    fileType: {
      fontWeight: 'bold',
      color: '#666'
    },
    removeBtn: {
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      padding: '4px 8px',
      borderRadius: '3px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    actionButtons: {
      display: 'flex',
      gap: '10px',
      marginTop: '15px'
    },
    processBtn: {
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px'
    },
    clearBtn: {
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px'
    },
    progressContainer: {
      margin: '20px 0',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px'
    },
    progressBar: {
      width: '100%',
      height: '20px',
      backgroundColor: '#e9ecef',
      borderRadius: '10px',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#007bff',
      transition: 'width 0.3s ease'
    },
    errorContainer: {
      backgroundColor: '#f8d7da',
      border: '1px solid #f5c6cb',
      color: '#721c24',
      padding: '15px',
      borderRadius: '5px',
      margin: '20px 0',
      whiteSpace: 'pre-line'
    },
    resultContainer: {
      backgroundColor: '#d1ecf1',
      border: '1px solid #bee5eb',
      padding: '15px',
      borderRadius: '5px',
      margin: '20px 0'
    },
    successMessage: {
      color: '#0c5460',
      fontWeight: 'bold'
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Upload Semanal - Movimentação e Balancete</h1>
      <div style={styles.description}>
        <p>
          Faça upload dos arquivos de <strong>movimentação</strong> e <strong>balancete</strong> para processamento semanal.
          <br />
          📋 <strong>Importante:</strong> Cada unidade precisa de AMBOS os arquivos (movimentação + balancete) para ser processada.
          <br />
          📁 Os arquivos devem conter o nome da unidade no filename (ex: movimentacaoCAF.xlsx, balanceteCAF.xlsx).
          <br />
          🔄 Você pode adicionar arquivos um por vez ou múltiplos de uma vez.
        </p>
      </div>
      
      <div 
        style={{
          ...styles.dropZone,
          ...(isDragActive ? styles.dropZoneActive : {})
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div>
          <p>Arraste e solte seus arquivos aqui (.xlsx, .xls, .csv)</p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Múltiplos arquivos aceitos - movimentação e balancete por unidade
          </p>
          <button 
            style={styles.browseBtn}
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
        <div style={styles.filesList}>
          <h3>Arquivos Selecionados:</h3>
          {Object.entries(files).map(([unidade, arquivos]) => {
            const temBalancete = !!arquivos.balancete;
            const temMovimentacao = !!arquivos.movimentacao;
            const estaCompleto = temBalancete && temMovimentacao;
            
            return (
              <div 
                key={unidade} 
                style={{
                  ...styles.unitFiles,
                  ...(estaCompleto ? styles.unitComplete : styles.unitIncomplete)
                }}
              >
                <h4>
                  Unidade: {unidade} 
                  {estaCompleto ? ' ✅' : ' ⚠️'}
                </h4>
                
                <div style={{ marginTop: '10px' }}>
                  {temBalancete && (
                    <div style={styles.fileItem}>
                      <span>
                        <span style={styles.fileType}>Balancete:</span> {arquivos.balancete.name}
                      </span>
                      <button 
                        style={styles.removeBtn}
                        onClick={() => removerArquivo(unidade, 'balancete')}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  
                  {temMovimentacao && (
                    <div style={styles.fileItem}>
                      <span>
                        <span style={styles.fileType}>Movimentação:</span> {arquivos.movimentacao.name}
                      </span>
                      <button 
                        style={styles.removeBtn}
                        onClick={() => removerArquivo(unidade, 'movimentacao')}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  
                  {!temBalancete && (
                    <div style={{ ...styles.fileItem, color: '#856404' }}>
                      <span style={styles.fileType}>Balancete:</span> Arquivo necessário
                    </div>
                  )}
                  
                  {!temMovimentacao && (
                    <div style={{ ...styles.fileItem, color: '#856404' }}>
                      <span style={styles.fileType}>Movimentação:</span> Arquivo necessário
                    </div>
                  )}
                </div>
                
                {!estaCompleto && (
                  <p style={{ color: '#856404', marginTop: '10px', fontSize: '14px' }}>
                    ⚠️ Para processar esta unidade, adicione os arquivos que faltam
                  </p>
                )}
              </div>
            );
          })}
          
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
            <p>
              <strong>Status:</strong> {
                Object.values(files).filter(arquivos => verificarArquivosCompletos(arquivos)).length
              } unidade(s) pronta(s) para processamento
            </p>
          </div>
          
          <div style={styles.actionButtons}>
            <button 
              style={{
                ...styles.processBtn,
                opacity: podeProcessar() ? 1 : 0.5,
                cursor: podeProcessar() ? 'pointer' : 'not-allowed'
              }}
              onClick={processarArquivos}
              disabled={isProcessing || !podeProcessar()}
            >
              {isProcessing ? 'Processando...' : 'Processar Arquivos'}
            </button>
            <button 
              style={styles.clearBtn}
              onClick={limparArquivos}
              disabled={isProcessing}
            >
              Limpar Todos
            </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div 
              style={{
                ...styles.progressFill,
                width: `${progress}%`
              }}
            />
          </div>
          <p style={{ textAlign: 'center', marginTop: '10px' }}>
            Processando... {Math.round(progress)}%
          </p>
        </div>
      )}

      {error && (
        <div style={styles.errorContainer}>
          <h3>Erro:</h3>
          <p>{error}</p>
        </div>
      )}

      {processedData && (
        <div style={styles.resultContainer}>
          <div>
            <h2>Processamento Concluído</h2>
            <p style={styles.successMessage}>
              ✅ Arquivos processados e salvos em test-input/ para validação automática
            </p>
          </div>
                     <div style={{ marginTop: '15px' }}>
             <h3>Resumo:</h3>
             <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
               <p><strong>🏛️ Município:</strong> {processedData.municipio}</p>
               <p><strong>📁 Arquivo Gerado:</strong> {processedData.arquivo_gerado}</p>
               <p><strong>📊 Unidades Processadas:</strong> {processedData.total_unidades}</p>
               <p><strong>🕒 Data/Hora:</strong> {new Date(processedData.data_processamento).toLocaleString('pt-BR')}</p>
               {processedData.caminho_arquivo && (
                 <p><strong>💾 Caminho:</strong> <code style={{ fontSize: '12px', backgroundColor: '#e9ecef', padding: '2px 4px', borderRadius: '3px' }}>{processedData.caminho_arquivo}</code></p>
               )}
             </div>
             {processedData.unidades_processadas && processedData.unidades_processadas.length > 0 && (
               <div style={{ marginTop: '10px' }}>
                 <h4>Unidades:</h4>
                 <ul>
                   {processedData.unidades_processadas.map((unidade, index) => (
                     <li key={index}>
                       <strong>{unidade}</strong> ✓
                     </li>
                   ))}
                 </ul>
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

export default UploadSemanal;