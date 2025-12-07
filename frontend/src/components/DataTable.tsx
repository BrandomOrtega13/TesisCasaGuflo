import { ReactNode } from 'react';

type Col<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  /** Clase opcional para controlar el ancho de la columna vía CSS */
  widthClassName?: string;
};

type Props<T> = {
  data: T[];
  columns: Col<T>[];
  keyField: keyof T;
};

export default function DataTable<T>({ data, columns, keyField }: Props<T>) {
  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                className={c.widthClassName ? c.widthClassName : undefined}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={String(row[keyField])}
              className="data-table-row"
            >
              {columns.map((c, i) => (
                <td key={i} className="data-table-cell">
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
