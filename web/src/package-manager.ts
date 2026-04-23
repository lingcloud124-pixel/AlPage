import { getAllCSSVariables } from './theme-engine';
import { appendExportBatchToProject, appendExportJobRequest, buildExportJobRequest, updateExportBatchInProject } from './export/export-job';
import { dispatchExportJobToBridge, pickDirectoryViaBridge } from './export/export-bridge';
import { renderExportHistoryHtml } from './export/export-history-view';
import { openExportDirectory } from './export/export-open-client';
import { fetchExportJobStatus } from './export/export-status-client';
import { getCurrentProjectId, loadProject, saveProject, safeJsonParse } from './project-manager';
import type { ExportBatchStatus } from './types';
import { loadSettings, saveSettings, getEffectiveExportRoot } from './agent/chat-client';
import { normalizeExportRoot } from './export/export-paths';

const EXPORT_JOB_QUEUE_KEY = 'theme-studio-export-jobs';

const PACKAGE_PRODUCTS = [
  { id: 'mk', label: 'MK（主题+登录）' },
  { id: 'ekp_v14_16', label: 'EKP V14~V16（主题+登录）' },
  { id: 'ekp_v17', label: 'EKP V17（主题+登录）' },
];

export function showNotification(message: string) {
  const toast = document.createElement('div');
  toast.className = 'theme-studio-toast';
  toast.textContent = message;
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '1'; }, 10);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { if (document.body.contains(toast)) document.body.removeChild(toast); }, 300);
  }, 3000);
}

export function setupMainActions() {
  const packageBtn = document.getElementById('packageBtn');
  if (packageBtn) packageBtn.addEventListener('click', showPackageModal);
  initializePackageModal();
}

function showPackageModal() {
  const modal = document.getElementById('packageModal');
  if (!modal) { console.error('Package modal not found'); return; }
  generateProductList();
  renderExportHistory();
  modal.classList.add('active');
}

function generateProductList() {
  const productList = document.getElementById('packageProductList');
  if (!productList) { console.error('Product list container not found'); return; }
  productList.innerHTML = '';
  PACKAGE_PRODUCTS.forEach(product => {
    const label = document.createElement('label');
    label.className = 'product-item';
    label.innerHTML = `<input type="checkbox" id="${product.id}_cb" value="${product.id}"><span>${product.label}</span>`;
    productList.appendChild(label);
  });
  bindSelectAllButtons();
}

function bindSelectAllButtons() {
  const selectAllBtn = document.getElementById('packageSelectAll');
  const deselectAllBtn = document.getElementById('packageDeselectAll');
  if (selectAllBtn) { selectAllBtn.removeEventListener('click', handleSelectAll); selectAllBtn.addEventListener('click', handleSelectAll); }
  if (deselectAllBtn) { deselectAllBtn.removeEventListener('click', handleDeselectAll); deselectAllBtn.addEventListener('click', handleDeselectAll); }
}

function handleSelectAll() {
  document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][id$="_cb"]').forEach(cb => cb.checked = true);
}

function handleDeselectAll() {
  document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][id$="_cb"]').forEach(cb => cb.checked = false);
}

function initializePackageModal() {
  const modal = document.getElementById('packageModal');
  if (!modal) return;
  const closeBtn = document.getElementById('packageModalClose');
  const cancelBtn = document.getElementById('packageCancelBtn');
  const startBtn = document.getElementById('packageStartBtn');
  if (closeBtn) closeBtn.addEventListener('click', () => closePackageModal());
  if (cancelBtn) cancelBtn.addEventListener('click', () => closePackageModal());
  if (startBtn) startBtn.addEventListener('click', startPackagingProcess);
  modal.addEventListener('click', (e) => { if (e.target === modal) closePackageModal(); });
}

function closePackageModal() {
  const modal = document.getElementById('packageModal');
  if (modal) modal.classList.remove('active');
}

async function promptExportRootSelection(): Promise<string> {
  const pickedPath = await pickDirectoryViaBridge(window);
  if (!pickedPath) {
    throw new Error('无法唤起系统目录选择，请先启动本地导出桥接服务');
  }

  const exportRoot = normalizeExportRoot(pickedPath);
  const settings = loadSettings();
  saveSettings({
    ...settings,
    exportRoot,
  });
  return exportRoot;
}

