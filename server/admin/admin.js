let _authenticated = false;
let _activeUsageUserId = null;
let _overviewDays = 7;

function setOverviewDays(days) {
  _overviewDays = days;
  document.querySelectorAll('.range-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.days) === days);
  });
  const label = '近 ' + days + ' 天';
  document.querySelectorAll('[data-dynamic-label]').forEach(el => { el.textContent = el.dataset.dynamicLabel.replace('{d}', label); });
  if (document.getElementById('tab-users').classList.contains('active')) loadUsers();
  if (document.getElementById('tab-userdata').classList.contains('active')) loadWhitelistUserData();
}

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('.tab-btn[data-tab="' + name + '"]').classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'users') loadUsers();
  if (name === 'userdata') loadWhitelistUserData();
}

function toggleMenu() {
  document.getElementById('menuDropdown').classList.toggle('open');
}

document.addEventListener('click', function(e) {
  var dd = document.getElementById('menuDropdown');
  if (dd && !e.target.closest('.menu-btn') && !e.target.closest('.menu-dropdown')) dd.classList.remove('open');
});

document.getElementById('landingPromptsModal').addEventListener('click', function(e) {
  if (e.target === e.currentTarget) hideLandingPromptsModal();
});

function toast(msg, type) {
  type = type || 'success';
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type + ' show';
  setTimeout(function() { el.classList.remove('show'); }, 3000);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(value) {
  if (!value) return '-';
  try {
    return new Date(Number(value)).toLocaleString('zh-CN');
  } catch (_e) {
    return '-';
  }
}

function renderSparkline(points, options) {
  options = options || {};
  var safePoints = Array.isArray(points) && points.length > 0
    ? points
    : Array.from({ length: _overviewDays }, function(_v, index) {
        return { label: '' + (index + 1), count: 0 };
      });
  var maxCount = Math.max.apply(null, safePoints.map(function(pt) { return Number(pt && pt.count != null ? pt.count : 0); }).concat([1]));
  var sparklineClass = options.compact ? 'sparkline' : 'sparkline large';
  var emptyClass = safePoints.every(function(pt) { return Number(pt && pt.count != null ? pt.count : 0) === 0; }) ? ' empty' : '';
  var bars = safePoints.map(function(pt) {
    var count = Math.max(0, Number(pt && pt.count != null ? pt.count : 0));
    var height = count === 0 ? 8 : Math.max(12, Math.round((count / maxCount) * 100));
    return '<div class="sparkline-slot" title="' + escapeHtml(pt.label + ': ' + count) + '">' +
      '<div class="sparkline-bar" style="height: ' + height + '%"></div></div>';
  }).join('');
  var labels = safePoints.map(function(pt) { return '<span>' + escapeHtml(pt.label != null ? pt.label : '') + '</span>'; }).join('');
  return '<div class="' + sparklineClass + emptyClass + '">' + bars + '</div>' +
    '<div class="sparkline-labels">' + labels + '</div>';
}

function renderUsageOverview(data) {
  var summary = (data && data.summary) || {};
  document.getElementById('usageOverviewTotalCalls').textContent = String(summary.totalImageCalls != null ? summary.totalImageCalls : 0);
  document.getElementById('usageOverviewActiveUsers').textContent = String(summary.activeUserCount != null ? summary.activeUserCount : 0);
  document.getElementById('usageOverviewDownloadCount').textContent = String(summary.totalDownloadCount != null ? summary.totalDownloadCount : 0);
}

function setUserUsageSummary(data) {
  document.getElementById('userUsageCountValue').textContent = String((data && data.summary && data.summary.totalImageCalls) != null ? data.summary.totalImageCalls : 0);
  document.getElementById('userDownloadCountValue').textContent = String((data && data.summary && data.summary.totalDownloadCount) != null ? data.summary.totalDownloadCount : 0);
  document.getElementById('userUsageTrend').innerHTML = renderSparkline(data && data.trend, { compact: false });
}

function formatUsageStatus(status) {
  if (status === 'success') return '成功';
  if (status === 'failed') return '失败';
  return '处理中';
}

function buildRecordTooltip(item) {
  var segments = [
    '时间: ' + formatTime(item.startedAt),
    '模型: ' + (item.modelProvider || '-') + ' / ' + (item.modelName || '-'),
    '输入: ' + (item.rawInput || item.finalPrompt || '-'),
  ];
  if (item.status === 'failed' && item.errorMessage) {
    segments.push('失败原因: ' + item.errorMessage);
  }
  return segments.join('\n');
}

function renderUserUsageRecords(items) {
  var container = document.getElementById('userUsageRecordList');
  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = '<div class="empty-state">近 7 天暂无生图记录</div>';
    return;
  }
  container.innerHTML = items.map(function(item) {
    var modelText = (item.modelProvider || '-') + ' / ' + (item.modelName || '-');
    var inputText = item.rawInput || item.finalPrompt || '-';
    var tooltip = buildRecordTooltip(item);
    return '<div class="record-item">' +
      '<div class="record-time">' + escapeHtml(formatTime(item.startedAt)) + '</div>' +
      '<div class="record-cell" title="' + escapeHtml(modelText) + '">' + escapeHtml(modelText) + '</div>' +
      '<div class="record-cell" title="' + escapeHtml(tooltip) + '">' + escapeHtml(inputText) + '</div>' +
      '<div class="record-status"><span class="status-pill ' + escapeHtml(item.status || 'pending') + '">' + escapeHtml(formatUsageStatus(item.status)) + '</span></div>' +
      '</div>';
  }).join('');
}

