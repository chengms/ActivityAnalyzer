/**
 * 简单的功能测试脚本
 * 用于验证代码结构和基本功能
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 开始测试...\n');

// 检查关键文件是否存在
const filesToCheck = [
  'src/main/main.ts',
  'src/main/preload.ts',
  'src/main/autoLauncher.ts',
  'src/settings/settings.ts',
  'src/tracker/tracker.ts',
  'src/tracker/database.ts',
  'src/reporter/reporter.ts',
  'src/renderer/App.tsx',
  'src/renderer/components/Settings.tsx',
  'package.json',
  'tsconfig.main.json',
];

console.log('📁 检查文件存在性:');
let allFilesExist = true;
filesToCheck.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n📦 检查 package.json 依赖:');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const requiredDeps = [
    'electron',
    'react',
    'react-dom',
    'better-sqlite3',
    'chart.js',
    'react-chartjs-2',
    'xlsx',
    'date-fns',
  ];
  
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  requiredDeps.forEach(dep => {
    const exists = dep in deps;
    console.log(`  ${exists ? '✅' : '❌'} ${dep}`);
  });
} catch (error) {
  console.log('  ❌ 无法读取 package.json');
}

console.log('\n🔍 检查代码结构:');

// 检查 main.ts 中的关键导入
try {
  const mainContent = fs.readFileSync('src/main/main.ts', 'utf-8');
  const checks = [
    { name: 'Settings 导入', pattern: /import.*Settings.*from/ },
    { name: 'AutoLauncher 导入', pattern: /import.*AutoLauncher/ },
    { name: 'Tray 导入', pattern: /import.*Tray/ },
    { name: 'createTray 函数', pattern: /function createTray/ },
    { name: '系统托盘创建', pattern: /new Tray/ },
    { name: '设置 IPC 处理', pattern: /get-settings/ },
    { name: '更新设置 IPC', pattern: /update-settings/ },
  ];
  
  checks.forEach(check => {
    const found = check.pattern.test(mainContent);
    console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
  });
} catch (error) {
  console.log('  ❌ 无法读取 src/main/main.ts');
}

// 检查 preload.ts
try {
  const preloadContent = fs.readFileSync('src/main/preload.ts', 'utf-8');
  const checks = [
    { name: 'getSettings API', pattern: /getSettings:/ },
    { name: 'updateSettings API', pattern: /updateSettings:/ },
    { name: 'onOpenSettings API', pattern: /onOpenSettings:/ },
  ];
  
  checks.forEach(check => {
    const found = check.pattern.test(preloadContent);
    console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
  });
} catch (error) {
  console.log('  ❌ 无法读取 src/main/preload.ts');
}

// 检查 Settings 组件
try {
  const settingsContent = fs.readFileSync('src/renderer/components/Settings.tsx', 'utf-8');
  const checks = [
    { name: 'Settings 组件导出', pattern: /export function Settings/ },
    { name: '检测间隔设置', pattern: /checkInterval/ },
    { name: '开机自启动设置', pattern: /autoStart/ },
    { name: '保存设置功能', pattern: /handleSave/ },
  ];
  
  checks.forEach(check => {
    const found = check.pattern.test(settingsContent);
    console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
  });
} catch (error) {
  console.log('  ❌ 无法读取 src/renderer/components/Settings.tsx');
}

// 检查 tracker.ts 中的动态间隔支持
try {
  const trackerContent = fs.readFileSync('src/tracker/tracker.ts', 'utf-8');
  const checks = [
    { name: 'updateInterval 方法', pattern: /updateInterval/ },
    { name: '动态间隔支持', pattern: /start\(checkInterval/ },
  ];
  
  checks.forEach(check => {
    const found = check.pattern.test(trackerContent);
    console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
  });
} catch (error) {
  console.log('  ❌ 无法读取 src/tracker/tracker.ts');
}

console.log('\n✅ 测试完成！');
console.log('\n📝 下一步:');
console.log('  1. 运行 npm install 安装依赖');
console.log('  2. 运行 npm run dev 启动开发模式');
console.log('  3. 测试各项功能');

