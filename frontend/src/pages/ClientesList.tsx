import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

type Cliente = {
  id: string;
  identificacion?: string;
  nombre: string;
  telefono?: string;
  correo?: string;
};

export default function ClientesList() {
  const [activos, setActivos] = useState<Cliente[]>([]);
  const [inactivos, setInactivos] = useState<Cliente[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [aRes, iRes] = await Promise.all([
        api.get('/clientes'),
        api.get('/clientes/inactivos'),
      ]);
      setActivos(aRes.data);
      setInactivos(iRes.data);
    } catch (err) {
      console.error(err);
      setMsg('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id: string) => {
    if (!window.confirm('¿Desactivar este cliente?')) return;
    try {
      await api.delete(`/clientes/${id}`);
      load();
    } catch (err) {
      console.error(err);
      setMsg('Error al desactivar cliente');
    }
  };

  const onReactivate = async (id: string) => {
    try {
      await api.put(`/clientes/${id}/reactivar`);
    } catch (err) {
      console.error(err);
      setMsg('Error al reactivar cliente');
      return;
    }
    load();
  };

  const rows = showInactive ? inactivos : activos;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 12,
          alignItems: 'center',
        }}
      >
        <h2>Clientes</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowInactive(false)}
            style={{
              ...pill,
              background: !showInactive ? '#000' : '#e5e7eb',
              color: !showInactive ? '#fff' : '#111827',
            }}
          >
            Activos
          </button>
          <button
            type="button"
            onClick={() => setShowInactive(true)}
            style={{
              ...pill,
              background: showInactive ? '#000' : '#e5e7eb',
              color: showInactive ? '#fff' : '#111827',
            }}
          >
            Inactivos
          </button>

          {!showInactive && (
            <button
              type="button"
              onClick={() => navigate('/clientes/nuevo')}
              style={btnPrimary}
            >
              + Nuevo cliente
            </button>
          )}
        </div>
      </div>

      {loading && <p>Cargando...</p>}
      {msg && (
        <p
          style={{
            fontSize: 12,
            color: msg.includes('Error') ? '#dc2626' : '#16a34a',
          }}
        >
          {msg}
        </p>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={th}>Identificación</th>
              <th style={th}>Nombre</th>
              <th style={th}>Teléfono</th>
              <th style={th}>Correo</th>
              <th style={th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={td}>{c.identificacion || '—'}</td>
                <td style={td}>{c.nombre}</td>
                <td style={td}>{c.telefono || '—'}</td>
                <td style={td}>{c.correo || '—'}</td>
                <td style={td}>
                  {!showInactive ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(`/clientes/${c.id}`)}
                        style={linkBtn}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(c.id)}
                        style={linkBtnDanger}
                      >
                        Desactivar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onReactivate(c.id)}
                      style={linkBtn}
                    >
                      Reactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...td, textAlign: 'center', padding: 16 }}>
                  {showInactive
                    ? 'No hay clientes inactivos.'
                    : 'No hay clientes registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '8px 6px',
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'uppercase',
  color: '#64748b',
};

const td: React.CSSProperties = {
  padding: '6px 6px',
};

const pill: React.CSSProperties = {
  borderRadius: 999,
  padding: '4px 10px',
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
};

const btnPrimary: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: 'none',
  background: '#000',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 13,
};

const linkBtn: React.CSSProperties = {
  border: 'none',
  background: 'none',
  color: '#0f766e',
  cursor: 'pointer',
  fontSize: 12,
  marginRight: 6,
};

const linkBtnDanger: React.CSSProperties = {
  ...linkBtn,
  color: '#b91c1c',
};
