import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { Producto } from '../types';

export default function ProductForm() {
  const { id } = useParams();
  const isNew = id === 'nuevo' || !id;
  const { register, handleSubmit, reset } = useForm<Partial<Producto>>({ defaultValues: { activo: true } });
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNew && id) { api.get(`/productos/${id}`).then(r => reset(r.data)); }
  }, [id, isNew, reset]);

  const onSubmit = async (data: Partial<Producto>) => {
    if (isNew) await api.post('/productos', data);
    else await api.put(`/productos/${id}`, data);
    navigate('/productos');
  };

  return (
    <div style={{ maxWidth:640 }}>
      <h1 style={{ fontSize:20, fontWeight:600, marginBottom:12 }}>{isNew ? 'Nuevo' : 'Editar'} producto</h1>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display:'grid', gap:12, background:'#fff', padding:16, borderRadius:8, border:'1px solid #e5e7eb' }}>
        <div>
          <label style={{ display:'block', fontSize:12 }}>SKU</label>
          <input {...register('sku', { required:true })} style={{ border:'1px solid #cbd5e1', borderRadius:6, width:'100%', padding:'8px 12px' }} />
        </div>
        <div>
          <label style={{ display:'block', fontSize:12 }}>Nombre</label>
          <input {...register('nombre', { required:true })} style={{ border:'1px solid #cbd5e1', borderRadius:6, width:'100%', padding:'8px 12px' }} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={{ display:'block', fontSize:12 }}>Categoría</label>
            <input {...register('categoria', { required:true })} style={{ border:'1px solid #cbd5e1', borderRadius:6, width:'100%', padding:'8px 12px' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12 }}>Unidad (UM)</label>
            <input {...register('um', { required:true })} style={{ border:'1px solid #cbd5e1', borderRadius:6, width:'100%', padding:'8px 12px' }} />
          </div>
        </div>
        <label style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input type="checkbox" {...register('activo')} /> Activo
        </label>
        <button style={{ background:'#000', color:'#fff', padding:'8px 12px', borderRadius:6 }}>Guardar</button>
      </form>
    </div>
  );
}
