import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import DataTable from '../components/DataTable';
import { Producto } from '../types';

export default function ProductsList() {
  const [items, setItems] = useState<Producto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [qp, setQp] = useSearchParams();

  const page = Number(qp.get('page') || 1);
  const pageSize = 10;
  const q = qp.get('q') || '';

  const load = async () => {
    setLoading(true);
    const res = await api.get('/productos', { params: { page, pageSize, q } });

    // Soporta backend real {items,total} o json-server (array + X-Total-Count)
    const data = Array.isArray(res.data)
      ? { items: res.data, total: Number(res.headers['x-total-count'] || res.data.length) }
      : res.data;

    setItems(data.items); setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, q]);

  const del = async (id: number) => {
    if (!window.confirm('¿Eliminar producto?')) return;
    await api.delete(`/productos/${id}`);
    load();
  };

  return (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h1 style={{ fontSize:20, fontWeight:600 }}>Productos</h1>
        <Link to="/productos/nuevo" style={{ background:'#000', color:'#fff', padding:'8px 12px', borderRadius:6 }}>Nuevo</Link>
      </div>

      <input
        placeholder="Buscar..."
        style={{ border:'1px solid #cbd5e1', borderRadius:6, padding:'8px 12px', maxWidth:260 }}
        defaultValue={q}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setQp({ page:'1', q:(e.target as HTMLInputElement).value });
        }}
      />

      {loading ? <p>Cargando...</p> : (
        <>
          <DataTable
            data={items}
            keyField="id"
            columns={[
              { header:'SKU', cell:(r)=>r.sku },
              { header:'Nombre', cell:(r)=>r.nombre },
              { header:'Categoría', cell:(r)=>r.categoria },
              { header:'UM', cell:(r)=>r.um },
              { header:'Stock', cell:(r)=>r.stock },
              { header:'Acciones', cell:(r)=>(
                <div style={{ display:'flex', gap:8 }}>
                  <Link to={`/productos/${r.id}`}>Editar</Link>
                  <button style={{ color:'#dc2626' }} onClick={()=>del(r.id)}>Eliminar</button>
                </div>
              )},
            ]}
          />
          <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:8 }}>
            <button disabled={page<=1} onClick={()=>setQp({ page:String(page-1), q })} style={{ border:'1px solid #cbd5e1', padding:'4px 12px', borderRadius:6 }}>Anterior</button>
            <span style={{ fontSize:12 }}>Página {page} · {total} total</span>
            <button disabled={(page*pageSize)>=total} onClick={()=>setQp({ page:String(page+1), q })} style={{ border:'1px solid #cbd5e1', padding:'4px 12px', borderRadius:6 }}>Siguiente</button>
          </div>
        </>
      )}
    </div>
  );
}
