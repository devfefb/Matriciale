import { useState, useRef, useCallback } from 'react';
import api from '../../services/api';
import styles from './UploadSemanal.module.css';

import {
  extrairNomeUnidade,
  determinarTipoArquivo,
  verificarArquivosCompletos,
  processarArquivoBalancete,
  processarArquivoMovimentacao,
  aplicarClassificacaoMovimentacoes,
  salvarResultados,
} from './UploadSemanalUtil';

const UploadSemanal = () => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState({});
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState(null);
  const [calcResult, setCalcResult] = useState(null);
  const fileInputRef = useRef(null);

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

      if (!newFilesToAdd[unidade]) {
        newFilesToAdd[unidade] = {};
      }
      newFilesToAdd[unidade][tipo] = file;
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    setFiles(prevFiles => {
      const updatedFiles = { ...prevFiles };
      Object.keys(newFilesToAdd).forEach(unidade => {
        if (!updatedFiles[unidade]) {
          updatedFiles[unidade] = {};
        }
        Object.keys(newFilesToAdd[unidade]).forEach(tipo => {
          updatedFiles[unidade][tipo] = newFilesToAdd[unidade][tipo];
        });
      });
      return updatedFiles;
    });
  }, []);

  // Função para validar se pode processar
  const podeProcessar = useCallback(() => {
    const unidades = Object.keys(files);
    if (unidades.length === 0) return false;
    const unidadesCompletas = unidades.filter(unidade => verificarArquivosCompletos(files[unidade]));
    return unidadesCompletas.length > 0;
  }, [files]);

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
      setProgress(10);
      console.log(`📦 Processando ${unidadesCompletas.length} unidades completas seguindo script.cjs...`);

      const inventoryDataPorUnidade = {};
      for (let i = 0; i < unidadesCompletas.length; i++) {
        const unidade = unidadesCompletas[i];
        const arquivosUnidade = files[unidade];
        setProgress(10 + (i / unidadesCompletas.length) * 70);
        console.log(`⚙️ Processando unidade: ${unidade}`);
        try {
          console.log('📋 Processando planilha balancete...');
          const itens = await processarArquivoBalancete(arquivosUnidade.balancete, unidade);
          console.log(`✅ ${itens.length} itens movimentados encontrados no balancete`);

          console.log('📊 Processando planilha movimentacao...');
          const resultado = await processarArquivoMovimentacao(arquivosUnidade.movimentacao, unidade, itens);

          console.log('🔄 Aplicando classificação de movimentações e lógica específica da unidade...');
          const resultadoClassificado = await aplicarClassificacaoMovimentacoes(resultado, unidade);

          const inventoryData = {
            periodo_inicio: resultadoClassificado.periodo.periodo_inicio,
            periodo_fim: resultadoClassificado.periodo.periodo_fim,
            unidade: resultadoClassificado.unidade || unidade,
            unidade_info: resultadoClassificado.unidade_info,
            itens: resultadoClassificado.itens,
            estatisticas_classificacao: resultadoClassificado.estatisticas,
            versao_processamento: '2.0.0'
          };
          console.log(`📅 Período de apuração: ${inventoryData.periodo_inicio} a ${inventoryData.periodo_fim}`);
          console.log(`📦 Total de itens processados: ${inventoryData.itens.length}`);
          inventoryDataPorUnidade[unidade] = inventoryData;
        } catch (error) {
          console.error(`❌ Erro ao processar unidade ${unidade}:`, error);
          throw new Error(`Erro na unidade ${unidade}: ${error.message}`);
        }
      }

      setProgress(80);
      console.log('📤 Enviando inventoryData para backend...');
      const dadosBackend = await salvarResultados(inventoryDataPorUnidade, files);
      setProgress(90);

      const resultadosFinais = {
        status: 'sucesso',
        municipio: dadosBackend.municipio || 'Palmares',
        arquivos_gerados: dadosBackend.arquivos_gerados || [],
        unidades_processadas: dadosBackend.unidades_processadas || Object.keys(inventoryDataPorUnidade),
        total_unidades: dadosBackend.total_unidades || Object.keys(inventoryDataPorUnidade).length,
        data_processamento: dadosBackend.timestamp || new Date().toISOString(),
        caminho_diretorio: dadosBackend.caminho,
        arquivos_processados: dadosBackend.arquivos_processados || Object.keys(inventoryDataPorUnidade).length,
        environment: dadosBackend.environment || 'development',
        storage_type: dadosBackend.storage_type || 'local_filesystem',
        resultados: dadosBackend.resultados || Object.entries(inventoryDataPorUnidade).map(([unidade, data]) => ({
          unidade,
          arquivo_original: `inventoryData${unidade}.json`,
          arquivo_salvo: dadosBackend.caminho ? `${dadosBackend.caminho}/inventoryData${unidade}.json` : `inventoryData${unidade}.json`,
          periodo: `${data.periodo_inicio} a ${data.periodo_fim}`,
          total_itens: data.itens.length
        })),
        resumo_por_unidade: dadosBackend.resumo_por_unidade || Object.fromEntries(
          Object.entries(inventoryDataPorUnidade).map(([unidade, data]) => [
            unidade,
            {
              periodo: `${data.periodo_inicio} a ${data.periodo_fim}`,
              total_itens: data.itens.length
            }
          ])
        ),
        formato_script_cjs: true
      };

      setProgress(100);
      setProcessedData(resultadosFinais);
    } catch (err) {
      console.error('Erro ao processar arquivos:', err);
      setError(`Erro ao processar arquivos: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [files, podeProcessar]);

  const limparArquivos = useCallback(() => {
    setFiles({});
    setProcessedData(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removerArquivo = useCallback((unidade, tipo) => {
    setFiles(prevFiles => {
      const newFiles = { ...prevFiles };
      if (newFiles[unidade]) {
        delete newFiles[unidade][tipo];
        if (Object.keys(newFiles[unidade]).length === 0) {
          delete newFiles[unidade];
        }
      }
      return newFiles;
    });
  }, []);

  const [selectedMunicipio, setSelectedMunicipio] = useState('Palmares');

  const handleCalcular = useCallback(async () => {
    const municipio = selectedMunicipio;
    setCalcError(null);
    setCalcResult(null);
    setCalcLoading(true);
    try {
      const resp = await api.get('/upload/check-completeness', { params: { municipio } });
      const data = resp?.data?.data;
      if (!data) {
        throw new Error('Resposta inválida do endpoint de completude');
      }
      if (!data.complete) {
        const faltando = (data.missing_units || []).join(', ');
        const msg = `Ainda faltam unidades com JSON no storage para ${municipio}. Faltando: ${faltando || 'desconhecidas'}.`;
        setCalcError(msg);
        return;
      }

      // Chamada para o novo endpoint de cálculo real
      const calculoResp = await api.post('/calculos/executar', { municipio });
      setCalcResult(calculoResp?.data || null);

    } catch (e) {
      setCalcError(e?.response?.data?.error || e.message || 'Erro ao executar cálculo');
    } finally {
      setCalcLoading(false);
    }
  }, [selectedMunicipio]);

  return (
    <div className={styles.container}> {/* Mudou de style para className */}
      <h1 className={styles.title}>Upload Semanal - Movimentação e Balancete</h1> {/* Mudou */}
      <div className={styles.description}> {/* Mudou */}
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
        // Concatenando classes com template literals
        className={`${styles.dropZone} ${isDragActive ? styles.dropZoneActive : ''}`}
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
            className={styles.browseBtn} // Mudou
            onClick={handleBrowseClick}
            disabled={isProcessing}
          >
            Escolher Arquivos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }} // Estilos inline simples podem permanecer
            onChange={handleFileInputChange}
            multiple
          />
        </div>
      </div>
      {Object.keys(files).length > 0 && (
        <div className={styles.filesList}> {/* Mudou */}
          <h3>Arquivos Selecionados:</h3>
          {Object.entries(files).map(([unidade, arquivos]) => {
            const temBalancete = !!arquivos.balancete;
            const temMovimentacao = !!arquivos.movimentacao;
            const estaCompleto = temBalancete && temMovimentacao;
            return (
              <div
                key={unidade}
                // Concatenando classes dinamicamente
                className={`
                ${styles.unitFiles} 
                ${estaCompleto ? styles.unitComplete : styles.unitIncomplete}
              `}
              >
                <h4>
                  Unidade: {unidade}
                  {estaCompleto ? ' ✅' : ' ⚠️'}
                </h4>
                <div style={{ marginTop: '10px' }}> {/* Inline OK */}
                  {temBalancete && (
                    <div className={styles.fileItem}> {/* Mudou */}
                      <span>
                        <span className={styles.fileType}>Balancete:</span> {arquivos.balancete.name} {/* Mudou */}
                      </span>
                      <button
                        className={styles.removeBtn} // Mudou
                        onClick={() => removerArquivo(unidade, 'balancete')}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {temMovimentacao && (
                    <div className={styles.fileItem}> {/* Mudou */}
                      <span>
                        <span className={styles.fileType}>Movimentação:</span> {arquivos.movimentacao.name} {/* Mudou */}
                      </span>
                      <button
                        className={styles.removeBtn} // Mudou
                        onClick={() => removerArquivo(unidade, 'movimentacao')}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {!temBalancete && (
                    // Combinação de classe + estilo inline para a cor específica
                    <div className={styles.fileItem} style={{ color: '#856404' }}>
                      <span className={styles.fileType}>Balancete:</span> Arquivo necessário
                    </div>
                  )}
                  {!temMovimentacao && (
                    <div className={styles.fileItem} style={{ color: '#856404' }}>
                      <span className={styles.fileType}>Movimentação:</span> Arquivo necessário
                    </div>
                  )}
                </div>
                {!estaCompleto && (
                  <p style={{ color: '#856404', marginTop: '10px', fontSize: '14px' }}> {/* Inline OK */}
                    ⚠️ Para processar esta unidade, adicione os arquivos que faltam
                  </p>
                )}
              </div>
            );
          })}
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px' }}> {/* Inline OK */}
            <p>
              <strong>Status:</strong> {
                Object.values(files).filter(arquivos => verificarArquivosCompletos(arquivos)).length
              } unidade(s) pronta(s) para processamento
            </p>
          </div>
          <div className={styles.actionButtons}> {/* Mudou */}
            <button
              className={styles.processBtn} // Mudou
              // Os estilos dinâmicos de 'disabled' foram removidos.
              // Recomendo adicionar isso ao seu CSS:
              // .processBtn:disabled {
              //   opacity: 0.5;
              //   cursor: not-allowed;
              // }
              onClick={processarArquivos}
              disabled={isProcessing || !podeProcessar()}
            >
              {isProcessing ? 'Processando...' : 'Processar Arquivos'}
            </button>
            <button
              className={styles.clearBtn} // Mudou
              onClick={limparArquivos}
              disabled={isProcessing}
            >
              Limpar Todos
            </button>
          </div>
        </div>
      )}
      <div style={{ marginTop: '20px', padding: '16px', border: '1px solid #e9ecef', borderRadius: '8px', background: '#fff' }}> {/* Inline OK */}
        <h3 style={{ marginTop: 0 }}>Calcular</h3>
        <p style={{ color: '#6c757d', marginTop: '6px' }}>
          Verifica se os dados processados de todas as unidades estão disponíveis. Em caso positivo, executa os cálculos e salva no banco.
        </p>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="municipio-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>Município:</label>
          <select
            id="municipio-select"
            value={selectedMunicipio}
            onChange={(e) => setSelectedMunicipio(e.target.value)}
            style={{ padding: '5px', borderRadius: '4px' }}
          >
            <option value="Palmares">Palmares</option>
            <option value="Pirangi">Pirangi</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}> {/* Inline OK */}
          <button
            className={styles.processBtn} // Mudou
            style={{ backgroundColor: '#17a2b8' }} // Estilo inline para sobrescrever cor
            onClick={handleCalcular}
            disabled={calcLoading}
          >
            {calcLoading ? 'Validando...' : 'Calcular'}
          </button>
          {calcError && (
            <span style={{ color: '#dc3545' }}>{calcError}</span>
          )}
        </div>
        {calcResult && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#e8f5e8', border: '1px solid #28a745', borderRadius: '8px' }}> {/* Inline OK */}
            <div style={{ fontWeight: 'bold', color: '#155724' }}>Cálculo executado com sucesso!</div>
            <div style={{ fontSize: '14px', color: '#155724' }}>
              Data: {new Date().toLocaleString('pt-BR')}
            </div>
            <div style={{ marginTop: '6px', fontSize: '14px' }}>
              <div><strong>Total Processados:</strong> {calcResult?.totalProcessados ?? 0}</div>
              <div><strong>Sucessos:</strong> {calcResult?.totalSucessos ?? 0}</div>
              <div><strong>Erros:</strong> {calcResult?.totalErros ?? 0}</div>
            </div>
          </div>
        )}
      </div>
      {isProcessing && (
        <div className={styles.progressContainer}> {/* Mudou */}
          <div className={styles.progressBar}> {/* Mudou */}
            <div
              className={styles.progressFill} // Mudou
              style={{ width: `${progress}%` }} // Estilo dinâmico permanece inline
            />
          </div>
          <p style={{ textAlign: 'center', marginTop: '10px' }}> {/* Inline OK */}
            Processando... {Math.round(progress)}%
          </p>
        </div>
      )}
      {error && (
        <div className={styles.errorContainer}> {/* Mudou */}
          <h3>Erro:</h3>
          <p>{error}</p>
        </div>
      )}
      {processedData && (
        <div className={styles.resultContainer}> {/* Mudou */}
          <div>
            <h2>Processamento Concluído</h2>
            <p className={styles.successMessage}> {/* Mudou */}
              ✅ Arquivos processados e salvos em test-input/ para validação automática
            </p>
          </div>
          <div style={{ marginTop: '15px' }}>
            <h3>Resumo do Processamento:</h3>
            <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px', border: '1px solid #28a745' }}> {/* Inline OK */}
              <p><strong>🏛️ Município:</strong> {processedData.municipio}</p>
              <p><strong>📊 Arquivos Processados:</strong> {processedData.arquivos_processados}</p>
              <p><strong>🕒 Data/Hora:</strong> {new Date(processedData.data_processamento).toLocaleString('pt-BR')}</p>
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}> {/* Inline OK */}
                <p><strong>🌍 Ambiente:</strong> <span style={{ color: '#007bff', fontWeight: 'bold' }}>{processedData.environment}</span></p>
                <p><strong>💾 Storage:</strong> <span style={{ color: '#6f42c1', fontWeight: 'bold' }}>{processedData.storage_type}</span></p>
              </div>
              {processedData.arquivos_gerados && processedData.arquivos_gerados.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <p><strong>📁 Arquivos Gerados:</strong></p>
                  <ul style={{ fontSize: '14px', color: '#666' }}>
                    {processedData.arquivos_gerados.map((arquivo, index) => (
                      <li key={index}><code>{arquivo}</code></li>
                    ))}
                  </ul>
                </div>
              )}
              {processedData.resultados && processedData.resultados.length > 0 && (
                <div style={{ marginTop: '15px' }}>
                  <h4>Detalhes por Arquivo:</h4>
                  <div style={{ display: 'grid', gap: '10px' }}> {/* Inline OK */}
                    {processedData.resultados.map((resultado, index) => (
                      <div key={index} style={{
                        padding: '10px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '5px',
                        border: '1px solid #dee2e6'
                      }}>
                        <h5 style={{ margin: '0 0 5px 0', color: '#495057' }}>{resultado.unidade}</h5>
                        <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                          📅 {resultado.periodo} • 📦 {resultado.total_itens} itens
                        </p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#868e96' }}>
                          💾 {resultado.arquivo_salvo}
                        </p>
                        {resultado.url && processedData.environment === 'production' && (
                          <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
                            <a href={resultado.url} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                              🔗 Ver arquivo no Storage
                            </a>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {processedData.resumo_por_unidade && Object.keys(processedData.resumo_por_unidade).length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h4>Detalhes por Unidade:</h4>
                <div style={{ display: 'grid', gap: '10px' }}> {/* Inline OK */}
                  {Object.entries(processedData.resumo_por_unidade).map(([unidade, dados]) => (
                    <div key={unidade} style={{
                      padding: '10px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '5px',
                      border: '1px solid #dee2e6'
                    }}>
                      <h5 style={{ margin: '0 0 5px 0', color: '#495057' }}>{unidade}</h5>
                      <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                        📅 {dados.periodo} • 📦 {dados.total_itens} itens
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadSemanal;