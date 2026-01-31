import { useEffect, useState } from "react";
import api from "../lib/api";
import ProductDetailModal from "../components/ProductDetailModal";
import ProductFormModal from "../components/ProductFormModal";

type Producto = {
  id: string;
  sku: string;
  nombre: string;
  categoria?: string | null;
  categoria_id?: string | null;
  proveedor?: string | null;
  stock_total?: number | string | null;
  stock?: number | string | null;
  cantidad?: number | string | null;
  unidades_por_caja?: number | string | null;
  uds_caja?: number | string | null;
  activo?: boolean;
};

export default function ProductsList() {
  const [activos, setActivos] = useState<Producto[]>([]);
  const [inactivos, setInactivos] = useState<Producto[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  // === modal detalle ===
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailId(null);
  };

  // === modal form (nuevo / editar) ===
  const [formOpen, setFormOpen] = useState(false);
  const [formId, setFormId] = useState<string | null>(null); // null => nuevo

  const openNew = () => {
    setFormId(null);
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    setFormId(id);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormId(null);
  };

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [aRes, iRes] = await Promise.all([
        api.get("/productos"),
        api.get("/productos/inactivos"),
      ]);

      setActivos(aRes.data);
      setInactivos(iRes.data);
    } catch (err: any) {
      console.error(err);
      const m = err.response?.data?.message || "Error al cargar productos";
      setMsg(m);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDeactivate = async (id: string) => {
    if (!window.confirm("¿Desactivar este producto?")) return;
    try {
      await api.delete(`/productos/${id}`);
      load();
    } catch (err) {
      console.error(err);
      setMsg("Error al desactivar producto");
    }
  };

  const onReactivate = async (id: string) => {
    try {
      await api.put(`/productos/${id}/reactivar`);
      load();
    } catch (err) {
      console.error(err);
      setMsg("Error al reactivar producto");
    }
  };

  const onHardDelete = async (id: string) => {
    if (
      !window.confirm(
        "⚠ Esta acción eliminará el producto definitivamente, incluso si tiene movimientos.\n\n¿Continuar?",
      )
    ) {
      return;
    }
    try {
      await api.delete(`/productos/${id}/hard`);
      load();
    } catch (err: any) {
      console.error(err);
      const m =
        err.response?.data?.message ||
        "No se pudo eliminar el producto (revisa el backend).";
      setMsg(m);
    }
  };

  const rowsBase = showInactive ? inactivos : activos;

  const rows = rowsBase.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.sku?.toLowerCase().includes(q) ||
      p.nombre?.toLowerCase().includes(q) ||
      (p.categoria ?? "").toLowerCase().includes(q)
    );
  });

  const getStock = (p: Producto): number => {
    const raw =
      p.stock_total ??
      p.stock ??
      p.cantidad ??
      (p as any).existencia ??
      (p as any).stock_global ??
      0;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return n;
  };

  const getUdsCaja = (p: Producto): number | null => {
    const raw =
      p.unidades_por_caja ??
      p.uds_caja ??
      (p as any).unidades_caja ??
      (p as any).u_x_caja ??
      null;
    if (raw === null || raw === undefined) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return n;
  };

  const isStockBajo = (stock: number) => {
    return stock > 0 && stock <= 24;
  };

  return (
    <div className="page">
      {/* Header en card */}
      <div className="card page-head-card">
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Productos</h2>
            <div className="page-subtitle">
              Administra tu inventario: crea, edita, desactiva y revisa stock.
            </div>
          </div>

          <div className="page-header-actions">
            <input
              placeholder="Buscar por SKU, nombre o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />

            <div className="segmented">
              <button
                type="button"
                onClick={() => setShowInactive(false)}
                className={
                  "segmented-button " +
                  (!showInactive ? "segmented-button--active" : "")
                }
              >
                Activos
              </button>
              <button
                type="button"
                onClick={() => setShowInactive(true)}
                className={
                  "segmented-button " +
                  (showInactive ? "segmented-button--active" : "")
                }
              >
                Inactivos
              </button>
            </div>

            {!showInactive && (
              <button type="button" onClick={openNew} className="btn-primary">
                + Nuevo producto
              </button>
            )}
          </div>
        </div>

        {loading && <p className="list-message">Cargando...</p>}
        {msg && (
          <p
            className={
              "list-message " +
              (msg.includes("Error")
                ? "list-message-error"
                : "list-message-success")
            }
          >
            {msg}
          </p>
        )}
      </div>

      {/* Tabla en card */}
      <div className="card table-card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="table-header-cell">SKU</th>
                <th className="table-header-cell">Nombre</th>
                <th className="table-header-cell">Categoría</th>
                <th className="table-header-cell">Stock</th>
                <th className="table-header-cell">UDS/CAJA</th>
                <th className="table-header-cell">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const stock = getStock(p);
                const udsCaja = getUdsCaja(p);
                const stockBajo = isStockBajo(stock);

                const rowClass =
                  "table-row" + (stockBajo ? " stock-low-row" : "");

                return (
                  <tr key={p.id} className={rowClass}>
                    <td className="table-cell">{p.sku}</td>
                    <td className="table-cell">{p.nombre}</td>
                    <td className="table-cell">{p.categoria || "—"}</td>
                    <td className="table-cell">
                      <div className="stock-cell">
                        <span className="stock-number">{stock}</span>
                        {stockBajo && (
                          <span className="stock-low-badge">Stock bajo</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">{udsCaja ?? "—"}</td>
                    <td className="table-cell">
                      <div className="actions-cell">
                        <button
                          type="button"
                          onClick={() => openDetail(p.id)}
                          className="link-btn"
                        >
                          Ver detalles
                        </button>

                        {!showInactive ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(p.id)}
                              className="link-btn"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeactivate(p.id)}
                              className="link-btn link-btn-danger"
                            >
                              Desactivar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onReactivate(p.id)}
                              className="link-btn"
                            >
                              Reactivar
                            </button>
                            <button
                              type="button"
                              onClick={() => onHardDelete(p.id)}
                              className="link-btn link-btn-danger"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-cell table-cell-empty">
                    {showInactive
                      ? "No hay productos inactivos."
                      : "No hay productos registrados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLE */}
      <ProductDetailModal
        open={detailOpen}
        productId={detailId}
        onClose={closeDetail}
      />

      {/* MODAL NUEVO / EDITAR */}
      <ProductFormModal
        open={formOpen}
        productId={formId}
        onClose={closeForm}
        onSaved={load}
      />
    </div>
  );
}
