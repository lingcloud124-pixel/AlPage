import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type TemplateRuleKey = 'light-ui' | 'dark-ui';

type ExportAssetRule = {
  nodeId: string;
  outputFile: string;
  format: 'png' | 'jpg';
  width: number;
  height: number;
};

type LoginBackgroundRules = {
  full: ExportAssetRule;
  mkCrop: ExportAssetRule & {
    cropOffsetX: number;
    cropOffsetY: number;
  };
};

type HeaderRules = {
  default: ExportAssetRule;
  complex: ExportAssetRule;
  menu: ExportAssetRule;
  banner: ExportAssetRule;
  sideHeader: ExportAssetRule;
  gradientLeft: ExportAssetRule;
  gradientRight: ExportAssetRule;
};

type HeaderRelation = {
  pencilLabel: string;
  outputFile: string;
  cssClass?: string;
  pencilAvailable: boolean;
};

type DarkUiSpecialColors = {
  login: {
    primaryText: string;
    buttonBackground: string;
    buttonHoverBackground: string;
  };
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const penExportRulesPath = path.join(__dirname, '../../config/pen-export-rules.json');
const themeRelationsPath = path.join(__dirname, '../../config/theme-relations.json');

export const PEN_EXPORT_RULES: Record<TemplateRuleKey, { loginBackground: LoginBackgroundRules; headers: HeaderRules }> =
  JSON.parse(fs.readFileSync(penExportRulesPath, 'utf8')) as Record<
    TemplateRuleKey,
    { loginBackground: LoginBackgroundRules; headers: HeaderRules }
  >;

const themeRelations = JSON.parse(fs.readFileSync(themeRelationsPath, 'utf8')) as {
  darkUiSpecialColors: DarkUiSpecialColors;
  headerTypeRelations: Record<TemplateRuleKey, Record<string, HeaderRelation>>;
};

export const HEADER_TYPE_RELATIONS: Record<TemplateRuleKey, Record<string, HeaderRelation>> =
  themeRelations.headerTypeRelations;

export const DARK_UI_SPECIAL_COLORS = themeRelations.darkUiSpecialColors;
