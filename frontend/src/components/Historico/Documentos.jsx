import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

export default function Documentos() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const municipio = 'Palmares';

  useEffect(() => {
    const fetchDocs = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await api.get('/upload/documentos', { params: { municipio } });
        const data = resp?.data?.data?.arquivos || [];
        setDocs(data);
      } catch (e) {
        setError(e?.response?.data?.message || e.message || 'Erro ao carregar documentos');
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  // Extrair semana do NOME do arquivo (timestamp no início)
  // Exemplo: "2025-09-30T22-44-08-521Z_7f406e73_Movimentacao_CAF.xlsx"
  const extractWeekFromFilename = (filename) => {
    try {
      // Extrair timestamp do início do nome (formato: YYYY-MM-DDTHH-mm-ss-sssZ)
      const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})T/);
      if (!match) {
        console.warn('Não foi possível extrair data do nome:', filename);
        return 'Desconhecida';
      }
      
      const [, ano, mes, dia] = match;
      const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      
      if (isNaN(data.getTime())) {
        return 'Desconhecida';
      }
      
      // Calcular número da semana
      const inicio = new Date(data.getFullYear(), 0, 1);
      const dias = Math.floor((data.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000));
      const semana = Math.ceil((dias + inicio.getDay() + 1) / 7);
      
      return `${ano}_${String(semana).padStart(2, '0')}`;
    } catch (e) {
      console.error('Erro ao extrair semana:', e);
      return 'Desconhecida';
    }
  };

  // Extrair unidade do NOME do arquivo
  // Padrões: "...Movimenta__o_CAF_01-06.xlsx" ou "...Balancete_CAF_01-06.xlsx"
  const extractUnidadeFromFilename = (filename) => {
    try {
      // Padrão: após "Movimentação"/"Movimenta__o"/"Balancete" até a data (DD-MM)
      const patterns = [
        /(?:Movimenta__o|Balancete)[_\s]+([A-Za-z0-9]+)(?:[_\s]+\d{2}-\d{2})?/i,
        /(?:Moviment|Balance)[_\s]+([A-Za-z0-9]+)(?:[_\s]+\d{2}-\d{2})?/i
      ];
      
      for (const pattern of patterns) {
        const match = filename.match(pattern);
        if (match && match[1]) {
          return match[1].toUpperCase().trim();
        }
      }
      
      console.warn('Não foi possível extrair unidade do nome:', filename);
      return 'Desconhecida';
    } catch (e) {
      console.error('Erro ao extrair unidade:', e);
      return 'Desconhecida';
    }
  };

  const grupos = useMemo(() => {
    // Agrupar por município > unidade > semana
    const map = {};
    
    for (const f of docs) {
      const mun = f.municipio || 'Palmares';
      const uni = extractUnidadeFromFilename(f.nome); // Extrair unidade do nome do arquivo
      const semana = extractWeekFromFilename(f.nome);
      
      if (!map[mun]) map[mun] = {};
      if (!map[mun][uni]) map[mun][uni] = {};
      if (!map[mun][uni][semana]) map[mun][uni][semana] = [];
      
      map[mun][uni][semana].push(f);
    }
    
    return map;
  }, [docs]);

  const handleDownload = async (filePath, fileName) => {
    setDownloading(filePath);
    try {
      const response = await fetch(`/api/upload/documentos/download?path=${encodeURIComponent(filePath)}`);
      
      if (!response.ok) {
        throw new Error('Erro ao fazer download');
      }

      // Criar blob e fazer download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert(`Erro ao baixar arquivo: ${e.message}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📎 Documentos Anexados</h2>
      <p style={{ color: '#666' }}>Organizados por Município → Unidade → Semana (extraída do nome do arquivo)</p>
      
      {loading && <div>Carregando...</div>}
      {error && <div style={{ color: '#b00020', padding: 12, background: '#fee', borderRadius: 6 }}>{error}</div>}
      {!loading && !error && Object.keys(grupos).length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
          Nenhum documento encontrado.
        </div>
      )}

      <div style={{ display: 'grid', gap: 20, marginTop: 16 }}>
        {Object.entries(grupos).map(([municipio, unidades]) => (
          <div key={municipio} style={{ border: '2px solid #007bff', borderRadius: 10, overflow: 'hidden' }}>
            {/* Header do Município */}
            <div style={{ padding: '16px 20px', background: '#007bff', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>🏛️ {municipio}</h3>
            </div>

            {/* Unidades */}
            <div style={{ padding: 12, background: '#f8f9fa' }}>
              {Object.entries(unidades).map(([unidade, semanas]) => (
                <div key={unidade} style={{ marginBottom: 16, border: '1px solid #dee2e6', borderRadius: 8, background: 'white', overflow: 'hidden' }}>
                  {/* Header da Unidade */}
                  <div style={{ padding: '12px 16px', background: '#e9ecef', borderBottom: '1px solid #dee2e6' }}>
                    <strong style={{ fontSize: 16 }}>🏥 {unidade}</strong>
                  </div>

                  {/* Semanas */}
                  <div style={{ padding: 12 }}>
                    {Object.entries(semanas).sort((a,b) => a[0] < b[0] ? 1 : -1).map(([semana, files]) => (
                      <div key={semana} style={{ marginBottom: 12 }}>
                        <div style={{ marginBottom: 8, color: '#495057', fontWeight: 600 }}>
                          📅 Semana {semana} ({files.length} arquivo{files.length !== 1 ? 's' : ''})
                        </div>
                        
                        <div style={{ display: 'grid', gap: 8 }}>
                          {files.map((f, idx) => (
                            <div key={idx} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: 12, 
                              border: '1px solid #e9ecef', 
                              borderRadius: 6,
                              background: '#fafbfc',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f3f5'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fafbfc'}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.nome}</div>
                                <div style={{ fontSize: 12, color: '#6c757d' }}>
                                  📅 {new Date(f.data_upload).toLocaleString('pt-BR')} • 
                                  📦 {(f.tamanho/1024).toFixed(1)} KB
                                </div>
                                <div style={{ fontSize: 11, color: '#adb5bd', marginTop: 2 }}>{f.path}</div>
                              </div>
                              
                              <button
                                onClick={() => handleDownload(f.path, f.nome)}
                                disabled={downloading === f.path}
                                style={{
                                  padding: '8px 16px',
                                  background: downloading === f.path ? '#6c757d' : '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 6,
                                  cursor: downloading === f.path ? 'not-allowed' : 'pointer',
                                  fontSize: 14,
                                  fontWeight: 600,
                                  transition: 'background 0.2s',
                                  whiteSpace: 'nowrap',
                                  marginLeft: 12
                                }}
                                onMouseEnter={e => {
                                  if (downloading !== f.path) e.currentTarget.style.background = '#218838';
                                }}
                                onMouseLeave={e => {
                                  if (downloading !== f.path) e.currentTarget.style.background = '#28a745';
                                }}
                              >
                                {downloading === f.path ? '⏳ Baixando...' : '⬇️ Download'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