function renderUserDownloadRecords(items) {
  var container = document.getElementById('userDownloadRecordList');
  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无主题下载记录</div>';
    return;
  }
  container.innerHTML = items.map(function(item) {
    var downloadText = item.finalPrompt || item.rawInput || item.jobId || '-';
    var tooltip = [
      '时间: ' + formatTime(item.startedAt),
      '下载内容: ' + downloadText,
      item.status === 'failed' && item.errorMessage ? '失败原因: ' + item.errorMessage : '',
    ].filter(Boolean).join('\n');
    return '<div class="record-item">' +
      '<div class="record-time">' + escapeHtml(formatTime(item.startedAt)) + '</div>' +
      '<div class="record-cell" title="' + escapeHtml(item.jobId || '-') + '">' + escapeHtml(item.jobId || '-') + '</div>' +
      '<div class="record-cell" title="' + escapeHtml(tooltip) + '">' + escapeHtml(downloadText) + '</div>' +
      '<div class="record-status"><span class="status-pill ' + escapeHtml(item.status || 'pending') + '">' + escapeHtml(formatUsageStatus(item.status)) + '</span></div>' +
      '</div>';
  }).join('');
}

function closeUserUsageDrawer() {
  _activeUsageUserId = null;
  document.getElementById('userUsageDrawer').classList.remove('open');
  document.getElementById('userUsageDrawer').setAttribute('aria-hidden', 'true');
  document.getElementById('userUsageDrawerOverlay').classList.remove('open');
}

async function openUserUsageDrawer(userId, loginName, displayName) {
  if (!_authenticated) {
    toast('请先进行管理员身份验证', 'error');
    return;
  }

  _activeUsageUserId = userId;
  document.getElementById('userUsageDrawerTitle').textContent = displayName || loginName || '用户 #' + userId;
  document.getElementById('userUsageDrawerSubtitle').textContent = (loginName || '用户 #' + userId) + ' 的生图趋势与最近记录';
  setUserUsageSummary({ summary: { totalImageCalls: '-' }, trend: [] });
  renderUserUsageRecords([]);
  renderUserDownloadRecords([]);
  document.getElementById('userUsageDrawer').classList.add('open');
  document.getElementById('userUsageDrawer').setAttribute('aria-hidden', 'false');
  document.getElementById('userUsageDrawerOverlay').classList.add('open');

  try {
    var res = await fetch('/api/admin/usage-logs/users/' + userId + '?limit=20&days=' + _overviewDays, { credentials: 'same-origin' });
    if (res.status === 401) { closeUserUsageDrawer(); showLoginSection(); toast('登录已过期，请重新登录', 'error'); return; }
    var data = await res.json();
    if (_activeUsageUserId !== userId) return;
    setUserUsageSummary(data || {});
    renderUserUsageRecords(Array.isArray(data.items) ? data.items : []);
    renderUserDownloadRecords(Array.isArray(data.downloadItems) ? data.downloadItems : []);
  } catch (e) {
    toast('加载用户使用情况失败: ' + e.message, 'error');
  }
}

function getCreditsLimitEnabled() {
  var input = document.getElementById('enableCreditsLimit');
  return Boolean(input && input.checked);
}

function syncCreditsToggleUi(enabled) {
  var input = document.getElementById('enableCreditsLimit');
  var section = document.getElementById('creditsSettingsSection');
  if (input) {
    input.checked = enabled;
  }
  if (section) {
    section.style.display = enabled ? 'block' : 'none';
  }
}

function toggleCreditsSettings(forceValue) {
  var enabled = typeof forceValue === 'boolean'
    ? forceValue
    : !getCreditsLimitEnabled();
  syncCreditsToggleUi(enabled);
}

var IMAGE_PROVIDER_DEFAULTS = {
  minimax: {
    endpoint: 'https://api.minimax.chat/v1/image_generation',
    model: 'image-01',
  },
  jimeng: {
    endpoint: 'https://visual.volcengineapi.com',
    model: 'jimeng_t2i_v40',
  },
  ark: {
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    model: 'doubao-seedream-3-0-t2i-250415',
  },
};

