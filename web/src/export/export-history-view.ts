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
    return '<div class="export-history-empty">暂无导出记录</div>';
  }

  return exportBatches.map((batch) => `
    <div class="export-history-item">
      <div class="export-history-item-top">
        <strong class="export-history-item-time">${new Date(batch.createdAt).toLocaleString()}</strong>
        <span class="export-history-item-status" style="color:${getStatusColor(batch.status)};">${EXPORT_STATUS_LABELS[batch.status]}</span>
      </div>
      <div class="export-history-item-products">产品：${batch.selectedProducts.join(', ')}</div>
      ${batch.exportDir ? `<div class="export-history-item-dir">目录：${batch.exportDir}</div>` : ''}
      ${batch.error ? `<div class="export-history-item-error">错误：${batch.error}</div>` : ''}
      ${batch.status === 'completed' && batch.exportDir ? `<button type="button" class="export-open-btn export-history-open-btn" data-export-dir="${batch.exportDir}">打开目录</button>` : ''}
    </div>
  `).join('');
}
