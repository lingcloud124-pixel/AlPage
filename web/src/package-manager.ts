import { getAllCSSVariables } from './theme-engine';
import { appendExportBatchToProject, appendExportJobRequest, buildExportJobRequest, updateExportBatchInProject } from './export/export-job';
import { dispatchExportJobToBridge, pickDirectoryViaBridge } from './export/export-bridge';
import { fetchExportJobStatus } from './export/export-status-client';
import { createProject, getCurrentProjectId, loadProject, saveProject, safeJsonParse, getLastProjectMutationError, setCurrentProjectId } from './project-manager';
import type { ExportBatchStatus, ExportJobQueueEntry } from './types';
import { loadSettings, saveSettings, getEffectiveExportRoot } from './agent/chat-client';
import { apiFetch, resolveApiUrl } from './api-base';
import { normalizeExportRoot } from './export/export-paths';
import { showNotificationWithOptions } from './utils/notification';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const EXPORT_JOB_QUEUE_KEY = 'theme-studio-export-jobs';

const PACKAGE_PRODUCTS = [
  { id: 'mk', label: 'MK（主题+登录）' },
  { id: 'ekp_v14', label: 'EKP V14（主题+登录）' },
  { id: 'ekp_v15', label: 'EKP V15（主题+登录）' },
  { id: 'ekp_v16', label: 'EKP V16（主题+登录）' },
  { id: 'ekp_v17', label: 'EKP V17（主题+登录）' },
];

