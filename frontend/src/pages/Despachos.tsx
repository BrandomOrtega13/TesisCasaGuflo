import { useEffect, useMemo, useState } from 'react';
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
  cantidad: number; // unidades
  precio_unitario?: number;
  precio_tipo: PrecioTipo;
  motivo_descuento?: string;
  cajas?: number;
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
    producto_id: '',
    cantidad: 0,
    precio_tipo: 'NORMAL',
  };

  const [bodegaId, setBodegaId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [observacion, setObservacion] = useState('');
  const [detalles, setDetalles] = useState<Detalle[]>([{ ...defaultDetalle }]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // búsqueda
  const [searchBodega, setSearchBodega] = useState('');
  const [searchCliente, setSearchCliente] = useState('');
  const [searchProducto, setSearchProducto] = useState('');

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

  const getPriceFor = (
    prod: Producto | undefined,
    tipo: PrecioTipo,
    fallback?: number
  ) => {
    if (!prod) return fallback ?? 0;

    if (tipo === 'NORMAL') return prod.precio_venta || 0;

    if (tipo === 'MAYORISTA') {
      return prod.precio_mayorista || prod.precio_venta || 0;
    }

    if (tipo === 'CAJA') {
      // precio_caja es precio por unidad (modo caja)
      return prod.precio_caja || 0;
    }

    // DESCUENTO
    return fallback ?? (prod.precio_venta || 0);
  };

  const updateDetalle = (index: number, patch: Partial<Detalle>) => {
    setDetalles((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d))
    );
  };

  const onChangeProducto = (i: number, producto_id: string) => {
    const d = detalles[i];
    const prod = productos.find((p) => p.id === producto_id);

    const tipo = d.precio_tipo;
    const precioBase = getPriceFor(prod, tipo, d.precio_unitario);
    const precio =
      tipo === 'DESCUENTO' ? d.precio_unitario ?? precioBase : precioBase;

    updateDetalle(i, {
      producto_id,
      precio_tipo: tipo,
      precio_unitario: tipo === 'DESCUENTO' ? d.precio_unitario : precio,
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
        cajas: undefined,
        motivo_descuento: undefined,
      });
    } else {
      if (d.precio_unitario == null) {
        precio = prod?.precio_venta || 0;
      }
      updateDetalle(i, {
        precio_tipo,
        precio_unitario: precio,
        cajas: undefined,
      });
    }
  };

  const onChangeCantidad = (i: number, value: number) => {
    const n = Number(value);
    const cantidad = Number.isFinite(n) ? n : 0;
    updateDetalle(i, { cantidad });
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
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario ?? null,
          precio_tipo: d.precio_tipo || null,
          motivo_descuento:
            d.precio_tipo === 'DESCUENTO' ? d.motivo_descuento || null : null,
        }));

      if (!bodegaId || limpios.length === 0) {
        setMsg('Seleccione bodega y al menos un producto con cantidad > 0');
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

  const getLineaTotal = (d: Detalle) => {
    const precio = d.precio_unitario ?? 0;
    if (!precio) return 0;
    return d.cantidad * precio;
  };

  // ---- LISTAS FILTRADAS ----
  const bodegasFiltradasBase = bodegas.filter((b) =>
    b.nombre.toLowerCase().includes(searchBodega.toLowerCase())
  );
  const selectedBodega = bodegas.find((b) => b.id === bodegaId);
  const bodegasFiltradas = selectedBodega
    ? bodegasFiltradasBase.some((b) => b.id === selectedBodega.id)
      ? bodegasFiltradasBase
      : [selectedBodega, ...bodegasFiltradasBase]
    : bodegasFiltradasBase;

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

  // total general (UI)
  const totalGeneral = useMemo(() => {
    return detalles.reduce((acc, d) => acc + getLineaTotal(d), 0);
  }, [detalles]);

  return (
    <div className="mov-page">
      {/* HEADER */}
      <div className="mov-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2>Despachos</h2>
            <p>Registra salidas de inventario y calcula totales por línea.</p>
          </div>

          <div style={{ textAlign: 'right', minWidth: 160 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>
              {money(totalGeneral)}
            </div>
          </div>
        </div>

        {msg && (
          <p
            className={
              'form-message ' +
              (msg.includes('Error')
                ? 'form-message-error'
                : 'form-message-success')
            }
            style={{ marginTop: 12 }}
          >
            {msg}
          </p>
        )}
      </div>

      {/* FORM */}
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

            {/* Cliente */}
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
                className="form-input"
              >
                <option value="">Sin cliente</option>
                {clientesFiltrados.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
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
                placeholder="Ej: venta, pedido, despacho, devolución..."
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
            const prod = productos.find((p) => p.id === d.producto_id);
            const upc = prod?.unidades_por_caja || 0;

            const opcionesProducto = (() => {
              const base = [...productosFiltradosBase];
              const sel = productos.find((p) => p.id === d.producto_id);
              if (sel && !base.some((p) => p.id === sel.id)) return [sel, ...base];
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
                <div className="mov-grid-2">
                  {/* Producto */}
                  <div className="form-field">
                    <label className="form-label">Producto</label>
                    <select
                      value={d.producto_id}
                      onChange={(e) => onChangeProducto(i, e.target.value)}
                      required
                      className="form-input"
                    >
                      <option value="">Seleccione producto</option>
                      {opcionesProducto.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tipo precio */}
                  <div className="form-field">
                    <label className="form-label">Tipo</label>
                    <select
                      value={d.precio_tipo}
                      onChange={(e) =>
                        onChangePrecioTipo(i, e.target.value as PrecioTipo)
                      }
                      className="form-input"
                    >
                      <option value="NORMAL">Venta</option>
                      <option value="MAYORISTA">Mayorista</option>
                      <option value="CAJA">Caja</option>
                      <option value="DESCUENTO">Descuento</option>
                    </select>
                  </div>
                </div>

                {/* Cantidad / Precio / Total */}
                <div className="mov-grid-2" style={{ marginTop: 12 }}>
                  <div className="form-field">
                    <label className="form-label">Cantidad (unidades)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={d.cantidad || ''}
                      onChange={(e) =>
                        onChangeCantidad(i, Number(e.target.value))
                      }
                      className="form-input"
                      min={0}
                    />

                    {d.precio_tipo === 'CAJA' && upc > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                        1 caja = {upc} unidades
                        {d.cantidad > 0 && (
                          <>
                            <br />
                            Equivale a {cajasEq} caja(s)
                            {restoEq > 0 ? ` + ${restoEq} unidad(es)` : ''}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      Precio unitario ({tipoBadge(d.precio_tipo)})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={d.precio_unitario ?? ''}
                      onChange={(e) => {
                        if (isReadOnlyPrice(d.precio_tipo)) return;
                        updateDetalle(i, {
                          precio_unitario: Number(e.target.value) || 0,
                        });
                      }}
                      className="form-input"
                      readOnly={isReadOnlyPrice(d.precio_tipo)}
                    />
                  </div>
                </div>

                <div className="mov-grid-2" style={{ marginTop: 12 }}>
                  <div className="form-field">
                    <label className="form-label">Total línea</label>
                    <input
                      readOnly
                      value={totalLinea ? totalLinea.toFixed(2) : ''}
                      placeholder="0.00"
                      className="form-input"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Motivo desc. (opcional)</label>
                    <input
                      placeholder="Solo si usas DESCUENTO"
                      value={d.motivo_descuento ?? ''}
                      onChange={(e) =>
                        updateDetalle(i, { motivo_descuento: e.target.value })
                      }
                      className="form-input"
                      readOnly={d.precio_tipo !== 'DESCUENTO'}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Línea #{i + 1}
                  </div>

                  {detalles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDetalle(i)}
                      className="btn-secondary"
                    >
                      Quitar línea
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <button type="button" onClick={addDetalle} className="btn-secondary">
            + Agregar línea
          </button>
        </div>

        {/* ACCIONES */}
        <div className="mov-actions">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : 'Registrar despacho'}
          </button>
        </div>
      </form>
    </div>
  );
}
