import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

export default function Documentos() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

  const grupos = useMemo(() => {
    // Agrupar por semana calculada com base na data_upload (YYYY_WW)
    const toWeek = (iso) => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'Desconhecida';
      const ano = d.getFullYear();
      const inicio = new Date(ano, 0, 1);
      const dias = Math.floor((d.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000));
      const semana = Math.ceil((dias + inicio.getDay() + 1) / 7);
      return `${ano}_${String(semana).padStart(2, '0')}`;
    };
    const map = {};
    for (const f of docs) {
      const wk = toWeek(f.data_upload);
      if (!map[wk]) map[wk] = [];
      map[wk].push(f);
    }
    return map;
  }, [docs]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Documentos Anexados</h2>
      <p style={{ color: '#666' }}>Organizados por semana de upload (YYYY_WW)</p>
      {loading && <div>Carregando...</div>}
      {error && <div style={{ color: '#b00020' }}>{error}</div>}
      {!loading && !error && Object.keys(grupos).length === 0 && (
        <div>Nenhum documento encontrado.</div>
      )}
      <div style={{ display: 'grid', gap: 16 }}>
        {Object.entries(grupos).sort((a,b) => a[0] < b[0] ? 1 : -1).map(([semana, files]) => (
          <div key={semana} style={{ border: '1px solid #e5e5e5', borderRadius: 8, background: '#fff' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', background: '#f8f9fa' }}>
              <strong>Semana {semana}</strong>
              <span style={{ marginLeft: 8, color: '#888' }}>({files.length} arquivo(s))</span>
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                {files.map((f, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, border: '1px solid #eee', borderRadius: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{f.nome}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {f.unidade} • {new Date(f.data_upload).toLocaleString('pt-BR')} • {(f.tamanho/1024).toFixed(1)} KB
                      </div>
                      <div style={{ fontSize: 12, color: '#999' }}>{f.path}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

