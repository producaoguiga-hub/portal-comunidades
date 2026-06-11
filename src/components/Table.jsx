export default function Table({ columns, data, onEdit, onDelete }) {
  if (!data.length) {
    return (
      <div className="text-center py-14">
        <p className="text-cinza text-sm">Nenhum registro encontrado.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-petroleum/5 border-b border-petroleum/10">
            {columns.map(col => (
              <th key={col.key} className="text-left px-4 py-3 font-semibold text-petroleum/70 text-xs uppercase tracking-wider whitespace-nowrap">
                {col.label}
              </th>
            ))}
            <th className="text-right px-4 py-3 font-semibold text-petroleum/70 text-xs uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map(row => (
            <tr key={row.id} className="hover:bg-verde/5 transition-colors group">
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-petroleum/80">
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
              <td className="px-4 py-3 text-right space-x-1">
                <button
                  onClick={() => onEdit(row)}
                  className="text-oceano hover:text-petroleum font-medium text-xs px-2.5 py-1.5 rounded-lg hover:bg-oceano/10 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete(row.id)}
                  className="text-laranja hover:text-petroleum font-medium text-xs px-2.5 py-1.5 rounded-lg hover:bg-laranja/10 transition-colors"
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
