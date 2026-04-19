export interface CustomerVisualProfile {
  customerId: string;
  preferredCategories: string[];
  preferredSubCategories: string[];
  preferredStyles: string[];
  preferredMoods: string[];
  preferredCompositions: string[];
  dislikedTraits: string[];
  preferredBrightness: 'bright' | 'balanced' | 'dark';
  preferredRealism: 'photorealistic' | 'stylized' | 'mixed';
  updatedAt: number;
}

const STORAGE_KEY = 'theme-agent-customer-visual-profiles';

function readAllProfiles(): Record<string, CustomerVisualProfile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CustomerVisualProfile>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllProfiles(profiles: Record<string, CustomerVisualProfile>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function createDefaultCustomerVisualProfile(customerId: string): CustomerVisualProfile {
  return {
    customerId,
    preferredCategories: [],
    preferredSubCategories: [],
    preferredStyles: [],
    preferredMoods: [],
    preferredCompositions: [],
    dislikedTraits: [],
    preferredBrightness: 'balanced',
    preferredRealism: 'mixed',
    updatedAt: Date.now(),
  };
}

export function loadCustomerVisualProfile(customerId: string): CustomerVisualProfile {
  const profiles = readAllProfiles();
  return profiles[customerId] ?? createDefaultCustomerVisualProfile(customerId);
}

export function saveCustomerVisualProfile(profile: CustomerVisualProfile): CustomerVisualProfile {
  const profiles = readAllProfiles();
  const nextProfile: CustomerVisualProfile = {
    ...profile,
    updatedAt: Date.now(),
  };
  profiles[nextProfile.customerId] = nextProfile;
  writeAllProfiles(profiles);
  return nextProfile;
}

export function updateCustomerVisualProfile(
  customerId: string,
  patch: Partial<Omit<CustomerVisualProfile, 'customerId' | 'updatedAt'>>,
): CustomerVisualProfile {
  const current = loadCustomerVisualProfile(customerId);
  const next: CustomerVisualProfile = {
    ...current,
    ...patch,
    customerId,
    updatedAt: Date.now(),
  };
  return saveCustomerVisualProfile(next);
}
