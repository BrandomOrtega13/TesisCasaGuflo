import { useEffect, useState, type ReactNode } from 'react';
import api from '../lib/api';

type BodegaStock = {
  id: string;
  bodega: string;
  cantidad: number | string | null;
};

type ProductoDetalle = {
  id: string;
  sku: string;
  nombre: string;
  categoria?: string | null;
  proveedor?: string | null;

  precio_compra?: any;
  precio_venta?: any;
  precio_mayorista?: any;
  precio_caja?: any;

  stock_total?: any;
  unidades_por_caja?: any;

  bodegas?: BodegaStock[];
};

function formatMoney(v: any): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `$ ${n.toFixed(2)}`;
}

export default function ProductDetailModal({
  open,
  productId,
  onClose,
}: {
  open: boolean;
  productId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<ProductoDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !productId) return;

    const load = async () => {
      setLoading(true);
      setMsg(null);
      try {
        const r = await api.get(`/productos/${productId}`);
        setData(r.data);
      } catch (err: any) {
        console.error(err);
        setMsg('Error al cargar producto');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, productId]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  if (loading) {
    return (
      <div className="modal-overlay" onMouseDown={onClose}>
        <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-title">Detalles del producto</div>
            <button type="button" className="modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <p className="list-message">Cargando producto...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="modal-overlay" onMouseDown={onClose}>
        <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-title">Detalles del producto</div>
            <button type="button" className="modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <p className="list-message list-message-error">
              {msg || 'Error al cargar producto.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const stock = Number(data.stock_total ?? 0);
  const udsCaja = Number(data.unidades_por_caja ?? 0);

  const cajas = udsCaja > 0 ? Math.floor(stock / udsCaja) : null;
  const sueltas = udsCaja > 0 ? stock % udsCaja : null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Detalles del producto</div>

          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Cerrar"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <Row label="SKU" value={data.sku} />
            <Row label="Nombre" value={data.nombre} />
            <Row label="Categoría" value={data.categoria || '—'} />
            <Row label="Proveedor" value={data.proveedor || '—'} />

            <Row label="Stock total (unidades)" value={String(stock)} />
            <Row label="Unidades por caja" value={udsCaja ? String(udsCaja) : '—'} />

            {udsCaja > 0 && (
              <Row
                label="Cajas disponibles"
                value={`${cajas ?? 0} cajas${sueltas != null && sueltas > 0 ? ` + ${sueltas} sueltas` : ''}`}
              />
            )}

            <hr />

            <h3 className="form-title">Stock por bodega</h3>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header-cell">Bodega</th>
                    <th className="table-header-cell">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bodegas?.map((b) => {
                    const cantidadNum = Number(b.cantidad ?? 0);
                    const cantidadFinal = Number.isFinite(cantidadNum) ? cantidadNum.toFixed(0) : '0';

                    return (
                      <tr key={b.id} className="table-row">
                        <td className="table-cell">{b.bodega}</td>
                        <td className="table-cell">
                          <strong>{cantidadFinal}</strong>
                        </td>
                      </tr>
                    );
                  })}

                  {(!data.bodegas || data.bodegas.length === 0) && (
                    <tr className="table-row">
                      <td className="table-cell table-cell-empty" colSpan={2}>
                        No hay stock por bodega registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <hr />

            <Row label="Precio compra" value={formatMoney(data.precio_compra)} />
            <Row label="Precio unitario" value={formatMoney(data.precio_venta)} />
            <Row label="Precio mayorista" value={formatMoney(data.precio_mayorista)} />
            <Row label="Precio por caja" value={formatMoney(data.precio_caja)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="form-row">
      <div className="form-label">{label}</div>
      <div>{value}</div>
    </div>
  );
}
