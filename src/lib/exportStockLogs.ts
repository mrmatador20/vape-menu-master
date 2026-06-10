import type { StockMovement } from '@/hooks/useBalcao';

const headers = [
  'Data', 'Hora', 'Usuário', 'Email', 'Cargo', 'Produto', 'SKU', 'Categoria',
  'Tipo', 'Motivo', 'Quantidade', 'Estoque Antes', 'Estoque Depois', 'Observações', 'ID',
];

const fmt = (iso: string) => {
  const d = new Date(iso);
  return [d.toLocaleDateString('pt-BR'), d.toLocaleTimeString('pt-BR')];
};

const toRow = (m: StockMovement): string[] => {
  const [date, time] = fmt(m.created_at);
  return [
    date, time,
    m.user_email_snapshot?.split('@')[0] ?? '',
    m.user_email_snapshot ?? '',
    m.user_role_snapshot ?? '',
    m.product_name_snapshot,
    m.product_sku_snapshot ?? '',
    m.category_snapshot ?? '',
    m.movement_type,
    m.reason ?? '',
    String(m.quantity),
    String(m.stock_before),
    String(m.stock_after),
    (m.notes ?? '').replace(/\n/g, ' '),
    m.id,
  ];
};

const escapeCsv = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function exportStockLogsCsv(movements: StockMovement[], filename = 'stock-logs.csv') {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const m of movements) lines.push(toRow(m).map(escapeCsv).join(','));
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

export function exportStockLogsXls(movements: StockMovement[], filename = 'stock-logs.xls') {
  // Simple HTML table, recognized by Excel
  const rows = movements.map(toRow);
  const html = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
    rows.map(r => `<tr>${r.map(c => `<td>${(c || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('')
  }</tbody></table>`;
  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, filename);
}

export function exportStockLogsPdf(movements: StockMovement[]) {
  const rows = movements.map(toRow);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Logs de Estoque</title>
    <style>body{font-family:sans-serif;font-size:11px;padding:16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px;text-align:left}th{background:#eee}</style>
    </head><body><h1>Logs de Estoque</h1><p>${new Date().toLocaleString('pt-BR')}</p>
    <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(r => `<tr>${r.map(c => `<td>${(c || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('')}
    </tbody></table>
    <script>window.onload=()=>window.print()</script>
    </body></html>`);
  win.document.close();
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
