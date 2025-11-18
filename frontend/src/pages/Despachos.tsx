import { useEffect, useState } from 'react';
import api from '../lib/api';

type Opcion = { id: string; nombre: string };

type Producto = {
  id: string;
  sku: string;
  nombre: string;
  precio_venta: number;
  precio_mayorista: number;
  precio_caja: number;
  unidades_por_caja?: number | null;
};

type PrecioTipo = 'NORMAL' | 'MAYORISTA' | 'CAJA' | 'DESCUENTO';

type Detalle = {
  producto_id: string;
  cantidad: number;            // SIEMPRE en unidades
  precio_unitario?: number;    // precio por unidad o por caja (según tipo)
  precio_tipo: PrecioTipo;
  motivo_descuento?: string;
  cajas?: number;              // solo UI cuando es CAJA
};

export default function Despachos() {
  const [bodegas, setBodegas] = useState<Opcion[]>([]);
  const [clientes, setClientes] = useState<Opcion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const defaultDetalle: Detalle = { producto_id: '', cantidad: 1, precio_tipo: 'NORMAL' };

  const [bodegaId, setBodegaId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [observacion, setObservacion] = useState('');
  const [detalles, setDetalles] = useState<Detalle[]>([{ ...defaultDetalle }]);

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
            precio_venta: p.precio_venta ?? 0,
            precio_mayorista: p.precio_mayorista ?? 0,
            precio_caja: p.precio_caja ?? 0,
            unidades_por_caja: p.unidades_por_caja ?? null,
          }))
        );
      } catch (err) {
        console.error('Error cargando catálogos', err);
      }
    };
    load();
  }, []);

  // precio base según tipo
  const getPriceFor = (prod: Producto | undefined, tipo: PrecioTipo, fallback?: number) => {
    if (!prod) return fallback ?? 0;
    if (tipo === 'NORMAL') return prod.precio_venta || 0;
    if (tipo === 'MAYORISTA') return prod.precio_mayorista || prod.precio_venta || 0;
    if (tipo === 'CAJA') return prod.precio_caja || 0;
    // DESCUENTO
    return fallback ?? (prod.precio_venta || 0);
  };

  const updateDetalle = (index: number, patch: Partial<Detalle>) => {
    setDetalles((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const onChangeProducto = (i: number, producto_id: string) => {
    const d = detalles[i];
    const prod = productos.find((p) => p.id === producto_id);

    // ¿este producto soporta CAJA?
    const hasCaja =
      !!prod &&
      !!prod.unidades_por_caja &&
      prod.unidades_por_caja > 0 &&
      !!prod.precio_caja &&
      prod.precio_caja > 0;

    let tipo = d.precio_tipo;
    if (tipo === 'CAJA' && !hasCaja) {
      // si estaba en CAJA pero el nuevo producto no soporta caja, bajamos a NORMAL
      tipo = 'NORMAL';
    }

    const precioBase = getPriceFor(prod, tipo, d.precio_unitario);
    const precio = tipo === 'DESCUENTO'
      ? (d.precio_unitario ?? precioBase)
      : precioBase;

    updateDetalle(i, {
      producto_id,
      precio_tipo: tipo,
      precio_unitario: precio,
    });
  };

  const onChangePrecioTipo = (i: number, precio_tipo: PrecioTipo) => {
    const d = detalles[i];
    const prod = productos.find((p) => p.id === d.producto_id);
    let precio = getPriceFor(prod, precio_tipo, d.precio_unitario);
    let cantidad = d.cantidad;
    let cajas: number | undefined = d.cajas ?? 1;

    if (precio_tipo === 'CAJA') {
      const upc = prod?.unidades_por_caja || 1;
      cantidad = (cajas ?? 1) * upc; // cantidad en unidades
    } else {
      cajas = undefined;
    }

    if (precio_tipo !== 'DESCUENTO') {
      // precio fijo, no editable
      updateDetalle(i, {
        precio_tipo,
        precio_unitario: precio,
        cantidad,
        cajas,
        motivo_descuento: undefined,
      });
    } else {
      // descuento: editable, si no hay precio ponemos precio venta como base
      if (d.precio_unitario == null) precio = prod?.precio_venta || 0;
      updateDetalle(i, {
        precio_tipo,
        precio_unitario: precio,
        cantidad,
        cajas,
      });
    }
  };

  const onChangeCantidad = (i: number, value: number) => {
    const d = detalles[i];
    if (d.precio_tipo === 'CAJA') {
      // en CAJA se maneja por cajas, no por unidades
      return;
    }
    const cantidad = Math.max(1, Number(value) || 1);
    updateDetalle(i, { cantidad });
  };

  const onChangeCajas = (i: number, value: number) => {
    const d = detalles[i];
    const prod = productos.find((p) => p.id === d.producto_id);
    const upc = prod?.unidades_por_caja || 1;
    const cajas = Math.max(1, Number(value) || 1);
    updateDetalle(i, {
      cajas,
      cantidad: cajas * upc, // cantidad en unidades
    });
  };

  const addDetalle = () =>
    setDetalles((prev) => [...prev, { ...defaultDetalle }]);

  const removeDetalle = (index: number) =>
    setDetalles((prev) => prev.filter((_, i) => i !== index));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const limpios = detalles
        .filter((d) => d.producto_id && d.cantidad > 0)
        .map((d) => ({
          producto_id: d.producto_id,
          cantidad: d.cantidad, // en unidades
          precio_unitario: d.precio_unitario ?? null,
          precio_tipo: d.precio_tipo || null,
          motivo_descuento: d.precio_tipo === 'DESCUENTO' ? (d.motivo_descuento || null) : null,
        }));

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
      setDetalles([{ ...defaultDetalle }]);
      setObservacion('');
    } catch (err: any) {
      console.error(err);
      const m =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Error al registrar despacho';
      setMsg(m);
    } finally {
      setLoading(false);
    }
  };

  const isReadOnlyPrice = (tipo: PrecioTipo) => tipo !== 'DESCUENTO';

  const tipoBadge = (tipo: PrecioTipo) => {
    const map: Record<PrecioTipo, string> = {
      NORMAL: 'Venta',
      MAYORISTA: 'Mayorista',
      CAJA: 'Caja',
      DESCUENTO: 'Descuento',
    };
    return map[tipo];
  };

  // total de una línea
  const getLineaTotal = (d: Detalle) => {
    const precio = d.precio_unitario ?? 0;
    if (!precio) return 0;
    if (d.precio_tipo === 'CAJA') {
      // total = cajas * precio_caja
      return (d.cajas ?? 0) * precio;
    }
    // otros: total = cantidad * precio_unitario
    return d.cantidad * precio;
  };

  return (
    <div>
      <h2>Despachos</h2>

      <form
        onSubmit={onSubmit}
        style={{ display: 'grid', gap: 12, marginTop: 16, maxWidth: 1000 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
          <h4>Detalle</h4>
          {detalles.map((d, i) => {
            const prod = productos.find((p) => p.id === d.producto_id);
            const upc = prod?.unidades_por_caja || 1;
            const hasCaja =
              !!prod &&
              !!prod.unidades_por_caja &&
              prod.unidades_por_caja > 0 &&
              !!prod.precio_caja &&
              prod.precio_caja > 0;

            const totalLinea = getLineaTotal(d);

            return (
              <div key={i} style={row}>
                {/* Producto */}
                <select
                  value={d.producto_id}
                  onChange={(e) => onChangeProducto(i, e.target.value)}
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

                {/* Tipo de precio */}
                <select
                  value={d.precio_tipo}
                  onChange={(e) =>
                    onChangePrecioTipo(i, e.target.value as PrecioTipo)
                  }
                  style={input}
                >
                  <option value="NORMAL">Venta</option>
                  <option value="MAYORISTA">Mayorista</option>
                  <option value="CAJA" disabled={!hasCaja}>
                    Caja
                  </option>
                  <option value="DESCUENTO">Descuento</option>
                </select>

                {/* Cantidad / Cajas */}
                {d.precio_tipo === 'CAJA' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input
                      type="number"
                      min={1}
                      placeholder="Cajas"
                      value={d.cajas ?? 1}
                      onChange={(e) => onChangeCajas(i, Number(e.target.value))}
                      style={input}
                    />
                    {prod && upc > 0 && (
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        1 caja = {upc} unidades
                      </span>
                    )}
                  </div>
                ) : (
                  <input
                    type="number"
                    min={1}
                    placeholder="Cantidad (unidades)"
                    value={d.cantidad}
                    onChange={(e) =>
                      onChangeCantidad(i, Number(e.target.value))
                    }
                    style={input}
                  />
                )}

                {/* Precio (por unidad o por caja) */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Precio"
                    value={d.precio_unitario ?? ''}
                    onChange={(e) => {
                      if (isReadOnlyPrice(d.precio_tipo)) return;
                      updateDetalle(i, {
                        precio_unitario: Number(e.target.value) || 0,
                      });
                    }}
                    style={input}
                    readOnly={isReadOnlyPrice(d.precio_tipo)}
                  />
                  <span style={chip}>{tipoBadge(d.precio_tipo)}</span>
                </div>

                {/* Total de la línea */}
                <input
                  readOnly
                  value={totalLinea ? totalLinea.toFixed(2) : ''}
                  placeholder="Total"
                  style={input}
                />

                {/* Motivo descuento (solo en DESCUENTO) */}
                <input
                  placeholder="Motivo desc. (opcional)"
                  value={d.motivo_descuento ?? ''}
                  onChange={(e) =>
                    updateDetalle(i, { motivo_descuento: e.target.value })
                  }
                  style={input}
                  readOnly={d.precio_tipo !== 'DESCUENTO'}
                />

                {/* Quitar línea */}
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
            );
          })}

          <button type="button" onClick={addDetalle} style={btnAdd}>
            + Agregar línea
          </button>
        </div>

        <button type="submit" disabled={loading} style={btnSubmit}>
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

const row: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2.5fr 1.4fr 1.4fr 1.6fr 1.6fr 2fr auto',
  gap: 8,
  marginBottom: 6,
  alignItems: 'center',
};

const chip: React.CSSProperties = {
  fontSize: 11,
  background: '#e2e8f0',
  borderRadius: 999,
  padding: '2px 8px',
  border: '1px solid #cbd5e1',
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
