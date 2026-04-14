import type { ExportBatch, ExportBatchStatus } from '../types';

const EXPORT_STATUS_LABELS: Record<ExportBatchStatus, string> = {
  queued: '排队中',
  bridge_unavailable: '等待桥接',
  capturing: '截图中',
  packaging: '打包中',
  verifying: '验证中',
  completed: '已完成',
  failed: '失败',
};

function getStatusColor(status: ExportBatchStatus): string {
  if (status === 'completed') return '#2E7D32';
  if (status === 'failed') return '#C62828';
  return '#8A6D3B';
}

export function renderExportHistoryHtml(exportBatches: ExportBatch[]): string {
  if (exportBatches.length === 0) {
    return '<div style="font-size:12px; color: var(--auxiliary-gray);">暂无导出记录</div>';
  }

  return exportBatches.map((batch) => `
    <div style="padding:8px 6px; border-bottom:1px solid var(--border-color);">
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
        <strong style="font-size:13px;">${new Date(batch.createdAt).toLocaleString()}</strong>
        <span style="font-size:12px; color:${getStatusColor(batch.status)};">${EXPORT_STATUS_LABELS[batch.status]}</span>
      </div>
      <div style="font-size:12px; color: var(--auxiliary-gray-dark); margin-top:4px;">产品：${batch.selectedProducts.join(', ')}</div>
      ${batch.exportDir ? `<div style="font-size:11px; color: var(--auxiliary-gray); margin-top:2px;">目录：${batch.exportDir}</div>` : ''}
      ${batch.error ? `<div style="font-size:11px; color:#C62828; margin-top:2px;">错误：${batch.error}</div>` : ''}
      ${batch.status === 'completed' && batch.exportDir ? `<button type="button" class="export-open-btn" data-export-dir="${batch.exportDir}" style="margin-top:6px; padding:4px 8px; font-size:12px; border:1px solid var(--border-color); border-radius:6px; background: var(--panel-bg-color); cursor:pointer;">打开目录</button>` : ''}
    </div>
  `).join('');
}

