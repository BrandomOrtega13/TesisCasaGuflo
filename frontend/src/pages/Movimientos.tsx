import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

type Movimiento = {
  id: string;
  fecha: string;
  tipo: 'INGRESO' | 'DESPACHO' | 'AJUSTE';
  bodega: string;
  proveedor: string | null;
  cliente: string | null;
  usuario: string | null;
  observacion: string | null;
  producto: string;
  cantidad: number;
  costo_unitario: number | null;
  precio_unitario: number | null;
  // (si luego agregas precio_tipo / motivo_descuento al backend, puedes extender aquí)
};

export default function Movimientos() {
  const [items, setItems] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros (en vivo)
  const [search, setSearch] = useState('');
  const [desde, setDesde] = useState(''); // yyyy-mm-dd
  const [hasta, setHasta] = useState(''); // yyyy-mm-dd

  // Paginación
  const PAGE_SIZE = 30;
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/movimientos');
        setItems(res.data || []);
      } catch (err) {
        console.error('Error cargando movimientos', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Cuando cambian los filtros, volvemos a la página 1 para evitar “páginas vacías”
  useEffect(() => {
    setPage(1);
  }, [search, desde, hasta]);

  // ==== helpers ====
  const toDateKey = (value: string): string => {
    const d = new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatFecha = (value: string) => {
    const d = new Date(value);
    return d.toLocaleString('es-EC');
  };

  const formatCantidad = (value: number) => {
    const n = Number(value);
    const entero = Number.isFinite(n) ? Math.round(n) : 0;
    return new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }).format(entero);
  };

  const tipoBadgeClass = (tipo: Movimiento['tipo']) => {
    if (tipo === 'INGRESO') return 'badge badge--in';
    if (tipo === 'DESPACHO') return 'badge badge--out';
    return 'badge';
  };

  // 1) Ordenar + filtrar TODO (sin paginar aún)
  const filteredAll = useMemo(() => {
    const term = search.trim().toLowerCase();

    // Orden: más reciente primero
    const ordered = [...items].sort((a, b) => {
      const ta = new Date(a.fecha).getTime();
      const tb = new Date(b.fecha).getTime();
      if (tb !== ta) return tb - ta;

      // desempate por id (para estabilidad si misma fecha)
      // (si tu id es uuid, igual sirve como desempate estable)
      return String(b.id).localeCompare(String(a.id));
    });

    return ordered.filter((m) => {
      const dateKey = toDateKey(m.fecha);

      // Filtro por fechas (inclusive)
      if (desde && dateKey < desde) return false;
      if (hasta && dateKey > hasta) return false;

      // Filtro por texto
      if (!term) return true;

      // Incluimos también fechaKey + fecha formateada para que buscar "2025" funcione
      const haystack = [
        m.tipo,
        m.bodega,
        m.producto,
        m.proveedor ?? '',
        m.cliente ?? '',
        m.usuario ?? '',
        m.observacion ?? '',
        dateKey,
        formatFecha(m.fecha),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [items, search, desde, hasta]);

  // 2) Paginar DESPUÉS de filtrar
const totalFiltered = filteredAll.length;
const totalItems = items.length;

const hasFilters = Boolean(search.trim() || desde || hasta);

// totalPages
const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

// Ajuste defensivo por si algo deja a page fuera de rango
useEffect(() => {
  if (page > totalPages) setPage(totalPages);
  if (page < 1) setPage(1);
}, [page, totalPages]);

let start = 0;
let end = 0;

if (hasFilters) {
  // ✅ Con filtros: paginación NORMAL
  start = (page - 1) * PAGE_SIZE;
  end = start + PAGE_SIZE;
} else {
  // ✅ Sin filtros: paginación "tipo libro" (página 1 = resto)
  const remainder = totalFiltered % PAGE_SIZE;
  const firstPageSize = remainder === 0 ? Math.min(PAGE_SIZE, totalFiltered) : remainder;

  const bookTotalPages =
    totalFiltered === 0
      ? 1
      : remainder === 0
      ? Math.ceil(totalFiltered / PAGE_SIZE)
      : 1 + Math.ceil((totalFiltered - firstPageSize) / PAGE_SIZE);

  // Si cambió el totalPages real en modo libro, ajusta page
  if (page > bookTotalPages) setPage(bookTotalPages);

  if (page === 1) {
    start = 0;
    end = firstPageSize;
  } else {
    const offset = firstPageSize + (page - 2) * PAGE_SIZE;
    start = offset;
    end = offset + PAGE_SIZE;
  }
}

const pageItems = filteredAll.slice(start, end);

  if (loading) {
    return <p className="list-message">Cargando movimientos...</p>;
  }

  return (
    <div className="page">
      {/* Header + filtros */}
      <div className="card page-head-card filters-card">
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Movimientos</h2>
            <div className="page-subtitle">
              Filtra por fechas y por texto (producto, bodega, proveedor/cliente, tipo, etc.).
            </div>
          </div>
        </div>

        {/* Mantengo el orden: Buscar primero, luego fechas */}
        <div className="filters-row">
          <div className="filters-field">
            <div className="filters-label">Buscar</div>
            <input
              placeholder="Filtra por fecha, tipo, bodega, producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filters-field">
            <div className="filters-label">Desde</div>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filters-field">
            <div className="filters-label">Hasta</div>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="search-input"
            />
          </div>

          {/* ✅ QUITADO EL BOTÓN DEL DIABLO */}
        </div>

        <p className="list-message" style={{ marginTop: 6 }}>
          Mostrando <strong>{pageItems.length}</strong> de <strong>{totalFiltered}</strong> (de{' '}
          <strong>{totalItems}</strong>)
        </p>

        {/* Mensaje arriba (debajo del "Mostrando") */}
        {totalFiltered === 0 && (
          <p className="list-message" style={{ marginTop: 6 }}>
            No hay resultados.
          </p>
        )}

        {/* Paginación */}
        <div className="filters-actions" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Anterior
          </button>

          <div className="pagination-label" style={{ padding: '0 10px' }}>
            Página {page} de {totalPages}
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card table-card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="table-header-cell">Fecha</th>
                <th className="table-header-cell">Tipo</th>
                <th className="table-header-cell">Bodega</th>
                <th className="table-header-cell">Producto</th>
                <th className="table-header-cell">Cantidad</th>
                <th className="table-header-cell">Prov/Cliente</th>
                <th className="table-header-cell">Usuario</th>
                <th className="table-header-cell">Obs.</th>
              </tr>
            </thead>

            <tbody>
              {pageItems.map((m) => (
                <tr key={`${m.id}-${m.producto}-${m.cantidad}-${m.fecha}`} className="table-row">
                  <td className="table-cell">{formatFecha(m.fecha)}</td>
                  <td className="table-cell">
                    <span className={tipoBadgeClass(m.tipo)}>{m.tipo}</span>
                  </td>
                  <td className="table-cell">{m.bodega}</td>
                  <td className="table-cell">{m.producto}</td>
                  <td className="table-cell">{formatCantidad(m.cantidad)}</td>
                  <td className="table-cell">{m.proveedor || m.cliente || '-'}</td>
                  <td className="table-cell">{m.usuario || '-'}</td>
                  <td className="table-cell">{m.observacion || '-'}</td>
                </tr>
              ))}

              {/* Si no hay resultados o la página quedó vacía (por seguridad), mostramos fila vacía */}
              {pageItems.length === 0 && (
                <tr className="table-row">
                  <td className="table-cell table-cell-empty" colSpan={8}>
                    {totalFiltered === 0
                      ? 'No hay movimientos que coincidan con el filtro.'
                      : 'No hay movimientos en esta página.'}
                  </td>
                </tr>
              )}

              {/* Si no hay nada en BD */}
              {items.length === 0 && (
                <tr className="table-row">
                  <td className="table-cell table-cell-empty" colSpan={8}>
                    No hay movimientos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
