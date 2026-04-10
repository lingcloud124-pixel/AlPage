/**
 * Theme Renderer Module
 * Handles dynamic theme application to the preview area by managing CSS custom properties
 */

interface ThemeColors {
  '--primary-color': string;
  '--primary-color-hover': string;
  '--alter-color': string;
  '--alter-color-hover-on': string;
  '--primary-color-opacity-10': string;
  '--primary-color-opacity-20': string;
  '--primary-color-opacity-30': string;
  '--header-font-color': string;
  '--auxiliary-gray': string;
  '--auxiliary-gray-dark': string;
  '--body-bg-color': string;
  '--portal-header-bg-extend-color': string;
  '--portal-header-complex-bg-extend-color': string;
  '--login-bg-color': string;
  '--sidebar-panel-bg': string;
  '--sidebar-color': string;
  '--sidebar-icon-color': string;
  '--border-color': string;
  '--border-icon-color': string;
  '--gradient-start': string;
  '--gradient-mid': string;
}

let currentTheme: Partial<ThemeColors> = {};

/**
 * Applies theme colors to the :root element as CSS custom properties
 */
export function applyTheme(theme: Partial<ThemeColors>): void {
  const root = document.documentElement;
  
  for (const [property, value] of Object.entries(theme)) {
    if (value) {
      root.style.setProperty(property, value);
      currentTheme[property as keyof ThemeColors] = value as any;
    }
  }
}

/**
 * Updates a single CSS variable property
 */
export function updateSingleVariable(property: keyof ThemeColors, value: string): void {
  const root = document.documentElement;
  root.style.setProperty(property, value);
  currentTheme[property] = value as any;
}

/**
 * Gets the current value of a CSS variable
 */
export function getVariableValue(property: keyof ThemeColors): string | null {
  const root = document.documentElement;
  return getComputedStyle(root).getPropertyValue(property) || null;
}

/**
 * Initializes the theme renderer functionality
 */
export function initializeThemeRenderer(): void {
  console.log('Theme renderer initialized');
  
  // Load any existing theme values from the :root element
  loadCurrentTheme();
}

/**
 * Loads the current theme values from the :root element
 */
function loadCurrentTheme(): void {
  const root = document.documentElement;
  
  // List of all theme properties
  const themeProperties: (keyof ThemeColors)[] = [
    '--primary-color',
    '--primary-color-hover',
    '--alter-color', 
    '--alter-color-hover-on',
    '--primary-color-opacity-10',
    '--primary-color-opacity-20',
    '--primary-color-opacity-30',
    '--header-font-color',
    '--auxiliary-gray',
    '--auxiliary-gray-dark',
    '--body-bg-color',
    '--portal-header-bg-extend-color',
    '--portal-header-complex-bg-extend-color',
    '--login-bg-color',
    '--sidebar-panel-bg',
    '--sidebar-color',
    '--sidebar-icon-color',
    '--border-color',
    '--border-icon-color',
    '--gradient-start',
    '--gradient-mid'
  ];
  
  // Extract current values from computed styles
  for (const prop of themeProperties) {
    const value = getComputedStyle(root).getPropertyValue(prop);
    if (value) {
      currentTheme[prop] = value.trim() as any;
    }
  }
}

/**
 * Returns the current theme state
 */
export function getCurrentTheme(): Partial<ThemeColors> {
  return { ...currentTheme };
}

/**
 * Resets the theme to default values
 */
export function resetToDefaultTheme(): void {
  const defaultTheme: ThemeColors = {
    '--primary-color': '#2C615C',
    '--primary-color-hover': '#B2FFE6',
    '--alter-color': '#144E48',
    '--alter-color-hover-on': '#73CAA6',
    '--primary-color-opacity-10': '#E9F1EB',
    '--primary-color-opacity-20': '#D3E2D8',
    '--primary-color-opacity-30': '#BDD4C4',
    '--header-font-color': '#333333',
    '--auxiliary-gray': '#999999',
    '--auxiliary-gray-dark': '#666666',
    '--body-bg-color': '#F8F8F8',
    '--portal-header-bg-extend-color': '#FBFCF2',
    '--portal-header-complex-bg-extend-color': '#FBFCF2',
    '--login-bg-color': '#144E48',
    '--sidebar-panel-bg': '#B8A9D9',
    '--sidebar-color': '#333333',
    '--sidebar-icon-color': '#9B8FC7',
    '--border-color': '#EEEEEE',
    '--border-icon-color': '#EEEEEE',
    '--gradient-start': '#fdfff5',
    '--gradient-mid': '#f7f3cd'
  };
  
  applyTheme(defaultTheme);
}