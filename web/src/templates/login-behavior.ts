export function initLoginBehavior(root: HTMLElement): void {
  let currentActiveTab = 'password';

  const tabs = root.querySelectorAll<HTMLButtonElement>('.login-tab');
  const forms = root.querySelectorAll<HTMLElement>('.login-form');
  const forgotLink = root.querySelector<HTMLAnchorElement>('.login-forgot');
  const indicator = root.querySelector<HTMLElement>('.login-tab-indicator');

  function switchTab(tabName: string): void {
    if (currentActiveTab === tabName) return;
    currentActiveTab = tabName;

    tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));

    const activeTab = root.querySelector(`[data-tab="${tabName}"]`) as HTMLButtonElement | null;
    if (activeTab && indicator) {
      const tabIndex = Array.from(activeTab.parentNode!.children).indexOf(activeTab);
      const tabWidth = activeTab.getBoundingClientRect().width;
      indicator.style.transform = `translateX(${tabIndex * tabWidth}px)`;
      indicator.style.width = `${tabWidth}px`;
    }

    forms.forEach(form => {
      form.classList.toggle('active', form.id === `${tabName}Form`);
      form.classList.toggle('hidden', form.id !== `${tabName}Form`);
    });

    if (forgotLink) forgotLink.style.display = tabName === 'password' ? 'block' : 'none';
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.tab) switchTab(tab.dataset.tab);
    });
  });

  const initActiveTab = root.querySelector('.login-tab.active') as HTMLButtonElement | null;
  if (initActiveTab && indicator) {
    const tabIndex = Array.from(initActiveTab.parentNode!.children).indexOf(initActiveTab);
    const tabWidth = initActiveTab.getBoundingClientRect().width;
    indicator.style.transform = `translateX(${tabIndex * tabWidth}px)`;
    indicator.style.width = `${tabWidth}px`;
  }

  const passwordToggle = root.querySelector('.password-toggle');
  const passwordInput = root.querySelector('#password') as HTMLInputElement | null;
  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', () => {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordToggle.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/><path d="M12 10a2 2 0 100 4 2 2 0 000-4z"/>';
      } else {
        passwordInput.type = 'password';
        passwordToggle.innerHTML = '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.45C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>';
      }
    });
  }

  const captchaImg = root.querySelector('.login-captcha-img');
  if (captchaImg) {
    captchaImg.addEventListener('click', () => {
      captchaImg.classList.add('refreshing');
      setTimeout(() => captchaImg.classList.remove('refreshing'), 500);
    });
  }

  const verificationBtn = root.querySelector('.verification-btn') as HTMLButtonElement | null;
  const phoneInput = root.querySelector('#phoneNumber') as HTMLInputElement | null;
  if (verificationBtn && phoneInput) {
    verificationBtn.addEventListener('click', () => {
      if (!phoneInput.value.length) {
        showToast('请输入手机号码');
        return;
      }
      let timeLeft = 60;
      verificationBtn.disabled = true;
      verificationBtn.textContent = `重新发送 (${timeLeft}s)`;
      const interval = setInterval(() => {
        timeLeft--;
        verificationBtn.textContent = `重新发送 (${timeLeft}s)`;
        if (timeLeft <= 0) {
          clearInterval(interval);
          verificationBtn.disabled = false;
          verificationBtn.textContent = '获取验证码';
        }
      }, 1000);
      showToast('验证码已发送');
    });
  }

  const langTrigger = root.querySelector('.login-lang-trigger');
  const langDropdown = root.querySelector('.login-lang-dropdown');
  if (langTrigger && langDropdown) {
    langTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      langDropdown.classList.toggle('hidden');
    });
    root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('login-lang-option')) {
        const currentLang = root.querySelector('#currentLang');
        if (currentLang) currentLang.textContent = target.textContent;
        langDropdown.classList.add('hidden');
      } else if (!langTrigger.contains(target)) {
        langDropdown.classList.add('hidden');
      }
    });
  }

  const passwordForm = root.querySelector('#passwordForm') as HTMLFormElement | null;
  if (passwordForm) {
    passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = (root.querySelector('#username') as HTMLInputElement)?.value;
      const password = (root.querySelector('#password') as HTMLInputElement)?.value;
      const captcha = (root.querySelector('#captchaInput') as HTMLInputElement)?.value;
      if (!username || !password || !captcha) { showToast('请填写所有必填字段'); return; }

      const submitBtn = root.querySelector('#loginButton') as HTMLButtonElement | null;
      if (!submitBtn) return;
      const buttonText = submitBtn.querySelector('.button-text') as HTMLElement | null;
      const spinner = submitBtn.querySelector('.button-spinner') as HTMLElement | null;
      submitBtn.disabled = true;
      if (buttonText) buttonText.classList.add('hidden');
      if (spinner) spinner.classList.remove('hidden');

      setTimeout(() => {
        submitBtn.disabled = false;
        if (buttonText) buttonText.classList.remove('hidden');
        if (spinner) spinner.classList.add('hidden');
        showToast('登录成功！', 'success');
      }, 2000);
    });
  }

  const smsForm = root.querySelector('#smsForm') as HTMLFormElement | null;
  if (smsForm) {
    smsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const phoneNumber = (root.querySelector('#phoneNumber') as HTMLInputElement)?.value;
      const code = (root.querySelector('#verificationCode') as HTMLInputElement)?.value;
      if (!phoneNumber || !code) { showToast('请填写所有必填字段'); return; }

      const submitBtn = smsForm.querySelector('.login-submit-btn') as HTMLButtonElement | null;
      if (!submitBtn) return;
      const buttonText = submitBtn.querySelector('.button-text') as HTMLElement | null;
      const spinner = submitBtn.querySelector('.button-spinner') as HTMLElement | null;
      submitBtn.disabled = true;
      if (buttonText) buttonText.classList.add('hidden');
      if (spinner) spinner.classList.remove('hidden');

      setTimeout(() => {
        submitBtn.disabled = false;
        if (buttonText) buttonText.classList.remove('hidden');
        if (spinner) spinner.classList.add('hidden');
        showToast('验证码登录成功！', 'success');
      }, 2000);
    });
  }

  root.querySelectorAll('.login-input').forEach(input => {
    input.addEventListener('focus', () => input.parentElement?.classList.add('focused'));
    input.addEventListener('blur', () => {
      if (!(input as HTMLInputElement).value) input.parentElement?.classList.remove('focused');
    });
  });

  function showToast(message: string, type: 'error' | 'success' = 'error'): void {
    let toast = root.querySelector('.toast-notification') as HTMLElement | null;
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-notification';
      root.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast-notification ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast?.classList.remove('show'), 3000);
  }
}
