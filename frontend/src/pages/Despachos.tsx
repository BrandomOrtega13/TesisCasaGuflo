import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

type Opcion = { id: string; nombre: string };

type Producto = {
  id: string;
  sku: string;
  nombre: string;
  precio_venta: number;
  precio_mayorista: number;
  precio_caja: number; // por unidad en modo caja
  unidades_por_caja?: number | null;
};

type PrecioTipo = 'NORMAL' | 'MAYORISTA' | 'CAJA' | 'DESCUENTO';

type Detalle = {
  bodega_id: string;           // 👈 NUEVO (bodega por línea)
  producto_id: string;
  cantidad: number;            // unidades
  precio_unitario?: number;
  precio_tipo: PrecioTipo;
  motivo_descuento?: string;
};

const money = (n: number) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(
    Number.isFinite(n) ? n : 0
  );

export default function Despachos() {
  const [bodegas, setBodegas] = useState<Opcion[]>([]);
  const [clientes, setClientes] = useState<Opcion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const defaultDetalle: Detalle = {
    bodega_id: '',
    producto_id: '',
    cantidad: 0,
    precio_tipo: 'NORMAL',
  };

  const [clienteId, setClienteId] = useState('');
  const [observacion, setObservacion] = useState('');
  const [detalles, setDetalles] = useState<Detalle[]>([{ ...defaultDetalle }]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // búsquedas (estilo ingresos: búsqueda general)
  const [searchCliente, setSearchCliente] = useState('');
  const [searchProducto, setSearchProducto] = useState('');
  const [searchBodega, setSearchBodega] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [bodRes, cliRes, prodRes] = await Promise.all([
          api.get('/bodegas'),
          api.get('/clientes'),
          api.get('/productos'),
        ]);

        setBodegas(bodRes.data || []);
        setClientes(cliRes.data || []);
        setProductos(
          (prodRes.data || []).map((p: any) => ({
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

    const tipo = d.precio_tipo;
    const precioBase = getPriceFor(prod, tipo, d.precio_unitario);
    const precio = tipo === 'DESCUENTO' ? d.precio_unitario ?? precioBase : precioBase;

    updateDetalle(i, {
      producto_id,
      precio_unitario: tipo === 'DESCUENTO' ? (d.precio_unitario ?? precioBase) : precio,
    });
  };

  const onChangePrecioTipo = (i: number, precio_tipo: PrecioTipo) => {
    const d = detalles[i];
    const prod = productos.find((p) => p.id === d.producto_id);

    let precio = getPriceFor(prod, precio_tipo, d.precio_unitario);

    if (precio_tipo !== 'DESCUENTO') {
      updateDetalle(i, {
        precio_tipo,
        precio_unitario: precio,
        motivo_descuento: undefined,
      });
    } else {
      if (d.precio_unitario == null) precio = prod?.precio_venta || 0;
      updateDetalle(i, { precio_tipo, precio_unitario: precio });
    }
  };

  const onChangeCantidad = (i: number, value: number) => {
    const n = Number(value);
    updateDetalle(i, { cantidad: Number.isFinite(n) ? n : 0 });
  };

  const addDetalle = () => setDetalles((prev) => [...prev, { ...defaultDetalle }]);
  const removeDetalle = (index: number) => setDetalles((prev) => prev.filter((_, i) => i !== index));

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

  const getLineaTotal = (d: Detalle) => {
    const precio = d.precio_unitario ?? 0;
    if (!precio || !d.cantidad) return 0;
    return d.cantidad * precio;
  };

  // ---- LISTAS FILTRADAS ----
  const bodegasFiltradasBase = bodegas.filter((b) =>
    b.nombre.toLowerCase().includes(searchBodega.toLowerCase())
  );

  const clientesFiltradosBase = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(searchCliente.toLowerCase())
  );
  const selectedCliente = clientes.find((c) => c.id === clienteId);
  const clientesFiltrados = selectedCliente
    ? clientesFiltradosBase.some((c) => c.id === selectedCliente.id)
      ? clientesFiltradosBase
      : [selectedCliente, ...clientesFiltradosBase]
    : clientesFiltradosBase;

  const productosFiltradosBase = productos.filter((p) => {
    const texto = `${p.sku} ${p.nombre}`.toLowerCase();
    return texto.includes(searchProducto.toLowerCase());
  });

  const totalGeneral = useMemo(() => {
    return detalles.reduce((acc, d) => acc + getLineaTotal(d), 0);
  }, [detalles]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      // 1) limpiar líneas válidas
      const limpios = detalles
        .filter((d) => d.bodega_id && d.producto_id && d.cantidad > 0)
        .map((d) => ({
          bodega_id: d.bodega_id,
          producto_id: d.producto_id,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario ?? null,
          precio_tipo: d.precio_tipo || null,
          motivo_descuento: d.precio_tipo === 'DESCUENTO' ? d.motivo_descuento || null : null,
        }));

      if (limpios.length === 0) {
        setMsg('Seleccione bodega y al menos un producto con cantidad > 0');
        setLoading(false);
        return;
      }

      // 2) agrupar por bodega -> se crean varios despachos (sin tocar backend)
      const groups = limpios.reduce<Record<string, any[]>>((acc, d) => {
        (acc[d.bodega_id] ||= []).push(d);
        return acc;
      }, {});

      const bodegasIds = Object.keys(groups);

      // 3) ejecutar 1 POST por bodega (secuencial para que el msg sea claro)
      for (const bodega_id of bodegasIds) {
        const detallesBodega = groups[bodega_id].map(({ bodega_id: _omit, ...rest }) => rest);

        await api.post('/movimientos/despachos', {
          bodega_id,
          cliente_id: clienteId || null,
          observacion,
          detalles: detallesBodega,
        });
      }

      setMsg(
        bodegasIds.length === 1
          ? 'Despacho registrado correctamente'
          : `Despachos registrados correctamente (${bodegasIds.length} bodegas)`
      );

      setDetalles([{ ...defaultDetalle }]);
      setObservacion('');
      setClienteId('');
      setSearchProducto('');
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

  return (
    <div className="page mov-page">
      {/* Header (igual estilo que ingresos: card grande arriba) */}
      <div className="card page-head-card">
        <div className="page-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 className="page-header-title">Despachos</h2>
            <div className="page-subtitle">Registra las salidas de inventario.</div>
          </div>

          <div className="mov-summary">
            <div className="mov-summary-item">
              <div className="mov-summary-label">Total</div>
              <div className="mov-summary-value">{money(totalGeneral)}</div>
            </div>
          </div>
        </div>

        {msg && (
          <p
            className={
              'form-message ' + (msg.includes('Error') ? 'form-message-error' : 'form-message-success')
            }
            style={{ marginTop: 10 }}
          >
            {msg}
          </p>
        )}
      </div>

      {/* Form (mismo look que ingresos) */}
      <div className="form-card-wide">
        <form onSubmit={onSubmit}>
          {/* Cabecera */}
          <div className="form-section">
            <div className="form-section-title">Cabecera</div>

            <div className="grid-2">
              <div className="form-field">
                <label className="form-label">Cliente (opcional)</label>
                <input
                  placeholder="Buscar cliente..."
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                  className="form-input"
                />
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="form-select"
                >
                  <option value="">Sin cliente</option>
                  {clientesFiltrados.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Observación</label>
                <input
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="form-input"
                  placeholder="Ej: venta, pedido, despacho, devolución..."
                />
              </div>
            </div>
          </div>

          {/* Detalle */}
          <div className="form-section">
            <div className="form-section-title">Detalle</div>

            <div className="inline-card" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ marginBottom: 6 }}>
                Buscar producto
              </label>
              <input
                placeholder="SKU o nombre..."
                value={searchProducto}
                onChange={(e) => setSearchProducto(e.target.value)}
                className="form-input"
              />
            </div>

            {/* filtro bodega (opcional) para lista más corta */}
            <div className="inline-card" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ marginBottom: 6 }}>
                Buscar bodega
              </label>
              <input
                placeholder="Nombre de bodega..."
                value={searchBodega}
                onChange={(e) => setSearchBodega(e.target.value)}
                className="form-input"
              />
              <div className="mov-hint">La bodega se selecciona por cada línea.</div>
            </div>

            {detalles.map((d, i) => {
              const prod = productos.find((p) => p.id === d.producto_id);
              const upc = prod?.unidades_por_caja || 0;

              const opcionesProducto = (() => {
                const base = [...productosFiltradosBase];
                const seleccionado = productos.find((p) => p.id === d.producto_id);
                if (seleccionado && !base.some((p) => p.id === seleccionado.id)) {
                  return [seleccionado, ...base];
                }
                return base;
              })();

              const totalLinea = getLineaTotal(d);

              let cajasEq = 0;
              let restoEq = 0;
              if (d.precio_tipo === 'CAJA' && upc > 0 && d.cantidad > 0) {
                cajasEq = Math.floor(d.cantidad / upc);
                restoEq = d.cantidad % upc;
              }

              return (
                <div key={i} className="inline-card" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>
                      Línea #{i + 1}
                      {prod ? <span style={{ fontWeight: 700, color: '#64748b' }}> · {prod.sku} — {prod.nombre}</span> : null}
                    </div>

                    {detalles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDetalle(i)}
                        className="btn-icon-danger"
                        title="Quitar línea"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="grid-2" style={{ marginTop: 12 }}>
                    <div className="form-field">
                      <label className="form-label">Bodega</label>
                      <select
                        value={d.bodega_id}
                        onChange={(e) => updateDetalle(i, { bodega_id: e.target.value })}
                        required
                        className="form-select"
                      >
                        <option value="">Seleccione bodega</option>
                        {bodegasFiltradasBase.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Producto</label>
                      <select
                        value={d.producto_id}
                        onChange={(e) => onChangeProducto(i, e.target.value)}
                        required
                        className="form-select"
                      >
                        <option value="">Seleccione producto</option>
                        {opcionesProducto.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid-2" style={{ marginTop: 12 }}>
                    <div className="form-field">
                      <label className="form-label">Tipo de precio</label>
                      <select
                        value={d.precio_tipo}
                        onChange={(e) => onChangePrecioTipo(i, e.target.value as PrecioTipo)}
                        className="form-select"
                      >
                        <option value="NORMAL">Venta</option>
                        <option value="MAYORISTA">Mayorista</option>
                        <option value="CAJA">Caja</option>
                        <option value="DESCUENTO">Descuento</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Cantidad (unidades)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={d.cantidad || ''}
                        onChange={(e) => onChangeCantidad(i, Number(e.target.value))}
                        className="form-input"
                        min={0}
                      />

                      {d.precio_tipo === 'CAJA' && upc > 0 && (
                        <div className="mov-hint">
                          1 caja = <strong>{upc}</strong> unidades
                          {d.cantidad > 0 && (
                            <>
                              <br />
                              Equivale a <strong>{cajasEq}</strong> caja(s)
                              {restoEq > 0 ? ` + ${restoEq} unidad(es)` : ''}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid-2" style={{ marginTop: 12 }}>
                    <div className="form-field">
                      <label className="form-label">Precio unitario ({tipoBadge(d.precio_tipo)})</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={d.precio_unitario ?? ''}
                        onChange={(e) => {
                          if (isReadOnlyPrice(d.precio_tipo)) return;
                          updateDetalle(i, { precio_unitario: Number(e.target.value) || 0 });
                        }}
                        className="form-input"
                        readOnly={isReadOnlyPrice(d.precio_tipo)}
                      />
                    </div>

                    <div className="mov-line-total" style={{ alignSelf: 'end' }}>
                      <div className="mov-line-total-label">Total línea</div>
                      <div className="mov-line-total-value">{money(totalLinea)}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div className="form-field">
                      <label className="form-label">Motivo descuento (opcional)</label>
                      <input
                        placeholder="Solo si usas DESCUENTO"
                        value={d.motivo_descuento ?? ''}
                        onChange={(e) => updateDetalle(i, { motivo_descuento: e.target.value })}
                        className="form-input"
                        readOnly={d.precio_tipo !== 'DESCUENTO'}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="actions-bar">
              <button type="button" onClick={addDetalle} className="btn-secondary">
                + Agregar línea
              </button>
            </div>
          </div>

          {/* Acciones */}
          <div className="actions-bar">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Guardando...' : 'Registrar despacho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
