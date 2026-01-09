import { useEffect, useState } from 'react';
import api from '../lib/api';

type Opcion = { id: string; nombre: string };
type Producto = { id: string; sku: string; nombre: string };

type Detalle = {
  producto_id: string;
  cantidad: number;
};

export default function Ingresos() {
  const [bodegas, setBodegas] = useState<Opcion[]>([]);
  const [proveedores, setProveedores] = useState<Opcion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [bodegaId, setBodegaId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [observacion, setObservacion] = useState('');
  const [detalles, setDetalles] = useState<Detalle[]>([
    { producto_id: '', cantidad: 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // búsqueda
  const [searchBodega, setSearchBodega] = useState('');
  const [searchProveedor, setSearchProveedor] = useState('');
  const [searchProducto, setSearchProducto] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [bodRes, provRes, prodRes] = await Promise.all([
          api.get('/bodegas'),
          api.get('/proveedores'),
          api.get('/productos'),
        ]);
        setBodegas(bodRes.data);
        setProveedores(provRes.data);
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
              [field]: Number.isNaN(Number(value)) ? value : Number(value),
            }
          : d
      )
    );
  };

  const addDetalle = () =>
    setDetalles((prev) => [...prev, { producto_id: '', cantidad: 0 }]);

  const removeDetalle = (index: number) =>
    setDetalles((prev) => prev.filter((_, i) => i !== index));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const limpios = detalles.filter((d) => d.producto_id && d.cantidad > 0);
      if (!bodegaId || limpios.length === 0) {
        setMsg('Seleccione bodega y al menos un producto con cantidad > 0');
        setLoading(false);
        return;
      }

      await api.post('/movimientos/ingresos', {
        bodega_id: bodegaId,
        proveedor_id: proveedorId || null,
        observacion,
        detalles: limpios,
      });

      setMsg('Ingreso registrado correctamente');
      setDetalles([{ producto_id: '', cantidad: 0 }]);
      setObservacion('');
    } catch (err) {
      console.error(err);
      setMsg('Error al registrar ingreso');
    } finally {
      setLoading(false);
    }
  };

  // ---- LISTAS FILTRADAS (manteniendo el seleccionado) ----

  const bodegasFiltradasBase = bodegas.filter((b) =>
    b.nombre.toLowerCase().includes(searchBodega.toLowerCase())
  );
  const selectedBodega = bodegas.find((b) => b.id === bodegaId);
  const bodegasFiltradas = selectedBodega
    ? bodegasFiltradasBase.some((b) => b.id === selectedBodega.id)
      ? bodegasFiltradasBase
      : [selectedBodega, ...bodegasFiltradasBase]
    : bodegasFiltradasBase;

  const proveedoresFiltradosBase = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(searchProveedor.toLowerCase())
  );
  const selectedProveedor = proveedores.find((p) => p.id === proveedorId);
  const proveedoresFiltrados = selectedProveedor
    ? proveedoresFiltradosBase.some((p) => p.id === selectedProveedor.id)
      ? proveedoresFiltradosBase
      : [selectedProveedor, ...proveedoresFiltradosBase]
    : proveedoresFiltradosBase;

  const productosFiltradosBase = productos.filter((p) => {
    const texto = `${p.sku} ${p.nombre}`.toLowerCase();
    return texto.includes(searchProducto.toLowerCase());
  });

  return (
  <div className="mov-page">
    {/* HEADER */}
    <div className="mov-header">
      <h2>Ingresos</h2>
      <p>Registra entradas de inventario por bodega y proveedor.</p>
    </div>

    <form onSubmit={onSubmit} className="mov-card">
      {/* CABECERA */}
      <div className="mov-section">
        <div className="mov-section-title">Cabecera</div>

        <div className="mov-grid-2">
          {/* Bodega */}
          <div className="form-field">
            <label className="form-label">Bodega</label>
            <input
              placeholder="Buscar bodega..."
              value={searchBodega}
              onChange={(e) => setSearchBodega(e.target.value)}
              className="form-input"
            />
            <select
              value={bodegaId}
              onChange={(e) => setBodegaId(e.target.value)}
              required
              className="form-input"
            >
              <option value="">Seleccione bodega</option>
              {bodegasFiltradas.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Proveedor */}
          <div className="form-field">
            <label className="form-label">Proveedor (opcional)</label>
            <input
              placeholder="Buscar proveedor..."
              value={searchProveedor}
              onChange={(e) => setSearchProveedor(e.target.value)}
              className="form-input"
            />
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="form-input"
            >
              <option value="">Sin proveedor</option>
              {proveedoresFiltrados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mov-grid-1">
          <div className="form-field">
            <label className="form-label">Observación</label>
            <input
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="form-input"
              placeholder="Ej: ingreso por compra, reposición..."
            />
          </div>
        </div>
      </div>

      {/* DETALLE */}
      <div className="mov-section">
        <div className="mov-section-title">Detalle</div>

        <input
          placeholder="Buscar producto (SKU o nombre)..."
          value={searchProducto}
          onChange={(e) => setSearchProducto(e.target.value)}
          className="form-input mov-detail-search"
        />

        {detalles.map((d, i) => {
          const opciones = (() => {
            const base = [...productosFiltradosBase];
            const sel = productos.find((p) => p.id === d.producto_id);
            if (sel && !base.some((p) => p.id === sel.id)) {
              return [sel, ...base];
            }
            return base;
          })();

          return (
            <div key={i} className="mov-detail-row">
              <select
                value={d.producto_id}
                onChange={(e) =>
                  updateDetalle(i, 'producto_id', e.target.value)
                }
                required
                className="form-input"
              >
                <option value="">Seleccione producto</option>
                {opciones.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.nombre}
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Cantidad"
                value={d.cantidad || ''}
                onChange={(e) =>
                  updateDetalle(i, 'cantidad', e.target.value)
                }
                className="form-input"
              />

              {detalles.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDetalle(i)}
                  className="btn-icon-danger"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addDetalle}
          className="btn-secondary"
        >
          + Agregar línea
        </button>
      </div>

      {/* ACCIONES */}
      <div className="mov-actions">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Guardando...' : 'Registrar ingreso'}
        </button>
      </div>

      {msg && (
        <p
          className={
            'form-message ' +
            (msg.includes('Error')
              ? 'form-message-error'
              : 'form-message-success')
          }
        >
          {msg}
        </p>
      )}
    </form>
  </div>
);

}