function toggleImageProviderFields() {
  var provider = document.getElementById('imageProvider').value;
  var useApiKey = provider === 'minimax';

  document.getElementById('imageApiKeyBlock').style.display = useApiKey ? 'block' : 'none';
  document.getElementById('imageAccessKeyIdBlock').style.display = useApiKey ? 'none' : 'block';
  document.getElementById('imageSecretAccessKeyBlock').style.display = useApiKey ? 'none' : 'block';

  var defaults = IMAGE_PROVIDER_DEFAULTS[provider];
  if (defaults) {
    var endpointEl = document.getElementById('imageEndpoint');
    var modelEl = document.getElementById('imageModel');
    var currentEndpoint = endpointEl.value.trim();
    var currentModel = modelEl.value.trim();
    var isEndpointFromOtherProvider = false;
    var isModelFromOtherProvider = false;
    for (var p in IMAGE_PROVIDER_DEFAULTS) {
      if (p !== provider) {
        if (currentEndpoint === IMAGE_PROVIDER_DEFAULTS[p].endpoint) isEndpointFromOtherProvider = true;
        if (currentModel === IMAGE_PROVIDER_DEFAULTS[p].model) isModelFromOtherProvider = true;
      }
    }
    if (!currentEndpoint || isEndpointFromOtherProvider) endpointEl.value = defaults.endpoint;
    if (!currentModel || isModelFromOtherProvider) modelEl.value = defaults.model;
  }
}

function showAdminPanel() {
  _authenticated = true;
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
}

function showLoginSection() {
  _authenticated = false;
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('adminPassword').value = '';
}

toggleImageProviderFields();

async function authenticateAdmin() {
  var password = document.getElementById('adminPassword').value;
  if (!password) {
    toast('请输入管理员密码', 'error');
    return;
  }

  try {
    var res = await fetch('/api/admin-auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password }),
    });
    var data = await res.json();

    if (res.status === 429) {
      toast(data.error || '登录失败次数过多，请稍后再试', 'error');
      return;
    }

    if (!res.ok) {
      toast(data.error || '密码不正确', 'error');
      return;
    }

    showAdminPanel();
    toast('认证成功，欢迎使用管理面板');
    loadConfig();
    loadUsers();
  } catch (e) {
    toast(e.message || '认证失败，请检查网络', 'error');
  }
}

