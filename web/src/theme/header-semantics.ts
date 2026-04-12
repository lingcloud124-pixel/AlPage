import themeRelations from '../../../config/theme-relations.json';

export interface WebHeaderSemantic {
  id: string;
  name: string;
}

export function getWebHeaderSemantics(): Record<string, WebHeaderSemantic> {
  return {
    'header-default': {
      id: 'header-default',
      name: themeRelations.headerTypeRelations['light-ui'].default.pencilLabel,
    },
    'header-complex': {
      id: 'header-complex',
      name: themeRelations.headerTypeRelations['light-ui'].complex.pencilLabel,
    },
    'header-menu': {
      id: 'header-menu',
      name: themeRelations.headerTypeRelations['light-ui'].menu.pencilLabel,
    },
    'header-v16-default': {
      id: 'header-v16-default',
      name: themeRelations.headerTypeRelations['light-ui'].singleMenu.pencilLabel,
    },
    'header-simple': {
      id: 'header-simple',
      name: themeRelations.headerTypeRelations['light-ui'].simple.pencilLabel,
    },
    'header-simple-multitab': {
      id: 'header-simple-multitab',
      name: themeRelations.headerTypeRelations['light-ui'].simpleMultiTab.pencilLabel,
    },
  };
}
