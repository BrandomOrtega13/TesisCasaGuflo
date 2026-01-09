import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';

type Categoria = {
  id: string;
  nombre: string;
};

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

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id || id === 'nuevo';
  const navigate = useNavigate();

  const { register, handleSubmit, reset, setValue } = useForm<FormData>();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const res = await api.get('/categorias');
        setCategorias(res.data);
      } catch (err) {
        console.error('Error cargando categorías', err);
        setMsg('Error al cargar categorías');
      }
    };
    loadCategorias();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!isNew && id) {
        try {
          const res = await api.get(`/productos/${id}`);
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
          if (res.data.categoria_id) {
            setValue('categoria_id', res.data.categoria_id);
          }
        } catch {
          setMsg('Error al cargar producto');
        }
      }
    };
    load();
  }, [id, isNew, reset, setValue]);

  const onSubmit = async (data: FormData) => {
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
        setMsg('Producto creado correctamente');
      } else if (id) {
        await api.put(`/productos/${id}`, payload);
        setMsg('Producto actualizado correctamente');
      }

      navigate('/productos');
    } catch (err: any) {
      console.error(err);
      setMsg(err.response?.data?.message || 'Error al guardar producto');
    }
  };

  return (
    <div className="form-page">
      {/* CAMBIO: usa form-card (se ve más pro y centrado) */}
      <div className="form-card">
        <button
          type="button"
          className="btn-link-back"
          onClick={() => navigate(-1)} // CAMBIO: vuelve a la pantalla anterior
        >
          ← Volver
        </button>

        <h2 className="form-title">
          {isNew ? 'Nuevo producto' : 'Editar producto'}
        </h2>

        {msg && (
          <p
            className={`form-message ${
              msg.includes('Error') ? 'form-message-error' : 'form-message-success'
            }`}
          >
            {msg}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
          <div className="form-field">
            <label className="form-label">SKU *</label>
            {/* CAMBIO: form-input -> input */}
            <input className="input" {...register('sku', { required: true })} />
          </div>

          <div className="form-field">
            <label className="form-label">Nombre *</label>
            {/* CAMBIO: form-input -> input */}
            <input className="input" {...register('nombre', { required: true })} />
          </div>

          <div className="form-field">
            <label className="form-label">Categoría (opcional)</label>
            {/* CAMBIO: form-input -> select */}
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

          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-field">
              <label className="form-label">Precio compra</label>
              {/* CAMBIO: form-input -> input */}
              <input type="number" step="0.01" className="input" {...register('precio_compra')} />
            </div>

            <div className="form-field">
              <label className="form-label">Precio unitario</label>
              {/* CAMBIO: form-input -> input */}
              <input type="number" step="0.01" className="input" {...register('precio_venta')} />
            </div>
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-field">
              <label className="form-label">Precio mayorista</label>
              {/* CAMBIO: form-input -> input */}
              <input type="number" step="0.01" className="input" {...register('precio_mayorista')} />
            </div>

            <div className="form-field">
              <label className="form-label">Precio por caja</label>
              {/* CAMBIO: form-input -> input */}
              <input type="number" step="0.01" className="input" {...register('precio_caja')} />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Unidades por caja</label>
            {/* CAMBIO: form-input -> input */}
            <input type="number" min={1} className="input" {...register('unidades_por_caja')} />
          </div>

          <button type="submit" className="btn-primary">
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