async function logoutAdmin() {
  if (!confirm('确认退出登录？')) return;
  try {
    await fetch('/api/admin-auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
  } catch (_e) { /* ignore */ }
  showLoginSection();
}

async function loadConfig() {
  if (!_authenticated) {
    toast('请先进行管理员身份验证', 'error');
    return;
  }

  try {
    var res = await fetch('/api/model-config', { credentials: 'same-origin' });
    if (res.status === 401) { showLoginSection(); toast('登录已过期，请重新登录', 'error'); return; }
    var data = await res.json();
    document.getElementById('chatEndpoint').value = data.chatEndpoint || '';
    document.getElementById('chatApiKey').value = data.chatApiKey || '';
    document.getElementById('chatModel').value = data.chatModel || '';
    document.getElementById('imageProvider').value = data.imageProvider || 'minimax';
    document.getElementById('imageEndpoint').value = data.imageEndpoint || '';
    document.getElementById('imageApiKey').value = data.imageApiKey || '';
    document.getElementById('imageAccessKeyId').value = data.imageAccessKeyId || '';
    document.getElementById('imageSecretAccessKey').value = data.imageSecretAccessKey || '';
    document.getElementById('imageModel').value = data.imageModel || '';
    toggleImageProviderFields();

    var securityRes = await fetch('/api/security-config', { credentials: 'same-origin' });
    if (securityRes.status === 401) { showLoginSection(); toast('登录已过期，请重新登录', 'error'); return; }
    var securityData = await securityRes.json();
    document.getElementById('corsAllowlist').value = (securityData.corsOrigins || []).join('\n');
    document.getElementById('proxyImageAllowlist').value = (securityData.proxyImageHosts || []).join('\n');
    document.getElementById('dailyCreditsLimit').value = securityData.dailyCreditsLimit != null ? securityData.dailyCreditsLimit : '100';
    document.getElementById('creditsPerImage').value = securityData.creditsPerImage != null ? securityData.creditsPerImage : '50';
    document.getElementById('backupRetentionCount').value = securityData.backupRetentionCount != null ? securityData.backupRetentionCount : '8';
    document.getElementById('exportRetentionDays').value = securityData.exportRetentionDays != null ? securityData.exportRetentionDays : '7';
    document.getElementById('exportPreviewMode').value = securityData.exportPreviewMode || 'auto';
    document.getElementById('creditsTooltipContent').value = securityData.creditsTooltipContent || '';

    var creditsEnabled = !(securityData.enabledFeatures && securityData.enabledFeatures.quota === false);
    syncCreditsToggleUi(creditsEnabled);

    _whitelistConfig.enabled = securityData.whitelistEnabled || false;
    _whitelistConfig.users = securityData.whitelistUsers || [];
    renderWhitelist();

    loadLandingPromptsConfig();
  } catch (e) {
    console.error('Error loading configuration:', e);
    toast('加载配置失败: ' + e.message, 'error');
  }
}

async function saveConfig() {
  if (!_authenticated) {
    toast('请先进行管理员身份验证', 'error');
    return;
  }

  try {
    var readErrorMessage = async function(response, fallbackMessage) {
      try {
        var d = await response.json();
        return (d && d.error) || fallbackMessage;
      } catch (_e) {
        return fallbackMessage;
      }
    };

    var body = {
      chatEndpoint: document.getElementById('chatEndpoint').value,
      chatApiKey: document.getElementById('chatApiKey').value,
      chatModel: document.getElementById('chatModel').value,
      imageProvider: document.getElementById('imageProvider').value,
      imageEndpoint: document.getElementById('imageEndpoint').value,
      imageApiKey: document.getElementById('imageApiKey').value,
      imageAccessKeyId: document.getElementById('imageAccessKeyId').value,
      imageSecretAccessKey: document.getElementById('imageSecretAccessKey').value,
      imageModel: document.getElementById('imageModel').value,
      corsAllowlist: document.getElementById('corsAllowlist').value
        .split('\n')
        .map(function(item) { return item.trim(); })
        .filter(function(item) { return item.length > 0; }),
      proxyImageHosts: document.getElementById('proxyImageAllowlist').value
        .split('\n')
        .map(function(item) { return item.trim(); })
        .filter(function(item) { return item.length > 0; }),
      rateLimits: undefined,
      enabledFeatures: {
        export: true,
        proxyImage: true,
        image: true,
        chat: true,
        cors: true,
        quota: getCreditsLimitEnabled(),
        adminAuth: true,
        rateLimiting: true
      },
      dailyCreditsLimit: parseInt(document.getElementById('dailyCreditsLimit').value) || 100,
      creditsPerImage: parseInt(document.getElementById('creditsPerImage').value) || 50,
      backupRetentionCount: parseInt(document.getElementById('backupRetentionCount').value) || 8,
      exportRetentionDays: parseInt(document.getElementById('exportRetentionDays').value) || 7,
      exportPreviewMode: document.getElementById('exportPreviewMode').value,
      creditsTooltipContent: document.getElementById('creditsTooltipContent').value
    };

    var fetchOpts = {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
    };

    var results = await Promise.allSettled([
      fetch('/api/model-config', Object.assign({}, fetchOpts, {
        body: JSON.stringify({
          chatEndpoint: body.chatEndpoint,
          chatApiKey: body.chatApiKey,
          chatModel: body.chatModel,
          imageProvider: body.imageProvider,
          imageEndpoint: body.imageEndpoint,
          imageApiKey: body.imageApiKey,
          imageAccessKeyId: body.imageAccessKeyId,
          imageSecretAccessKey: body.imageSecretAccessKey,
          imageModel: body.imageModel,
        }),
      })),
      fetch('/api/security-config', Object.assign({}, fetchOpts, {
        body: JSON.stringify({
          corsOrigins: body.corsAllowlist,
          proxyImageHosts: body.proxyImageHosts,
          rateLimits: body.rateLimits ? { rateLimits: body.rateLimits } : {},
          enabledFeatures: body.enabledFeatures,
          dailyCreditsLimit: body.dailyCreditsLimit,
          creditsPerImage: body.creditsPerImage,
          backupRetentionCount: body.backupRetentionCount,
          exportRetentionDays: body.exportRetentionDays,
          exportPreviewMode: body.exportPreviewMode,
          creditsTooltipContent: body.creditsTooltipContent,
        })
      }))
    ]);

    var modelRes = results[0];
    var securityRes = results[1];
    var successCount = 0;

    if (modelRes.status === 'fulfilled' && modelRes.value.ok) {
      var modelData = await modelRes.value.json();
      if (modelData.success) {
        successCount++;
      } else {
        toast(modelData.error || '模型配置保存失败', 'error');
      }
    } else if (modelRes.status === 'fulfilled') {
      if (modelRes.value.status === 401) {
        showLoginSection();
        toast('登录已过期，请重新登录', 'error');
        return;
      }
      toast(await readErrorMessage(modelRes.value, '模型配置保存失败 (' + modelRes.value.status + ')'), 'error');
    } else if (modelRes.reason) {
      toast('模型配置保存失败: ' + modelRes.reason.message, 'error');
    }

    if (securityRes.status === 'fulfilled' && securityRes.value.ok) {
      var securityDataRes = await securityRes.value.json();
      if (securityDataRes.success) {
        successCount++;
      } else {
        toast(securityDataRes.error || '安全配置保存失败', 'error');
      }
    } else if (securityRes.status === 'fulfilled') {
      if (securityRes.value.status === 401) {
        showLoginSection();
        toast('登录已过期，请重新登录', 'error');
        return;
      }
      toast(await readErrorMessage(securityRes.value, '安全配置保存失败 (' + securityRes.value.status + ')'), 'error');
    } else if (securityRes.reason) {
      toast('安全配置保存失败: ' + securityRes.reason.message, 'error');
    }

    if (successCount === 2) {
      toast('配置已保存');
    } else if (successCount > 0) {
      toast('配置已保存 (' + successCount + '/2 成功)');
    }

    saveLandingPromptsConfig();
  } catch (e) {
    toast('保存失败: ' + e.message, 'error');
  }
}

var _landingPromptsEntries = [];
var _landingPromptsEnabled = true;

function getDefaultLandingPromptEntries() {
  return [
    { label: '做一套春节氛围主题，热闹一点', prompt: '萌系3D卡通风格，营造新年喜庆且温馨的视觉氛围。大透视构图，极低的仰视角度，超广角镜头拍摄的人物，呈现狮子头与镜头互动，画面以巨大狮子头主导视觉，主体是一个穿着华丽的传统服装的舞狮福娃一跃而起，将狮子头抛向镜头，表情开心。以正红色为背景，人物周围悬浮着金币和金元宝和红包，3D渲染风格，类似皮克斯动画质感。16:9，1080P。', primaryHint: '#C90808' },
    { label: '生成一套科技感企业门户皮肤', prompt: '主色神空蓝，未来感 流动彩带光束带 由远到近环绕 背景模糊的光晕 4K超高清细节。16:9，1080P。', primaryHint: '#0E50D6' },
    { label: '想要一个高级蓝色商务主题', prompt: '流畅极少蓝白色渐变小笔刷发光在变换、空间感，光线追踪，浩渺感，孤独感，全景视角，透白渐变背景，流光溢彩，C4d建模。16:9，1080P。', primaryHint: '#138AEB' },
    { label: '来一套国风政务风格主题包', prompt: '创作一幅大气简约的国风国庆主题海报，采用纵向构图，背景为红橙渐变的暖色调，带有细腻的光影层次以营造喜庆氛围。画面中景呈现被暖光笼罩的古代风格古典宫殿建筑；背景是朦胧的金色山水轮廓，天空点缀着绽放的烟花；整体风格融合国风意境与现代光影设计。16:9，1080P。', primaryHint: '#DA0404' },
  ];
}

function syncLandingPromptsToggleUi(enabled) {
  var input = document.getElementById('enableLandingPrompts');
  var manageBtn = document.getElementById('landingPromptsManageBtn');
  if (input) input.checked = enabled;
  if (manageBtn) manageBtn.style.display = enabled ? 'block' : 'none';
}

function toggleLandingPromptsSwitch(forceValue) {
  var enabled = typeof forceValue === 'boolean'
    ? forceValue
    : !(document.getElementById('enableLandingPrompts') && document.getElementById('enableLandingPrompts').checked);
  _landingPromptsEnabled = enabled;
  syncLandingPromptsToggleUi(enabled);
  saveLandingPromptsToggle(enabled);
}

async function saveLandingPromptsToggle(enabled) {
  try {
    await fetch('/api/landing-prompts-config', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: _landingPromptsEntries, enabled: enabled }),
    });
    toast(enabled ? '快捷主题已开启' : '快捷主题已关闭');
  } catch (e) {
    toast('保存失败: ' + e.message, 'error');
  }
}