function formatExportDatePrefix(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function persistExportJobQueue(request: ReturnType<typeof buildExportJobRequest>): void {
  try {
    const queue = safeJsonParse<ExportJobQueueEntry[]>(localStorage.getItem(EXPORT_JOB_QUEUE_KEY), []);
    localStorage.setItem(EXPORT_JOB_QUEUE_KEY, JSON.stringify(appendExportJobRequest(queue, request)));
  } catch (error) {
    console.warn('[package-manager] Failed to persist export queue entry:', error);
  }
}

export function showNotification(message: string) {
  showNotificationWithOptions(message);
}

async function ensureProjectForPackaging(): Promise<Awaited<ReturnType<typeof loadProject>> | null> {
  const currentProjectId = getCurrentProjectId();
  if (currentProjectId) {
    const existingProject = await loadProject(currentProjectId);
    if (existingProject) {
      return existingProject;
    }
  }

  const projectTitle = document.getElementById('chatProjectName')?.textContent?.trim() || '未命名项目';
  const createdProject = await createProject(projectTitle, 'light-ui');
  if (!createdProject) {
    return null;
  }

  createdProject.themeName = projectTitle === '开始新创作' ? '未命名门户' : projectTitle;
  createdProject.lifecycle = 'active';
  setCurrentProjectId(createdProject.id);
  await saveProject(createdProject);
  return createdProject;
}

export { showNotificationWithOptions };

export function setupMainActions() {
  const packageBtn = document.getElementById('packageBtn');
  if (packageBtn instanceof HTMLButtonElement) {
    packageBtn.onclick = showPackageModal;
  }
  initializePackageModal();
}

function showPackageModal() {
  const modal = document.getElementById('packageModal');
  if (!modal) { console.error('Package modal not found'); return; }
  generateProductList();
  const startBtn = document.getElementById('packageStartBtn') as HTMLButtonElement;
  if (startBtn) { startBtn.textContent = '开始导出'; startBtn.disabled = false; }
  modal.classList.add('active');
}

function generateProductList() {
  const productList = document.getElementById('packageProductList');
  if (!productList) { console.error('Product list container not found'); return; }
  productList.innerHTML = '';
  PACKAGE_PRODUCTS.forEach(product => {
    const label = document.createElement('label');
    label.className = 'product-item';
    label.innerHTML = `<input type="checkbox" id="${escapeHtml(product.id)}_cb" value="${escapeHtml(product.id)}"><span>${escapeHtml(product.label)}</span>`;
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
  const closeBtn = document.getElementById('packageModalClose');
  const cancelBtn = document.getElementById('packageCancelBtn');
  const startBtn = document.getElementById('packageStartBtn');
  if (closeBtn instanceof HTMLButtonElement) closeBtn.onclick = closePackageModal;
  if (cancelBtn instanceof HTMLButtonElement) cancelBtn.onclick = closePackageModal;
  if (startBtn instanceof HTMLButtonElement) startBtn.onclick = startPackagingProcess;
}

function closePackageModal() {
  const modal = document.getElementById('packageModal');
  if (modal) modal.classList.remove('active');
}

function openProgressModal() {
  closePackageModal();
  const overlay = document.getElementById('packagingOverlay');
  if (!overlay) {
    const el = document.createElement('div');
    el.id = 'packagingOverlay';
    el.style.cssText = 'position:fixed;inset:0;z-index:199;cursor:not-allowed;';
    document.body.appendChild(el);
  }
  const modal = document.getElementById('packageProgressModal');
  if (modal) modal.classList.add('active');
}

function closeProgressModal() {
  const modal = document.getElementById('packageProgressModal');
  if (modal) modal.classList.remove('active');
  const overlay = document.getElementById('packagingOverlay');
  if (overlay) overlay.remove();
}

async function triggerBlobDownload(dlUrl: string, filename: string): Promise<void> {
  try {
    const res = await apiFetch(dlUrl);
    if (!res.ok) throw new Error('download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    showNotificationWithOptions('下载失败，请稍后重试', { variant: 'critical' });
    throw new Error('download failed');
  }
}

function setProgressDownloadButtonLoading(button: HTMLButtonElement, loading: boolean): void {
  button.disabled = loading;
  button.dataset.loading = loading ? 'true' : 'false';
  button.innerHTML = loading
    ? '<span class="package-progress-btn-spinner" aria-hidden="true"></span><span>准备下载...</span>'
    : '下载文件';
}

function renderProgress(step: string, detail?: string) {
  renderProgressWithDownload(step, detail);
}

function renderProgressWithDownload(step: string, detail?: string, dlUrl?: string, filename?: string) {
  const content = document.getElementById('packageProgressContent');
  const notice = document.getElementById('packageProgressNotice');
  if (!content) return;

  const isLoading = step !== 'completed' && step !== 'failed';
  const iconChar = isLoading ? '⚙️' : step === 'completed' ? '✅' : '❌';
  const title = isLoading ? step : step === 'completed' ? '导出完成' : '导出失败';
  notice?.classList.toggle('is-visible', isLoading);

  content.innerHTML = `
    <div class="package-progress-icon${isLoading ? ' spinning' : ''}">${iconChar}</div>
    <div class="package-progress-title">${title}</div>
    ${detail ? `<div class="package-progress-detail">${detail}</div>` : ''}
    ${step === 'completed' ? `
      <div style="display:flex;gap:12px;justify-content:center;margin-top:8px;">
        ${dlUrl ? `<button class="package-progress-btn success" id="progressDownloadBtn" data-dl-url="${escapeHtml(dlUrl)}" data-filename="${escapeHtml(filename ?? '')}">下载文件</button>` : ''}
        <button class="package-progress-btn error" id="progressDismissBtn" style="background:var(--surface-2,#e5e5e5);color:#000;">关闭</button>
      </div>
    ` : ''}
    ${step === 'failed' ? `<button class="package-progress-btn error" id="progressDismissBtn" style="color:#000;">关闭</button>` : ''}
  `;

  if (!isLoading && step === 'completed') {
    const downloadBtn = document.getElementById('progressDownloadBtn');
    if (downloadBtn instanceof HTMLButtonElement) {
      downloadBtn.addEventListener('click', async () => {
        if (downloadBtn.dataset.loading === 'true') return;
        setProgressDownloadButtonLoading(downloadBtn, true);
        try {
          await triggerBlobDownload(downloadBtn.dataset.dlUrl ?? '', downloadBtn.dataset.filename ?? '');
          downloadBtn.style.display = 'none';
        } catch {
          setProgressDownloadButtonLoading(downloadBtn, false);
        }
      });
    }
    const dismissBtn = document.getElementById('progressDismissBtn');
    if (dismissBtn) dismissBtn.addEventListener('click', closeProgressModal);
  } else if (!isLoading) {
    const dismissBtn = document.getElementById('progressDismissBtn');
    if (dismissBtn) dismissBtn.addEventListener('click', closeProgressModal);
  }
}

async function promptExportRootSelection(): Promise<string> {
  const pickedPath = await pickDirectoryViaBridge(window);
  if (!pickedPath) {
    throw new Error('无法唤起系统目录选择');
  }
  const exportRoot = normalizeExportRoot(pickedPath);
  const settings = loadSettings();
  saveSettings({ ...settings, exportRoot });
  return exportRoot;
}

async function resolveExportRoot(): Promise<string> {
  try {
    return await promptExportRootSelection();
  } catch {
    const settings = loadSettings();
    const fallback = settings.exportRoot?.trim() ? getEffectiveExportRoot(settings) : '';
    if (fallback) return fallback;
    throw new Error('请选择导出目录后再执行导出');
  }
}

async function startPackagingProcess() {
  console.log('[Packaging] startPackagingProcess called');
  const startBtn = document.getElementById('packageStartBtn') as HTMLButtonElement;
  if (startBtn) startBtn.disabled = true;

  try {
    const selectedProducts: string[] = [];
    document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][id$="_cb"]').forEach(cb => {
      if (cb.checked) selectedProducts.push(cb.value);
    });
    console.log('[Packaging] selectedProducts:', selectedProducts);

    if (selectedProducts.length === 0) {
      showNotification('请至少选择一个产品进行导出');
      if (startBtn) startBtn.disabled = false;
      return;
    }

    const project = await ensureProjectForPackaging();
    console.log('[Packaging] project:', project ? project.id : 'null');
    if (!project) {
      showNotification('请先创建或打开一个项目，再执行导出');
      if (startBtn) startBtn.disabled = false;
      return;
    }

    openProgressModal();
    renderProgress('正在选择导出目录...');

    let exportRoot: string;
    try {
      exportRoot = await resolveExportRoot();
      console.log('[Packaging] exportRoot:', exportRoot);
    } catch (e) {
      console.error('[Packaging] resolveExportRoot failed:', e);
      renderProgress('failed', (e as Error).message);
      return;
    }

    renderProgress('正在提交导出任务...');
    console.log('[Packaging] submitting export job...');

    const vars = getAllCSSVariables();
    const request = buildExportJobRequest({
      project,
      selectedProducts,
      cssVariables: vars,
      exportRoot,
    });

    const updatedProject = appendExportBatchToProject(project, request.batch);
    const savedProject = await saveProject(updatedProject);
    if (!savedProject) {
      const saveError = getLastProjectMutationError();
      renderProgress(
        'failed',
        saveError?.code === 'PROJECT_LIMIT_EXCEEDED'
          ? `当前项目数已达上限，无法记录新的打包任务。${saveError.message}`
          : `保存导出任务失败：${saveError?.message ?? '请稍后重试'}`,
      );
      return;
    }

    persistExportJobQueue(request);

    const dispatchResult = await dispatchExportJobToBridge(window, request);
    console.log('[Packaging] dispatchResult:', JSON.stringify(dispatchResult));
    if (!dispatchResult.accepted) {
      markLatestExportBatchStatus(updatedProject.id, request.batch.id, 'bridge_unavailable');
      renderProgress(
        'failed',
        dispatchResult.error
          ? `导出任务提交失败：${dispatchResult.error}`
          : '导出服务不可用，请检查服务器是否正常运行',
      );
      return;
    }

    renderProgress('导出任务已提交...');
    const backendJobId = dispatchResult.jobId ?? request.batch.id;
    trackExportJobStatus(updatedProject.id, backendJobId, selectedProducts.length);
  } catch (e) {
    console.error('[Packaging] unexpected error:', e);
    if (!document.getElementById('packageProgressModal')?.classList.contains('active')) {
      openProgressModal();
    }
    renderProgress('failed', (e as Error).message);
  }
}

async function markLatestExportBatchStatus(projectId: string, batchId: string, status: ExportBatchStatus) {
  const project = await loadProject(projectId);
  if (!project?.exportBatches) return;
  await saveProject(updateExportBatchInProject(project, batchId, { status }));
}

async function trackExportJobStatus(projectId: string, batchId: string, productCount: number) {
  let attempts = 0;
  const MAX_STATUS_POLL_ATTEMPTS = 120;
  const poll = async () => {
    attempts += 1;
    try {
      const status = await fetchExportJobStatus(fetch, batchId).catch(() => null);
      if (!status) {
        if (attempts >= MAX_STATUS_POLL_ATTEMPTS) {
          renderProgress('failed', '导出任务状态查询超时，请稍后刷新项目列表或重试导出');
          return;
        }
        window.setTimeout(poll, 2000);
        return;
      }

      const project = await loadProject(projectId);
      if (!project) return;

      await saveProject(updateExportBatchInProject(project, batchId, {
        status: status.status,
        exportDir: status.exportDir,
        projectDir: status.projectDir,
        exportRoot: status.exportRoot,
        error: status.error,
      }));

      const statusStr = String(status.status ?? '');

      if (statusStr === 'completed') {
        const snapshotName = (await loadProject(projectId))?.nameEn ?? projectId;
        const dlUrl = resolveApiUrl(`/api/theme/export-jobs/${batchId}/download?all=true`);
        const filename = `${formatExportDatePrefix()}-${snapshotName}.zip`;

        renderProgressWithDownload(
          'completed',
          `<div class="export-steps">
          <div class="export-step"><span class="export-step-num">1</span><span class="export-step-text">点击 <b>下载文件</b> 按钮，保存 zip 包到本地</span></div>
          <div class="export-step"><span class="export-step-num">2</span><span class="export-step-text">解压 zip 包，获得各产品的兼容交付文件</span></div>
          <div class="export-step"><span class="export-step-num">3</span><span class="export-step-text">按历史系统导入规范继续处理兼容交付文件</span></div>
          <div class="export-step"><span class="export-step-num">4</span><span class="export-step-text">在系统中选择新主题，即可切换使用</span></div>
        </div>`,
          dlUrl,
          filename,
        );
        return;
      }

      if (statusStr === 'failed') {
        renderProgress('failed', status.error ?? '请检查服务器日志');
        return;
      }

      const statusLabels: Record<string, string> = {
        queued: '排队中...',
        preparing: '正在准备素材...',
        capturing: '正在截图...',
        packaging: '正在导出兼容包...',
        verifying: '正在验证...',
      };
      renderProgress(statusLabels[statusStr] ?? '处理中...');
      window.setTimeout(poll, 1500);
    } catch (err) {
      if (attempts >= MAX_STATUS_POLL_ATTEMPTS) {
        renderProgress('failed', `状态查询异常：${(err as Error).message}`);
        return;
      }
      window.setTimeout(poll, 2000);
    }
  };

  void poll();
}

export { closeProgressModal, openProgressModal, renderProgress };
