#!/usr/bin/env node
/**
 * 自动化 pen 文件主题替换脚本
 * 解决：只更新变量但忽略文本内容中硬编码色值的问题
 * 
 * 用法: node scripts/apply-theme.mjs {nameEn}
 * 示例: node scripts/apply-theme.mjs happy-xishuangbanna
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ====== 配置：Light-UI 模板色值到变量的映射 ======
// 当模板中文本内容显示硬编码色值时，需要替换为新主题对应值
const LIGHT_UI_COLORS = [
  { label: "primary-color", key: "primary" },
  { label: "primary-color-hover", key: "primaryHover" },
  { label: "alter-color", key: "alterColor" },
  { label: "alter-color-hover-on", key: "alterColorHoverOn" },
  { label: "primary-color-opacity-10", key: "primaryOpacity10" },
  { label: "primary-color-opacity-20", key: "primaryOpacity20" },
  { label: "primary-color-opacity-30", key: "primaryOpacity30" },
  { label: "body-bg-color", key: "bodyBg", templateDefault: "#F8F8F8" },
  { label: "hover-bg-color", key: "bodyBg", templateDefault: "#F8F8F8" },
  { label: "login-bg-color", key: "contentBg", templateDefault: "#FDFFF6" },
];

function main() {
  const nameEn = process.argv[2];
  if (!nameEn) {
    console.error("用法: node scripts/apply-theme.mjs {nameEn}");
    process.exit(1);
  }

  const colorPath = path.join(ROOT, `colors/${nameEn}.json`);
  if (!fs.existsSync(colorPath)) {
    console.error(`配色方案不存在: ${colorPath}`);
    process.exit(1);
  }

  const theme = JSON.parse(fs.readFileSync(colorPath, "utf-8"));
  const colors = theme.colors;
  const isDark = theme.templateType === "dark-ui";

  // 找到最新的 pen 文件
  const designsDir = path.join(ROOT, "designs");
  const files = fs
    .readdirSync(designsDir)
    .filter((f) => f.startsWith("Topic-") && f.endsWith(".pen"))
    .sort((a, b) => {
      const ta = parseInt(a.match(/Topic-.*-(\d+)\.pen/)?.[1] || 0);
      const tb = parseInt(b.match(/Topic-.*-(\d+)\.pen/)?.[1] || 0);
      return tb - ta;
    });

  if (files.length === 0) {
    console.error("没有找到主题 pen 文件，请先复制模板");
    process.exit(1);
  }

  const penPath = path.join(designsDir, files[0]);
  console.log(`处理文件: ${files[0]}`);
  console.log(`主题类型: ${isDark ? "Dark-UI" : "Light-UI"}`);

  const data = JSON.parse(fs.readFileSync(penPath, "utf-8"));

  // ====== Step 1: 替换框架名称 ======
  const themeNameCn = theme.name;
  const templateName = "清明节"; // 修改为实际模板名称
  for (const child of data.children || []) {
    if (child.name?.includes(`【${templateName}】`)) {
      child.name = child.name.replace(
        `【${templateName}】`,
        `【${themeNameCn}】`
      );
    }
  }

  // ====== Step 2: 更新颜色变量 ======
  const newVars = {};
  for (const [k, v] of Object.entries(data.variables || {})) {
    let value = v.value || "";

    if (typeof value === "string") {
      // 将变量引用指向新值
      switch (k) {
        case "primary-color":
          value = colors.primary;
          break;
        case "primary-color-hover":
          value = colors.primaryHover;
          break;
        case "alter-color":
          value = colors.alterColor;
          break;
        case "alter-color-hover-on":
          value = colors.alterColorHoverOn;
          break;
        case "primary-color-opacity-10":
          value = colors.primaryOpacity10;
          break;
        case "primary-color-opacity-20":
          value = colors.primaryOpacity20;
          break;
        case "primary-color-opacity-30":
          value = colors.primaryOpacity30;
          break;
        case "header-font-color":
          value = "#333333";
          break;
        case "portal-header-bg-extend-color":
          value = colors.sidebarBg || "#E8F5E9";
          break;
        case "portal-header-pure-extend-color":
          value = colors.primary;
          break;
        case "sidebar-panel-bg":
          value = colors.sidebarBg || "#E8F5E9";
          break;
        case "login-bg-color":
          value = colors.contentBg || "#F1F8E9";
          break;
        // 以下保持变量内部引用不变
        default:
          break;
      }
    }

    if (typeof value === "object" && value !== null) {
      value = value.value !== undefined ? value.value : value;
    }
    newVars[k] = { type: v.type || "color", value: value };
  }
  data.variables = newVars;

  // ====== Step 3: 更新渐变组件颜色 ======
  function updateGradients(obj) {
    if (!obj || typeof obj !== "object") return;
    const fill = obj.fill;
    if (
      fill &&
      typeof fill === "object" &&
      fill.type === "gradient" &&
      Array.isArray(fill.colors)
    ) {
      const rot = fill.rotation;
      for (const gc of fill.colors) {
        // 只替换纯十六进制颜色，不替换变量引用（$开头）
        if (typeof gc.color === "string" && !gc.color.startsWith("$")) {
          // 渐变组件：左渐变(rot=-90)从主色到白，右渐变(rot=90)从白到主色
          if (rot === -90) {
            // 左渐变：第一个是非白=主色
            if (
              !gc.color.toUpperCase().startsWith("#FFFFFF") &&
              gc.color !== "#FFFFFF"
            ) {
              gc.color = colors.primary;
            }
          } else if (rot === 90) {
            // 右渐变：最后一个是非白=主色
            if (
              !gc.color.toUpperCase().startsWith("#FFFFFF") &&
              gc.color !== "#FFFFFF"
            ) {
              gc.color = colors.primary;
            }
          }
        }
      }
    }
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) val.forEach(updateGradients);
      else if (typeof val === "object") updateGradients(val);
    }
  }
  updateGradients(data);

  // ====== Step 4: ⭐ 关键：替换文本内容中的硬编码色值 ======
  // 模板中文本节点的内容格式: "$variable-name\n#HEXVALUE"
  // 只更新 hex 值部分，不修改变量名

  // 构建旧色值 → 新色值映射
  const oldHexToNew = {};
  for (const item of LIGHT_UI_COLORS) {
    const varEntry = data.variables[item.label];
    const oldHex = varEntry?.value;
    if (oldHex && /\#[0-9A-F]{3,8}/i.test(oldHex)) {
      const newHex = colors[item.key];
      if (newHex && oldHex !== newHex) {
        oldHexToNew[oldHex.toUpperCase()] = newHex;
      }
    }
  }

  function updateTextContent(obj) {
    if (!obj || typeof obj !== "object") return;

    // 处理 content 字段
    if (typeof obj.content === "string" && obj.content.includes("#")) {
      let updated = obj.content;
      for (const [oldHex, newHex] of Object.entries(oldHexToNew)) {
        // 匹配大小写不敏感的 hex 值
        const regex = new RegExp(
          `#${oldHex.replace("$", "").replace("#", "")}[a-fA-F0-9]*`,
          "gi"
        );
        if (regex.test(obj.content)) {
          updated = obj.content.replace(regex, newHex);
          obj.content = updated;
        }
      }
    }

    // 处理 content 数组（富文本）
    if (Array.isArray(obj.content)) {
      for (const item of obj.content) {
        if (typeof item === "object" && typeof item.content === "string") {
          for (const [oldHex, newHex] of Object.entries(oldHexToNew)) {
            const hexOnly = oldHex.replace("#", "");
            if (item.content.includes("#" + hexOnly)) {
              item.content = item.content.replace(
                new RegExp(hexOnly, "gi"),
                newHex.replace("#", "").padRight(6, "0")
              );
            }
          }
        }
      }
    }

    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) val.forEach(updateTextContent);
      else if (typeof val === "object") updateTextContent(val);
    }
  }
  updateTextContent(data);

  // ====== Step 5: 替换背景图 URL ======
  function updateBgImage(obj, bgPath) {
    if (!obj || typeof obj !== "object") return;
    if (obj.fill && typeof obj.fill === "object" && obj.fill.type === "image") {
      obj.fill.url = bgPath;
    }
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) val.forEach((v) => updateBgImage(v, bgPath));
      else if (typeof val === "object") updateBgImage(val, bgPath);
    }
  }
  const bgPath = path.join(ROOT, `designs/${nameEn}-bg.png`);
  if (fs.existsSync(bgPath)) {
    // 登录页背景图
    updateBgImage(data, `${nameEn}-bg.png`);
  }

  // ====== 保存 ======
  fs.writeFileSync(penPath, JSON.stringify(data, null, 2));
  console.log(`✓ 已更新: ${files[0]}`);
  console.log(`  - 变量 ${Object.keys(newVars).length} 个`);
  console.log(`  - 色值映射 ${Object.keys(oldHexToNew).length} 对`);
  console.log(`  - 背景图: ${nameEn}-bg.png`);
}

main();