function renderLandingPromptsEditor(entries) {
  var container = document.getElementById('landingPromptsModalList');
  if (!container) return;
  container.innerHTML = '';
  entries.forEach(function(entry, index) {
    var item = document.createElement('div');
    item.style.cssText = 'background:var(--input-bg);border:1px solid var(--border);border-radius:10px;padding:14px 16px;';
    item.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
        '<span style="font-size:13px;color:var(--muted);">#' + (index + 1) + '</span>' +
        '<button class="btn-danger btn-sm" data-lp-remove="' + index + '" style="font-size:11px;padding:2px 8px;">删除</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 120px;gap:8px;margin-bottom:8px;">' +
        '<div>' +
          '<label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">标题文案</label>' +
          '<input style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;" id="lp_label_' + index + '" type="text" value="' + escapeHtml(entry.label) + '" placeholder="按钮显示文字">' +
        '</div>' +
        '<div>' +
          '<label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">主题色</label>' +
          '<input style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;" id="lp_color_' + index + '" type="text" value="' + escapeHtml(entry.primaryHint || '') + '" placeholder="#RRGGBB">' +
        '</div>' +
      '</div>' +
      '<div>' +
        '<label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">Prompt 咒语</label>' +
        '<textarea style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;resize:vertical;min-height:60px;" id="lp_prompt_' + index + '" placeholder="图片生成 Prompt">' + escapeHtml(entry.prompt) + '</textarea>' +
      '</div>';
    container.appendChild(item);
  });
}

function readLandingPromptsEditor() {
  return _landingPromptsEntries.map(function(_entry, index) {
    var labelEl = document.getElementById('lp_label_' + index);
    var promptEl = document.getElementById('lp_prompt_' + index);
    var colorEl = document.getElementById('lp_color_' + index);
    return {
      label: (labelEl ? labelEl.value : '').trim(),
      prompt: (promptEl ? promptEl.value : '').trim(),
      primaryHint: (colorEl ? colorEl.value : '').trim(),
    };
  }).filter(function(e) { return e.label || e.prompt; });
}

