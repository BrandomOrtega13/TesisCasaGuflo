import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../lib/api';

type Categoria = { id: string; nombre: string };

type FormData = {
  sku: string;
  nombre: string;
  precio_compra?: number;
  precio_venta?: number;
  precio_mayorista?: number;
  precio_caja?: number;
  unidades_por_caja?: number;
  categoria_id?: string;
};

export default function ProductFormModal({
  open,
  productId,
  onClose,
  onSaved,
}: {
  open: boolean;
  productId: string | null; // null => nuevo
  onClose: () => void;
  onSaved?: () => void; // refrescar lista si quieres
}) {
  const isNew = !productId;

  const { register, handleSubmit, reset, setValue } = useForm<FormData>();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Cargar categorías cuando abre
  useEffect(() => {
    if (!open) return;
    const loadCategorias = async () => {
      try {
        const res = await api.get('/categorias');
        setCategorias(res.data);
      } catch (err) {
        console.error(err);
        setMsg('Error al cargar categorías');
      }
    };
    loadCategorias();
  }, [open]);

  // Cargar producto si es edición
  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setMsg(null);

      if (isNew) {
        reset({
          sku: '',
          nombre: '',
          precio_compra: 0,
          precio_venta: 0,
          precio_mayorista: 0,
          precio_caja: 0,
          unidades_por_caja: undefined,
          categoria_id: '',
        });
        return;
      }

      setLoading(true);
      try {
        const res = await api.get(`/productos/${productId}`);
        reset({
          sku: res.data.sku,
          nombre: res.data.nombre,
          precio_compra: res.data.precio_compra || 0,
          precio_venta: res.data.precio_venta || 0,
          precio_mayorista: res.data.precio_mayorista || 0,
          precio_caja: res.data.precio_caja || 0,
          unidades_por_caja: res.data.unidades_por_caja || undefined,
          categoria_id: res.data.categoria_id || '',
        });
        if (res.data.categoria_id) setValue('categoria_id', res.data.categoria_id);
      } catch (err: any) {
        console.error(err);
        setMsg('Error al cargar producto');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, productId, isNew, reset, setValue]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setMsg(null);

    try {
      const payload = {
        sku: data.sku,
        nombre: data.nombre,
        precio_compra: data.precio_compra || 0,
        precio_venta: data.precio_venta || 0,
        precio_mayorista: data.precio_mayorista || 0,
        precio_caja: data.precio_caja || 0,
        unidades_por_caja: data.unidades_por_caja || null,
        categoria_id: data.categoria_id || null,
      };

      if (isNew) {
        await api.post('/productos', payload);
      } else {
        await api.put(`/productos/${productId}`, payload);
      }

      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      setMsg(err.response?.data?.message || 'Error al guardar producto');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{isNew ? 'Nuevo producto' : 'Editar producto'}</div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar" title="Cerrar">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {msg && (
            <p className={'list-message ' + (msg.includes('Error') ? 'list-message-error' : 'list-message-success')}>
              {msg}
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
            <div className="form-field">
              <label className="form-label">SKU *</label>
              <input className="input" {...register('sku', { required: true })} />
            </div>

            <div className="form-field">
              <label className="form-label">Nombre *</label>
              <input className="input" {...register('nombre', { required: true })} />
            </div>

            <div className="form-field">
              <label className="form-label">Categoría (opcional)</label>
              <select
                className="select"
                {...register('categoria_id')}
                onChange={(e) => setValue('categoria_id', e.target.value)}
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-field">
                <label className="form-label">Precio compra</label>
                <input type="number" step="0.01" className="input" {...register('precio_compra')} />
              </div>
              <div className="form-field">
                <label className="form-label">Precio unitario</label>
                <input type="number" step="0.01" className="input" {...register('precio_venta')} />
              </div>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-field">
                <label className="form-label">Precio mayorista</label>
                <input type="number" step="0.01" className="input" {...register('precio_mayorista')} />
              </div>
              <div className="form-field">
                <label className="form-label">Precio por caja</label>
                <input type="number" step="0.01" className="input" {...register('precio_caja')} />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Unidades por caja</label>
              <input type="number" min={1} className="input" {...register('unidades_por_caja')} />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
