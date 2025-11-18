import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';

type FormState = {
  nombre: string;
  direccion: string;
};

export default function BodegaForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'nuevo';

  const [form, setForm] = useState<FormState>({
    nombre: '',
    direccion: '',
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isNew && id) {
      const load = async () => {
        try {
          const r = await api.get(`/bodegas/${id}`);
          setForm({
            nombre: r.data.nombre ?? '',
            direccion: r.data.direccion ?? '',
          });
        } catch (err) {
          console.error(err);
          setMsg('Error al cargar bodega');
        }
      };
      load();
    }
  }, [id, isNew]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      if (!form.nombre.trim()) {
        setMsg('El nombre es obligatorio');
        setLoading(false);
        return;
      }

      if (isNew) {
        await api.post('/bodegas', form);
      } else if (id) {
        await api.put(`/bodegas/${id}`, form);
      }

      navigate('/bodegas');
    } catch (err: any) {
      console.error(err);
      const m = err.response?.data?.message || 'Error al guardar bodega';
      setMsg(m);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 500,
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        padding: 16,
      }}
    >
      <h2 style={{ marginBottom: 12 }}>
        {isNew ? 'Nueva bodega' : 'Editar bodega'}
      </h2>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
        <div>
          <label>Nombre *</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={onChange}
            style={input}
          />
        </div>
        <div>
          <label>Dirección</label>
          <input
            name="direccion"
            value={form.direccion}
            onChange={onChange}
            style={input}
          />
        </div>

        <button type="submit" disabled={loading} style={btnSubmit}>
          {loading ? 'Guardando...' : 'Guardar'}
        </button>

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
      </form>
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 13,
};

const btnSubmit: React.CSSProperties = {
  marginTop: 8,
  padding: '8px 12px',
  borderRadius: 6,
  background: '#000',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
};
