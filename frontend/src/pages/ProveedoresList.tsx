import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

type Proveedor = {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
};

export default function ProveedoresList() {
  const [activos, setActivos] = useState<Proveedor[]>([]);
  const [inactivos, setInactivos] = useState<Proveedor[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [aRes, iRes] = await Promise.all([
        api.get('/proveedores'),
        api.get('/proveedores/inactivos'),
      ]);
      setActivos(aRes.data);
      setInactivos(iRes.data);
    } catch (err) {
      console.error(err);
      setMsg('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id: string) => {
    if (!window.confirm('¿Desactivar este proveedor?')) return;
    try {
      await api.delete(`/proveedores/${id}`);
      load();
    } catch (err) {
      console.error(err);
      setMsg('Error al desactivar proveedor');
    }
  };

  const onReactivate = async (id: string) => {
    try {
      await api.put(`/proveedores/${id}/reactivar`);
      load();
    } catch (err) {
      console.error(err);
      setMsg('Error al reactivar proveedor');
    }
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
        <h2>Proveedores</h2>
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
              onClick={() => navigate('/proveedores/nuevo')}
              style={btnPrimary}
            >
              + Nuevo proveedor
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
              <th style={th}>Nombre</th>
              <th style={th}>Contacto</th>
              <th style={th}>Teléfono</th>
              <th style={th}>Correo</th>
              <th style={th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={td}>{p.nombre}</td>
                <td style={td}>{p.contacto || '—'}</td>
                <td style={td}>{p.telefono || '—'}</td>
                <td style={td}>{p.correo || '—'}</td>
                <td style={td}>
                  {!showInactive ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(`/proveedores/${p.id}`)}
                        style={linkBtn}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(p.id)}
                        style={linkBtnDanger}
                      >
                        Desactivar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onReactivate(p.id)}
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
                    ? 'No hay proveedores inactivos.'
                    : 'No hay proveedores registrados.'}
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