async function loadLandingPromptsConfig() {
  try {
    var res = await fetch('/api/landing-prompts-config', { credentials: 'same-origin' });
    if (res.status === 401) return;
    var data = await res.json();
    _landingPromptsEnabled = data.enabled !== false;
    _landingPromptsEntries = Array.isArray(data.entries) && data.entries.length > 0
      ? data.entries
      : getDefaultLandingPromptEntries();
  } catch (_e) {
    _landingPromptsEnabled = true;
    _landingPromptsEntries = getDefaultLandingPromptEntries();
  }
  syncLandingPromptsToggleUi(_landingPromptsEnabled);
}

function addLandingPromptEntry() {
  var current = readLandingPromptsEditor();
  current.push({ label: '', prompt: '', primaryHint: '' });
  _landingPromptsEntries = current;
  renderLandingPromptsEditor(current);
}

function removeLandingPromptEntry(index) {
  var current = readLandingPromptsEditor();
  current.splice(index, 1);
  _landingPromptsEntries = current;
  renderLandingPromptsEditor(current);
}

function showLandingPromptsModal() {
  renderLandingPromptsEditor(_landingPromptsEntries);
  document.getElementById('landingPromptsModal').classList.add('open');
}

function hideLandingPromptsModal() {
  _landingPromptsEntries = readLandingPromptsEditor();
  document.getElementById('landingPromptsModal').classList.remove('open');
}

async function saveLandingPromptsFromModal() {
  var entries = readLandingPromptsEditor().filter(function(e) { return e.label && e.prompt; });
  if (entries.length === 0) {
    toast('至少需要一条有效条目（标题和咒语不能为空）', 'error');
    return;
  }
  _landingPromptsEntries = entries;
  try {
    var res = await fetch('/api/landing-prompts-config', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: entries, enabled: _landingPromptsEnabled }),
    });
    if (res.ok) {
      toast('快捷主题内容已保存');
      hideLandingPromptsModal();
    } else {
      var data = await res.json();
      toast(data.error || '保存失败', 'error');
    }
  } catch (e) {
    toast('保存失败: ' + e.message, 'error');
  }
}

function resetLandingPromptsToDefault() {
  _landingPromptsEntries = getDefaultLandingPromptEntries();
  renderLandingPromptsEditor(_landingPromptsEntries);
  toast('已恢复默认配置（点击「保存」生效）');
}

async function saveLandingPromptsConfig() {
  var entries = _landingPromptsEntries.filter(function(e) { return e.label && e.prompt; });
  if (entries.length === 0) return;
  try {
    await fetch('/api/landing-prompts-config', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: entries, enabled: _landingPromptsEnabled }),
    });
  } catch (_e) { /* non-critical */ }
}

async function testConnection() {
  if (!_authenticated) {
    toast('请先进行管理员身份验证', 'error');
    return;
  }

  var statusEl = document.getElementById('connectionStatus');
  statusEl.innerHTML = '测试中...';
  try {
    await fetch('/api/health', { credentials: 'same-origin' }).then(function(r) { return r.json(); });
    statusEl.innerHTML = '<span class="status-dot ok"></span>服务正常运行';
  } catch (e) {
    statusEl.innerHTML = '<span class="status-dot err"></span>连接失败: ' + e.message;
  }
}

async function loadUsers() {
  if (!_authenticated) {
    toast('请先进行管理员身份验证', 'error');
    return;
  }

  try {
    var res = await fetch('/api/admin/usage-logs/overview?days=' + _overviewDays, { credentials: 'same-origin' });
    if (res.status === 401) { showLoginSection(); toast('登录已过期，请重新登录', 'error'); return; }
    var data = await res.json();
    var users = Array.isArray(data.users) ? data.users : [];
    renderUsageOverview(data);
    var tbody = document.getElementById('userTableBody');
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="color: var(--muted);">暂无用户记录</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(function(u) {
      return '<tr>' +
        '<td>' + escapeHtml(u.name) + '</td>' +
        '<td>' + escapeHtml(u.displayName) + '</td>' +
        '<td>' + (u.lastLoginAt ? new Date(u.lastLoginAt * 1000).toLocaleString('zh-CN') : '-') + '</td>' +
        '<td><button type="button" class="btn-primary btn-sm user-action-btn"' +
          ' data-uid="' + Number(u.id) + '"' +
          ' data-uname="' + escapeHtml(String(u.name != null ? u.name : '')) + '"' +
          ' data-udisplay="' + escapeHtml(String(u.displayName != null ? u.displayName : '')) + '"' +
          '>查看使用情况</button></td>' +
        '</tr>';
    }).join('');
  } catch (e) {
    toast('加载用户失败: ' + e.message, 'error');
  }
}

var _whitelistConfig = { enabled: false, users: [] };

function toggleWhitelistSwitch() {
  var enabled = !_whitelistConfig.enabled;
  _whitelistConfig.enabled = enabled;
  var cb = document.getElementById('enableWhitelist');
  if (cb) cb.checked = enabled;
  var btn = document.getElementById('whitelistManageBtn');
  if (btn) btn.style.display = enabled ? 'block' : 'none';
  var tabBtn = document.getElementById('tabBtnWhitelist');
  if (tabBtn) tabBtn.style.display = enabled ? '' : 'none';
  saveWhitelist();
}

