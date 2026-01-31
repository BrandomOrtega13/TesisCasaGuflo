import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";

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

  const defaultDetalle: Detalle = { producto_id: "", cantidad: 0 };

  const [bodegaId, setBodegaId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [observacion, setObservacion] = useState("");
  const [detalles, setDetalles] = useState<Detalle[]>([{ ...defaultDetalle }]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // búsqueda
  const [searchBodega, setSearchBodega] = useState("");
  const [searchProveedor, setSearchProveedor] = useState("");
  const [searchProducto, setSearchProducto] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [bodRes, provRes, prodRes] = await Promise.all([
          api.get("/bodegas"),
          api.get("/proveedores"),
          api.get("/productos"),
        ]);

        setBodegas(bodRes.data);
        setProveedores(provRes.data);
        setProductos(
          (prodRes.data || []).map((p: any) => ({
            id: p.id,
            sku: p.sku,
            nombre: p.nombre,
          })),
        );
      } catch (err) {
        console.error("Error cargando catálogos", err);
        setMsg("Error al cargar catálogos");
      }
    };

    load();
  }, []);

  const updateDetalle = (index: number, patch: Partial<Detalle>) => {
    setDetalles((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    );
  };

  const addDetalle = () =>
    setDetalles((prev) => [...prev, { ...defaultDetalle }]);

  const removeDetalle = (index: number) =>
    setDetalles((prev) => prev.filter((_, i) => i !== index));

  // ---- LISTAS FILTRADAS (manteniendo el seleccionado) ----
  const bodegasFiltradasBase = bodegas.filter((b) =>
    b.nombre.toLowerCase().includes(searchBodega.toLowerCase()),
  );
  const selectedBodega = bodegas.find((b) => b.id === bodegaId);
  const bodegasFiltradas = selectedBodega
    ? bodegasFiltradasBase.some((b) => b.id === selectedBodega.id)
      ? bodegasFiltradasBase
      : [selectedBodega, ...bodegasFiltradasBase]
    : bodegasFiltradasBase;

  const proveedoresFiltradosBase = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(searchProveedor.toLowerCase()),
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

  const totalLineas = useMemo(() => {
    return detalles.filter((d) => d.producto_id && d.cantidad > 0).length;
  }, [detalles]);

  const totalUnidades = useMemo(() => {
    return detalles.reduce(
      (acc, d) => acc + (Number.isFinite(d.cantidad) ? d.cantidad : 0),
      0,
    );
  }, [detalles]);

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
        }));

      if (!bodegaId || limpios.length === 0) {
        setMsg("Seleccione bodega y al menos un producto con cantidad > 0");
        setLoading(false);
        return;
      }

      await api.post("/movimientos/ingresos", {
        bodega_id: bodegaId,
        proveedor_id: proveedorId || null,
        observacion: observacion?.trim() || null,
        detalles: limpios,
      });

      setMsg("Ingreso registrado correctamente");
      setDetalles([{ ...defaultDetalle }]);
      setObservacion("");
      setProveedorId("");
      setSearchProducto("");
    } catch (err: any) {
      console.error(err);
      const m =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        "Error al registrar ingreso";
      setMsg(m);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page mov-page">
      {/* Header en card */}
      <div className="card page-head-card">
        <div className="page-header" style={{ alignItems: "flex-start" }}>
          <div>
            <h2 className="page-header-title">Ingresos</h2>
            <div className="page-subtitle">
              Registra entradas de inventario por bodega y proveedor.
            </div>
          </div>

          <div className="mov-summary">
            <div className="mov-summary-item">
              <div className="mov-summary-label">Líneas</div>
              <div className="mov-summary-value">{totalLineas}</div>
            </div>
            <div className="mov-summary-item">
              <div className="mov-summary-label">Unidades</div>
              <div className="mov-summary-value">{totalUnidades}</div>
            </div>
          </div>
        </div>

        {msg && (
          <p
            className={
              "form-message " +
              (msg.includes("Error")
                ? "form-message-error"
                : "form-message-success")
            }
            style={{ marginTop: 10 }}
          >
            {msg}
          </p>
        )}
      </div>

      {/* Form en card grande */}
      <div className="form-card-wide">
        <form onSubmit={onSubmit}>
          {/* Cabecera */}
          <div className="form-section">
            <div className="form-section-title">Cabecera</div>

            <div className="grid-2">
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
                  className="form-select"
                >
                  <option value="">Seleccione bodega</option>
                  {bodegasFiltradas.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </select>
              </div>

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
                  className="form-select"
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

            <div className="form-field" style={{ marginTop: 12 }}>
              <label className="form-label">Observación</label>
              <input
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="form-input"
                placeholder="Ej: compra, reposición, ajuste..."
              />
            </div>
          </div>

          {/* Detalle */}
          <div className="form-section">
            <div className="form-section-title">Detalle</div>

            <div className="inline-card" style={{ marginBottom: 12 }}>
              <input
                placeholder="Buscar producto (SKU o nombre)..."
                value={searchProducto}
                onChange={(e) => setSearchProducto(e.target.value)}
                className="form-input"
              />
            </div>

            {detalles.map((d, i) => {
              const opcionesProducto = (() => {
                const base = [...productosFiltradosBase];
                const seleccionado = productos.find(
                  (p) => p.id === d.producto_id,
                );
                if (
                  seleccionado &&
                  !base.some((p) => p.id === seleccionado.id)
                ) {
                  return [seleccionado, ...base];
                }
                return base;
              })();

              return (
                <div
                  key={i}
                  className="inline-card"
                  style={{ marginBottom: 12 }}
                >
                  <div className="grid-2">
                    <div className="form-field">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <label className="form-label" style={{ margin: 0 }}>
                          Producto
                        </label>

                        {Number(d.cantidad) === 0 && (
                          <span className="hint-info">
                            ℹ️ Si la cantidad es 0, este producto no se
                            registrará en el ingreso.
                          </span>
                        )}
                      </div>

                      <select
                        value={d.producto_id}
                        onChange={(e) =>
                          updateDetalle(i, { producto_id: e.target.value })
                        }
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

                    <div className="form-field">
                      <label className="form-label">Cantidad (unidades)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={d.cantidad || ""}
                        onChange={(e) =>
                          updateDetalle(i, {
                            cantidad: Number(e.target.value) || 0,
                          })
                        }
                        className="form-input"
                        min={0}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: 12,
                      gap: 10,
                    }}
                  >
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

            <div className="actions-bar">
              <button
                type="button"
                onClick={addDetalle}
                className="btn-secondary"
              >
                + Agregar línea
              </button>
            </div>
          </div>

          {/* Acciones */}
          <div className="actions-bar">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Guardando..." : "Registrar ingreso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
