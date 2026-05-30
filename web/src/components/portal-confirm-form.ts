import type { Project } from '../project-manager';
import { getCurrentProjectId, loadProject } from '../project-manager';

type PortalConfirmCallback = (project: Project) => void;

let onSubmitCallback: PortalConfirmCallback | null = null;

export function showPortalConfirmForm(project: Project): void {
  const modal = document.getElementById('portalConfirmModal');
  if (!modal) return;

  const profile = project.portalProfile;
  if (profile) {
    const nameInput = document.getElementById('portalConfirmCustomerName') as HTMLInputElement;
    const industrySelect = document.getElementById('portalConfirmIndustry') as HTMLSelectElement;
    const functionsInput = document.getElementById('portalConfirmFunctions') as HTMLInputElement;
    const purposeSelect = document.getElementById('portalConfirmPurpose') as HTMLSelectElement;
    const cardsInput = document.getElementById('portalConfirmCards') as HTMLInputElement;
    const visualSelect = document.getElementById('portalConfirmVisual') as HTMLSelectElement;

    if (nameInput) nameInput.value = profile.customerName ?? '';
    if (industrySelect) {
      const options = Array.from(industrySelect.options).map((o) => o.value);
      if (profile.customerIndustry && options.includes(profile.customerIndustry)) {
        industrySelect.value = profile.customerIndustry;
      } else if (profile.customerIndustry) {
        industrySelect.value = '__custom__';
        const customInput = document.getElementById('portalConfirmIndustryCustom') as HTMLInputElement;
        if (customInput) {
          customInput.style.display = 'block';
          customInput.value = profile.customerIndustry;
        }
      }
    }
    if (functionsInput) functionsInput.value = profile.customerFunctions?.join('、') ?? '';
    if (purposeSelect) {
      const options = Array.from(purposeSelect.options).map((o) => o.value);
      if (profile.portalPurpose && options.includes(profile.portalPurpose)) {
        purposeSelect.value = profile.portalPurpose;
      } else if (profile.portalPurpose) {
        purposeSelect.value = '__custom__';
        const customInput = document.getElementById('portalConfirmPurposeCustom') as HTMLInputElement;
        if (customInput) {
          customInput.style.display = 'block';
          customInput.value = profile.portalPurpose;
        }
      }
    }
    if (cardsInput) cardsInput.value = profile.highlightedCards?.join('、') ?? '';
    if (visualSelect) {
      const options = Array.from(visualSelect.options).map((o) => o.value);
      if (profile.visualPreference && options.includes(profile.visualPreference)) {
        visualSelect.value = profile.visualPreference;
      } else if (profile.visualPreference) {
        visualSelect.value = '__custom__';
        const customInput = document.getElementById('portalConfirmVisualCustom') as HTMLInputElement;
        if (customInput) {
          customInput.style.display = 'block';
          customInput.value = profile.visualPreference;
        }
      }
    }
  }

  modal.classList.add('active');
}

export function hidePortalConfirmForm(): void {
  const modal = document.getElementById('portalConfirmModal');
  if (modal) modal.classList.remove('active');
  onSubmitCallback = null;
}

export function onPortalConfirmSubmit(callback: PortalConfirmCallback): void {
  onSubmitCallback = callback;
}

export function initPortalConfirmForm(): void {
  const industrySelect = document.getElementById('portalConfirmIndustry') as HTMLSelectElement;
  const industryCustom = document.getElementById('portalConfirmIndustryCustom') as HTMLInputElement;
  const purposeSelect = document.getElementById('portalConfirmPurpose') as HTMLSelectElement;
  const purposeCustom = document.getElementById('portalConfirmPurposeCustom') as HTMLInputElement;
  const visualSelect = document.getElementById('portalConfirmVisual') as HTMLSelectElement;
  const visualCustom = document.getElementById('portalConfirmVisualCustom') as HTMLInputElement;

  if (industrySelect && industryCustom) {
    industrySelect.addEventListener('change', () => {
      industryCustom.style.display = industrySelect.value === '__custom__' ? 'block' : 'none';
    });
  }
  if (purposeSelect && purposeCustom) {
    purposeSelect.addEventListener('change', () => {
      purposeCustom.style.display = purposeSelect.value === '__custom__' ? 'block' : 'none';
    });
  }
  if (visualSelect && visualCustom) {
    visualSelect.addEventListener('change', () => {
      visualCustom.style.display = visualSelect.value === '__custom__' ? 'block' : 'none';
    });
  }

  const closeBtn = document.getElementById('portalConfirmCloseBtn');
  const cancelBtn = document.getElementById('portalConfirmCancelBtn');
  if (closeBtn) closeBtn.addEventListener('click', hidePortalConfirmForm);
  if (cancelBtn) cancelBtn.addEventListener('click', hidePortalConfirmForm);

  const submitBtn = document.getElementById('portalConfirmSubmitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const nameInput = document.getElementById('portalConfirmCustomerName') as HTMLInputElement;
      const industrySelectEl = document.getElementById('portalConfirmIndustry') as HTMLSelectElement;
      const industryCustomEl = document.getElementById('portalConfirmIndustryCustom') as HTMLInputElement;
      const functionsInput = document.getElementById('portalConfirmFunctions') as HTMLInputElement;
      const purposeSelectEl = document.getElementById('portalConfirmPurpose') as HTMLSelectElement;
      const purposeCustomEl = document.getElementById('portalConfirmPurposeCustom') as HTMLInputElement;
      const cardsInput = document.getElementById('portalConfirmCards') as HTMLInputElement;
      const visualSelectEl = document.getElementById('portalConfirmVisual') as HTMLSelectElement;
      const visualCustomEl = document.getElementById('portalConfirmVisualCustom') as HTMLInputElement;

      const customerName = nameInput?.value.trim() ?? '';
      const customerIndustry = industrySelectEl?.value === '__custom__'
        ? (industryCustomEl?.value.trim() ?? '')
        : (industrySelectEl?.value ?? '');
      const customerFunctions = (functionsInput?.value ?? '').split(/[、,，]/).map((s: string) => s.trim()).filter(Boolean);
      const portalPurpose = purposeSelectEl?.value === '__custom__'
        ? (purposeCustomEl?.value.trim() ?? '')
        : (purposeSelectEl?.value ?? '');
      const highlightedCards = (cardsInput?.value ?? '').split(/[、,，]/).map((s: string) => s.trim()).filter(Boolean);
      const visualPreference = visualSelectEl?.value === '__custom__'
        ? (visualCustomEl?.value.trim() ?? '')
        : (visualSelectEl?.value ?? '');

      if (onSubmitCallback) {
        const projectId = getCurrentProjectId();
        const project = projectId ? await loadProject(projectId) : null;
        if (project) {
          project.portalProfile = {
            customerName,
            customerIndustry,
            customerFunctions,
            portalPurpose,
            highlightedCards,
            visualPreference,
            source: ['form'],
            completeness: 1,
            updatedAt: Date.now(),
          };
          onSubmitCallback(project);
        }
      }

      hidePortalConfirmForm();
    });
  }
}