function showWhitelistModal() {
  document.getElementById('whitelistModal').classList.add('open');
}

function hideWhitelistModal() {
  document.getElementById('whitelistModal').classList.remove('open');
}

document.getElementById('whitelistModal').addEventListener('click', function(e) {
  if (e.target === e.currentTarget) hideWhitelistModal();
});

function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function renderWhitelist() {
  var cb = document.getElementById('enableWhitelist');
  if (cb) cb.checked = _whitelistConfig.enabled;
  var btn = document.getElementById('whitelistManageBtn');
  if (btn) btn.style.display = _whitelistConfig.enabled ? 'block' : 'none';
  var tabBtn = document.getElementById('tabBtnWhitelist');
  if (tabBtn) tabBtn.style.display = _whitelistConfig.enabled ? '' : 'none';
  if (!_whitelistConfig.enabled && tabBtn && tabBtn.classList.contains('active')) {
    switchTab('config');
  }
  var list = document.getElementById('whitelistUsersList');
  if (list) {
    if (_whitelistConfig.users.length === 0) {
      list.innerHTML = '<div style="color:var(--muted);text-align:center;padding:16px 8px;font-size:13px">暂无白名单用户</div>';
    } else {
      list.innerHTML = _whitelistConfig.users.map(function(u) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid var(--border)">' +
          '<span style="font-size:14px">' + esc(u) + '</span>' +
          '<button data-wl-remove="' + esc(u) + '" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;padding:2px 6px">移除</button>' +
          '</div>';
      }).join('');
    }
  }
}

async function addWhitelistUser() {
  var input = document.getElementById('whitelistAddInput');
  var name = input.value.trim();
  if (!name) return;
  if (_whitelistConfig.users.includes(name)) { input.value = ''; return; }
  _whitelistConfig.users.push(name);
  input.value = '';
  await saveWhitelist();
}

async function removeWhitelistUser(name) {
  _whitelistConfig.users = _whitelistConfig.users.filter(function(u) { return u !== name; });
  await saveWhitelist();
}

async function saveWhitelist() {
  try {
    var res = await fetch('/api/security-config', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whitelistEnabled: _whitelistConfig.enabled, whitelistUsers: _whitelistConfig.users }),
    });
    if (res.status === 401) { showLoginSection(); toast('登录已过期，请重新登录', 'error'); return; }
    if (!res.ok) {
      var data = await res.json().catch(function() { return {}; });
      throw new Error(data.error || '白名单配置保存失败');
    }
    renderWhitelist();
    if (document.getElementById('tab-userdata').classList.contains('active')) {
      await loadWhitelistUserData();
    }
  } catch (e) {
    console.error('saveWhitelist error', e);
    toast('保存白名单失败: ' + e.message, 'error');
  }
}

async function loadWhitelistUserData() {
  if (!_whitelistConfig.enabled || _whitelistConfig.users.length === 0) {
    document.getElementById('wlTotalCount').textContent = _whitelistConfig.users.length || '0';
    document.getElementById('wlActiveCount').textContent = '0';
    document.getElementById('wlTotalCalls').textContent = '0';
    document.getElementById('wlTotalDownloads').textContent = '0';
    document.getElementById('whitelistUserCards').innerHTML =
      '<div style="color:var(--muted);text-align:center;padding:32px;grid-column:1/-1">暂无白名单用户</div>';
    return;
  }

  try {
    var overviewRes = await fetch('/api/admin/usage-logs/overview?days=' + _overviewDays, { credentials: 'same-origin' });
    if (overviewRes.status === 401) { showLoginSection(); toast('登录已过期，请重新登录', 'error'); return; }
    if (!overviewRes.ok) {
      var errData = await overviewRes.json().catch(function() { return {}; });
      throw new Error(errData.error || '加载白名单用户概览失败');
    }
    var overviewData = await overviewRes.json();
    var allUsers = Array.isArray(overviewData.users) ? overviewData.users : [];

    var whitelistSet = new Set(_whitelistConfig.users);
    var wlUsers = allUsers.filter(function(u) { return whitelistSet.has(u.name); });

    var totalCalls = 0;
    var totalDownloads = 0;
    var activeCount = 0;
    wlUsers.forEach(function(u) {
      var calls = Number(u.imageCalls || 0);
      var dls = Number(u.downloads || 0);
      totalCalls += calls;
      totalDownloads += dls;
      if (calls > 0 || dls > 0) activeCount++;
    });

    document.getElementById('wlTotalCount').textContent = _whitelistConfig.users.length;
    document.getElementById('wlActiveCount').textContent = activeCount;
    document.getElementById('wlTotalCalls').textContent = totalCalls;
    document.getElementById('wlTotalDownloads').textContent = totalDownloads;

    var container = document.getElementById('whitelistUserCards');
    if (wlUsers.length === 0) {
      container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:32px;grid-column:1/-1">白名单中的用户尚无使用记录</div>';
      return;
    }

    container.innerHTML = wlUsers.map(function(u) {
      return '<div class="wl-card" style="border:1px solid var(--border);border-radius:10px;padding:14px 16px;cursor:pointer;transition:box-shadow .15s"' +
        ' data-uid="' + Number(u.id) + '"' +
        ' data-uname="' + esc(u.name != null ? u.name : '') + '"' +
        ' data-udisplay="' + esc(u.displayName != null ? u.displayName : '') + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<span style="font-weight:600;font-size:14px">' + esc(u.displayName || u.name || 'user-' + u.id) + '</span>' +
          '<span style="font-size:11px;color:var(--muted)">' + (u.lastLoginAt ? new Date(u.lastLoginAt * 1000).toLocaleDateString('zh-CN') : '-') + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:16px;font-size:13px;color:var(--muted)">' +
          '<span>积分: <b style="color:var(--text)">' + (u.credits != null ? u.credits : 0) + '</b></span>' +
          '<span>生图: <b style="color:var(--text)">' + (u.imageCalls != null ? u.imageCalls : 0) + '</b></span>' +
          '<span>下载: <b style="color:var(--text)">' + (u.downloads != null ? u.downloads : 0) + '</b></span>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (e) {
    console.error('loadWhitelistUserData error', e);
    toast('加载白名单用户失败: ' + e.message, 'error');
  }
}

// --- Event listeners (static elements) ---
document.getElementById('loginBtn').addEventListener('click', authenticateAdmin);

document.getElementById('adminPassword').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') authenticateAdmin();
});

