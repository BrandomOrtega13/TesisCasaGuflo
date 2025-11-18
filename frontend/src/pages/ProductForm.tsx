import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';

type FormData = {
  sku: string;
  nombre: string;
  precio_compra?: number;
  precio_venta?: number;
  precio_mayorista?: number;
  precio_caja?: number;
  unidades_por_caja?: number;
  // luego si quieres: categoria_id, proveedor_id, unidad_id
};

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id || id === 'nuevo';
  const navigate = useNavigate();

  const { register, handleSubmit, reset } = useForm<FormData>();

  useEffect(() => {
    const load = async () => {
      if (!isNew && id) {
        const res = await api.get(`/productos/${id}`);
        reset({
          sku: res.data.sku,
          nombre: res.data.nombre,
          precio_compra: res.data.precio_compra || 0,
          precio_venta: res.data.precio_venta || 0,
          precio_mayorista: res.data.precio_mayorista || 0,
          precio_caja: res.data.precio_caja || 0,
          unidades_por_caja: res.data.unidades_por_caja || undefined,
        });
      }
    };
    load();
  }, [id, isNew, reset]);

  const onSubmit = async (data: FormData) => {
    if (isNew) {
      await api.post('/productos', data);
    } else if (id) {
      await api.put(`/productos/${id}`, data);
    }
    navigate('/productos');
  };

  return (
    <div
      style={{
        maxWidth: 520,
        margin: '20px auto',
        padding: 20,
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
      }}
    >
      <h2>{isNew ? 'Nuevo producto' : 'Editar producto'}</h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: 'grid', gap: 12, marginTop: 16 }}
      >
        <div>
          <label>SKU</label>
          <input {...register('sku', { required: true })} style={input} />
        </div>
        <div>
          <label>Nombre</label>
          <input {...register('nombre', { required: true })} style={input} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label>Precio compra</label>
            <input type="number" step="0.01" {...register('precio_compra')} style={input} />
          </div>
          <div>
            <label>Precio venta</label>
            <input type="number" step="0.01" {...register('precio_venta')} style={input} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label>Precio mayorista</label>
            <input type="number" step="0.01" {...register('precio_mayorista')} style={input} />
          </div>
          <div>
            <label>Precio por caja</label>
            <input type="number" step="0.01" {...register('precio_caja')} style={input} />
          </div>
        </div>

        <div>
          <label>Unidades por caja</label>
          <input type="number" min={1} {...register('unidades_por_caja')} style={input} />
        </div>

        <button type="submit" style={btn}>
          Guardar
        </button>
      </form>
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 14,
};

const btn: React.CSSProperties = {
  marginTop: 8,
  padding: '8px 12px',
  background: '#000',
  color: '#fff',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
};
