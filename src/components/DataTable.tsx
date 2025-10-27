import { ReactNode } from 'react';

type Col<T> = { header: string; cell: (row: T) => ReactNode; width?: string | number };

export default function DataTable<T>({
  data, columns, keyField,
}: { data: T[]; columns: Col<T>[]; keyField: keyof T }) {
  return (
    <div style={{ overflowX:'auto', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff' }}>
      <table style={{ width:'100%', fontSize:14 }}>
        <thead style={{ background:'#f1f5f9' }}>
          <tr>
            {columns.map((c,i)=>(
              <th key={i} style={{ textAlign:'left', padding:'8px 12px', fontWeight:600, width:c.width }}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row)=>(
            // @ts-ignore
            <tr key={row[keyField]} style={{ borderTop:'1px solid #e5e7eb' }}>
              {columns.map((c,i)=>(<td key={i} style={{ padding:'8px 12px' }}>{c.cell(row)}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