document.getElementById('menuBtn').addEventListener('click', toggleMenu);

document.getElementById('menuDropdown').addEventListener('click', function(e) {
  var btn = e.target.closest('button[data-action]');
  if (!btn) return;
  var action = btn.dataset.action;
  if (action === 'logout') logoutAdmin();
});

document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    switchTab(this.dataset.tab);
  });
});

document.getElementById('imageProvider').addEventListener('change', toggleImageProviderFields);

document.getElementById('landingPromptsSwitchLabel').addEventListener('click', function(e) {
  e.preventDefault();
  toggleLandingPromptsSwitch();
});

document.getElementById('whitelistSwitchLabel').addEventListener('click', function(e) {
  e.preventDefault();
  toggleWhitelistSwitch();
});

document.getElementById('creditsSwitchLabel').addEventListener('click', function(e) {
  e.preventDefault();
  toggleCreditsSettings();
});

document.getElementById('lpManageBtn').addEventListener('click', showLandingPromptsModal);
document.getElementById('wlManageBtn').addEventListener('click', showWhitelistModal);
document.getElementById('saveConfigBtn').addEventListener('click', saveConfig);
document.getElementById('testConnectionBtn').addEventListener('click', testConnection);

document.addEventListener('click', function(e) {
  var rangeBtn = e.target.closest('.range-btn');
  if (rangeBtn && rangeBtn.dataset.days) {
    setOverviewDays(Number(rangeBtn.dataset.days));
  }
});

document.getElementById('userUsageDrawerOverlay').addEventListener('click', closeUserUsageDrawer);
document.getElementById('drawerCloseBtn').addEventListener('click', closeUserUsageDrawer);

document.getElementById('wlModalCloseBtn').addEventListener('click', hideWhitelistModal);

document.getElementById('whitelistAddInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addWhitelistUser();
});

document.getElementById('wlAddBtn').addEventListener('click', addWhitelistUser);
document.getElementById('lpModalCloseBtn').addEventListener('click', hideLandingPromptsModal);
document.getElementById('lpAddEntryBtn').addEventListener('click', addLandingPromptEntry);
document.getElementById('lpResetBtn').addEventListener('click', resetLandingPromptsToDefault);
document.getElementById('lpSaveBtn').addEventListener('click', saveLandingPromptsFromModal);

// Event delegation for dynamic content
document.getElementById('landingPromptsModalList').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-lp-remove]');
  if (btn) removeLandingPromptEntry(Number(btn.dataset.lpRemove));
});

document.getElementById('userTableBody').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-uid]');
  if (btn) {
    openUserUsageDrawer(
      Number(btn.dataset.uid),
      btn.dataset.uname,
      btn.dataset.udisplay
    );
  }
});

document.getElementById('whitelistUsersList').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-wl-remove]');
  if (btn) removeWhitelistUser(btn.dataset.wlRemove);
});

document.getElementById('whitelistUserCards').addEventListener('click', function(e) {
  var card = e.target.closest('[data-uid]');
  if (card) {
    openUserUsageDrawer(
      Number(card.dataset.uid),
      card.dataset.uname,
      card.dataset.udisplay
    );
  }
});

// DOMContentLoaded: auth check
document.addEventListener('DOMContentLoaded', async function() {
  try {
    var res = await fetch('/api/admin-auth/check', { credentials: 'same-origin' });
    var data = await res.json();
    if (data.authenticated) {
      showAdminPanel();
      loadConfig();
      loadUsers();
    }
  } catch (_e) { /* show login */ }
});
