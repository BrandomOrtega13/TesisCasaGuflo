import { useEffect, useState } from 'react';
import api from '../lib/api';

type Opcion = { id: string; nombre: string };
type Producto = { id: string; sku: string; nombre: string };

type Detalle = {
  producto_id: string;
  cantidad: number;
  precio_unitario?: number;
};

export default function Despachos() {
  const [bodegas, setBodegas] = useState<Opcion[]>([]);
  const [clientes, setClientes] = useState<Opcion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [bodegaId, setBodegaId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [observacion, setObservacion] = useState('');
  const [detalles, setDetalles] = useState<Detalle[]>([
    { producto_id: '', cantidad: 1 },
  ]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // cargar catálogos
  useEffect(() => {
    const load = async () => {
      try {
        const [bodRes, cliRes, prodRes] = await Promise.all([
          api.get('/bodegas'),
          api.get('/clientes'),
          api.get('/productos'),
        ]);

        setBodegas(bodRes.data);
        setClientes(cliRes.data);
        setProductos(
          prodRes.data.map((p: any) => ({
            id: p.id,
            sku: p.sku,
            nombre: p.nombre,
          }))
        );
      } catch (err) {
        console.error('Error cargando catálogos', err);
      }
    };
    load();
  }, []);

  const updateDetalle = (index: number, field: keyof Detalle, value: any) => {
    setDetalles((prev) =>
      prev.map((d, i) =>
        i === index
          ? {
              ...d,
              [field]:
                field === 'cantidad' || field === 'precio_unitario'
                  ? Number(value)
                  : value,
            }
          : d
      )
    );
  };

  const addDetalle = () => {
    setDetalles((prev) => [...prev, { producto_id: '', cantidad: 1 }]);
  };

  const removeDetalle = (index: number) => {
    setDetalles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const limpios = detalles.filter(
        (d) => d.producto_id && d.cantidad > 0
      );

      if (!bodegaId || limpios.length === 0) {
        setMsg('Seleccione bodega y al menos un producto');
        setLoading(false);
        return;
      }

      await api.post('/movimientos/despachos', {
        bodega_id: bodegaId,
        cliente_id: clienteId || null,
        observacion,
        detalles: limpios,
      });

      setMsg('Despacho registrado correctamente');
      setDetalles([{ producto_id: '', cantidad: 1 }]);
      setObservacion('');
    } catch (err: any) {
      console.error(err);
      const msgServer =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Error al registrar despacho';
      setMsg(msgServer);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Despachos</h2>

      <form
        onSubmit={onSubmit}
        style={{ display: 'grid', gap: 12, marginTop: 16, maxWidth: 800 }}
      >
        <div>
          <label>Bodega</label>
          <select
            value={bodegaId}
            onChange={(e) => setBodegaId(e.target.value)}
            required
            style={input}
          >
            <option value="">Seleccione bodega</option>
            {bodegas.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Cliente (opcional)</label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            style={input}
          >
            <option value="">Sin cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Observación</label>
          <input
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            style={input}
          />
        </div>

        <div>
          <h4>Detalle de productos</h4>
          {detalles.map((d, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '3fr 1fr 1fr auto',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <select
                value={d.producto_id}
                onChange={(e) =>
                  updateDetalle(i, 'producto_id', e.target.value)
                }
                required
                style={input}
              >
                <option value="">Seleccione producto</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.nombre}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                placeholder="Cant."
                value={d.cantidad}
                onChange={(e) =>
                  updateDetalle(i, 'cantidad', e.target.value)
                }
                required
                style={input}
              />

              <input
                type="number"
                step="0.01"
                placeholder="Precio unit."
                value={d.precio_unitario ?? ''}
                onChange={(e) =>
                  updateDetalle(i, 'precio_unitario', e.target.value)
                }
                style={input}
              />

              {detalles.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDetalle(i)}
                  style={btnDel}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button type="button" onClick={addDetalle} style={btnAdd}>
            + Agregar línea
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={btnSubmit}
        >
          {loading ? 'Guardando...' : 'Registrar despacho'}
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
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 13,
};

const btnAdd: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  background: '#f8fafc',
  fontSize: 12,
  cursor: 'pointer',
};

const btnDel: React.CSSProperties = {
  padding: '4px 6px',
  borderRadius: 6,
  border: 'none',
  background: '#fee2e2',
  cursor: 'pointer',
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