async function startPackagingProcess() {
  const startBtn = document.getElementById('packageStartBtn') as HTMLButtonElement;
  if (startBtn) { startBtn.textContent = '打包中...'; startBtn.disabled = true; }

  try {
    const selectedProducts: string[] = [];
    document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][id$="_cb"]').forEach(cb => {
      if (cb.checked) selectedProducts.push(cb.value);
    });

    if (selectedProducts.length === 0) {
      showNotification('请至少选择一个产品进行打包');
      if (startBtn) { startBtn.textContent = '开始打包'; startBtn.disabled = false; }
      return;
    }

    const currentProjectId = getCurrentProjectId();
    if (!currentProjectId) {
      showNotification('请先创建或打开一个项目，再执行打包');
      if (startBtn) { startBtn.textContent = '开始打包'; startBtn.disabled = false; }
      return;
    }

    const project = await loadProject(currentProjectId);
    if (!project) {
      showNotification('当前项目不存在，无法创建导出任务');
      if (startBtn) { startBtn.textContent = '开始打包'; startBtn.disabled = false; }
      return;
    }

    let exportRoot = '';
    try {
      exportRoot = await promptExportRootSelection();
    } catch (error) {
      const settings = loadSettings();
      const fallbackExportRoot = settings.exportRoot?.trim() ? getEffectiveExportRoot(settings) : '';
      if (!fallbackExportRoot) {
        showNotification((error as Error).message || '请选择导出目录后再执行打包');
        if (startBtn) { startBtn.textContent = '开始打包'; startBtn.disabled = false; }
        return;
      }
      exportRoot = fallbackExportRoot;
    }

    const vars = getAllCSSVariables();
    const request = buildExportJobRequest({
      project,
      selectedProducts,
      cssVariables: vars,
      exportRoot,
    });

    const updatedProject = appendExportBatchToProject(project, request.batch);
    await saveProject(updatedProject);

    const queue = safeJsonParse<any[]>(localStorage.getItem(EXPORT_JOB_QUEUE_KEY), []);
    localStorage.setItem(EXPORT_JOB_QUEUE_KEY, JSON.stringify(appendExportJobRequest(queue, request)));

    const dispatchResult = await dispatchExportJobToBridge(window, request).catch(() => ({ accepted: false, mode: 'none' as const }));
    if (!dispatchResult.accepted) {
      markLatestExportBatchStatus(updatedProject.id, request.batch.id, 'bridge_unavailable');
      renderExportHistory();
      showNotification('导出桥接不可用，无法执行本地打包。请先启动本地导出桥接后重试。');
    } else {
      trackExportJobStatus(updatedProject.id, request.batch.id);
      showNotification(`已提交导出任务（${selectedProducts.length} 个产品），正在导出到：${exportRoot}`);
    }

    setTimeout(() => {
      closePackageModal();
      if (startBtn) { startBtn.textContent = '开始打包'; startBtn.disabled = false; }
    }, 1500);
  } catch (e) {
    showNotification(`打包失败: ${(e as Error).message}`);
    if (startBtn) { startBtn.textContent = '开始打包'; startBtn.disabled = false; }
  }
}

async function markLatestExportBatchStatus(projectId: string, batchId: string, status: ExportBatchStatus) {
  const project = await loadProject(projectId);
  if (!project?.exportBatches) return;
  await saveProject(updateExportBatchInProject(project, batchId, { status }));
  renderExportHistory();
}

async function renderExportHistory() {
  const container = document.getElementById('packageExportHistory');
  const projectId = getCurrentProjectId();
  if (!container || !projectId) return;

  const project = await loadProject(projectId);
  const exportBatches = [...(project?.exportBatches ?? [])]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  if (exportBatches.length === 0) {
    container.innerHTML = renderExportHistoryHtml([]);
    return;
  }

  container.innerHTML = renderExportHistoryHtml(exportBatches);
  bindExportHistoryActions(container);
}

async function trackExportJobStatus(projectId: string, batchId: string) {
  const poll = async () => {
    const status = await fetchExportJobStatus(fetch, batchId).catch(() => null);
    if (!status) return;

    const project = await loadProject(projectId);
    if (!project) return;

    await saveProject(updateExportBatchInProject(project, batchId, {
      status: status.status,
      exportDir: status.exportDir,
      projectDir: status.projectDir,
      exportRoot: status.exportRoot,
      error: status.error,
    }));
    renderExportHistory();

    if (status.status === 'completed') {
      showNotification('导出完成，结果已写入配置目录');
      return;
    }
    if (status.status === 'failed') {
      showNotification('导出失败，请检查桥接日志');
      return;
    }

    window.setTimeout(poll, 1200);
  };

  void poll();
}

function bindExportHistoryActions(container: HTMLElement) {
  container.querySelectorAll<HTMLButtonElement>('.export-open-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const targetPath = button.dataset.exportDir;
      if (!targetPath) return;
      const opened = await openExportDirectory(fetch, targetPath).catch(() => false);
      if (!opened) {
        showNotification('打开导出目录失败，请确认本地桥接服务已启动');
      }
    });
  });
}
