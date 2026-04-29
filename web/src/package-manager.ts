import { getAllCSSVariables } from './theme-engine';
import { appendExportBatchToProject, appendExportJobRequest, buildExportJobRequest, updateExportBatchInProject } from './export/export-job';
import { dispatchExportJobToBridge, pickDirectoryViaBridge } from './export/export-bridge';
import { fetchExportJobStatus } from './export/export-status-client';
import { createProject, getCurrentProjectId, loadProject, saveProject, safeJsonParse, getLastProjectMutationError, setCurrentProjectId } from './project-manager';
import type { ExportBatchStatus, ExportJobQueueEntry } from './types';
import { loadSettings, saveSettings, getEffectiveExportRoot } from './agent/chat-client';
import { normalizeExportRoot } from './export/export-paths';
import { authHeaders } from './auth';

const EXPORT_JOB_QUEUE_KEY = 'theme-studio-export-jobs';

const PACKAGE_PRODUCTS = [
  { id: 'mk', label: 'MK（主题+登录）' },
  { id: 'ekp_v14', label: 'EKP V14（主题+登录）' },
  { id: 'ekp_v15', label: 'EKP V15（主题+登录）' },
  { id: 'ekp_v16', label: 'EKP V16（主题+登录）' },
  { id: 'ekp_v17', label: 'EKP V17（主题+登录）' },
];

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

  createdProject.themeName = projectTitle === '开始新创作' ? 'AI主题' : projectTitle;
  createdProject.lifecycle = 'active';
  setCurrentProjectId(createdProject.id);
  await saveProject(createdProject);
  return createdProject;
}

export function showNotificationWithOptions(
  message: string,
  options: {
    variant?: 'default' | 'critical';
    position?: 'bottom-right' | 'top-center';
    durationMs?: number;
  } = {},
) {
  const toast = document.createElement('div');
  toast.className = 'theme-studio-toast';
  toast.dataset.variant = options.variant ?? 'default';
  toast.dataset.position = options.position ?? 'bottom-right';
  toast.textContent = message;
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '1'; }, 10);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { if (document.body.contains(toast)) document.body.removeChild(toast); }, 300);
  }, options.durationMs ?? 3000);
}

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
  if (startBtn) { startBtn.textContent = '开始打包'; startBtn.disabled = false; }
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

function triggerBlobDownload(dlUrl: string, filename: string) {
  fetch(dlUrl, {
    headers: {
      ...authHeaders(),
    },
  })
    .then(res => {
      if (!res.ok) throw new Error('download failed');
      return res.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    })
    .catch(() => {
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
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
  const title = isLoading ? step : step === 'completed' ? '打包完成' : '打包失败';
  notice?.classList.toggle('is-visible', isLoading);

  content.innerHTML = `
    <div class="package-progress-icon${isLoading ? ' spinning' : ''}">${iconChar}</div>
    <div class="package-progress-title">${title}</div>
    ${detail ? `<div class="package-progress-detail">${detail}</div>` : ''}
    ${step === 'completed' ? `
      <div style="display:flex;gap:12px;justify-content:center;margin-top:8px;">
        ${dlUrl ? `<button class="package-progress-btn success" id="progressDownloadBtn" data-dl-url="${dlUrl}" data-filename="${filename ?? ''}">下载文件</button>` : ''}
        <button class="package-progress-btn error" id="progressDismissBtn" style="background:var(--surface-2,#e5e5e5);color:#000;">关闭</button>
      </div>
    ` : ''}
    ${step === 'failed' ? `<button class="package-progress-btn error" id="progressDismissBtn" style="color:#000;">关闭</button>` : ''}
  `;

  if (!isLoading && step === 'completed') {
    const downloadBtn = document.getElementById('progressDownloadBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        triggerBlobDownload(downloadBtn.dataset.dlUrl ?? '', downloadBtn.dataset.filename ?? '');
        const el = downloadBtn as HTMLElement;
        el.textContent = '已下载';
        (el as HTMLButtonElement).disabled = true;
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
    throw new Error('请选择导出目录后再执行打包');
  }
}

async function startPackagingProcess() {
  const startBtn = document.getElementById('packageStartBtn') as HTMLButtonElement;
  if (startBtn) startBtn.disabled = true;

  try {
    const selectedProducts: string[] = [];
    document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][id$="_cb"]').forEach(cb => {
      if (cb.checked) selectedProducts.push(cb.value);
    });

    if (selectedProducts.length === 0) {
      showNotification('请至少选择一个产品进行打包');
      if (startBtn) startBtn.disabled = false;
      return;
    }

    const project = await ensureProjectForPackaging();
    if (!project) {
      showNotification('请先创建或打开一个项目，再执行打包');
      if (startBtn) startBtn.disabled = false;
      return;
    }

    openProgressModal();
    renderProgress('正在选择导出目录...');

    let exportRoot: string;
    try {
      exportRoot = await resolveExportRoot();
    } catch (e) {
      renderProgress('failed', (e as Error).message);
      return;
    }

    renderProgress('正在提交打包任务...');

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
          : `保存打包任务失败：${saveError?.message ?? '请稍后重试'}`,
      );
      return;
    }

    persistExportJobQueue(request);

    const dispatchResult = await dispatchExportJobToBridge(window, request);
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

    renderProgress('打包任务已提交...');
    const backendJobId = dispatchResult.jobId ?? request.batch.id;
    trackExportJobStatus(updatedProject.id, backendJobId, selectedProducts.length);
  } catch (e) {
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
    const status = await fetchExportJobStatus(fetch, batchId).catch(() => null);
    if (!status) {
      if (attempts >= MAX_STATUS_POLL_ATTEMPTS) {
        renderProgress('failed', '导出任务状态查询超时，请稍后刷新项目列表或重试打包');
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
      const dlUrl = `/api/theme/export-jobs/${batchId}/download?all=true`;
      const filename = `${snapshotName}-all.zip`;

      renderProgressWithDownload(
        'completed',
        `<div class="export-steps">
          <div class="export-step"><span class="export-step-num">1</span><span class="export-step-text">点击 <b>下载文件</b> 按钮，保存 zip 包到本地</span></div>
          <div class="export-step"><span class="export-step-num">2</span><span class="export-step-text">解压 zip 包，获得各产品的主题包文件</span></div>
          <div class="export-step"><span class="export-step-num">3</span><span class="export-step-text">前往 MK 系统门户管理板块导入主题包</span></div>
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
      packaging: '正在打包...',
      verifying: '正在验证...',
    };
    renderProgress(statusLabels[statusStr] ?? '处理中...');
    window.setTimeout(poll, 1500);
  };

  void poll();
}

export { closeProgressModal, openProgressModal, renderProgress };
