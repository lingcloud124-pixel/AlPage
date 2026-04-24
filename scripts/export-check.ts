import { buildAll } from '../web/scripts/build';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('用法: npm run export:check -- <主题名> <nameEn> <themeColor> [light-ui|dark-ui] [背景图URL] [productsCsv]');
    console.log("示例: npm run export:check -- \"申能企业\" shenergy-enterprise '#226F3B' dark-ui /path/to/bg.jpg mk,ekp_v17");
    process.exit(1);
  }

  await buildAll({
    name: args[0],
    nameEn: args[1],
    themeColor: args[2],
    templateType: (args[3] as 'light-ui' | 'dark-ui') ?? 'light-ui',
    themeImageUrl: args[4],
    selectedProducts: args[5]?.split(',').map((item) => item.trim()).filter(Boolean),
  });
}

main().catch((error) => {
  console.error('构建失败:', error);
  process.exit(1);
});
