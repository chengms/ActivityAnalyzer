import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, powerMonitor } from 'electron';
import path from 'path';
import { Database } from '../tracker/database';
import { ActivityTracker } from '../tracker/tracker';
import { Reporter } from '../reporter/reporter';
import { Settings, AppSettings } from '../settings/settings';
import { AutoLauncher } from './autoLauncher';

// 设置应用名称（在创建窗口之前）
if (!app.isReady()) {
  app.setName('活动分析器');
}

// 设置命令行参数以减少缓存错误
// 这些参数可以减少 GPU 缓存相关的错误信息
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
// 禁用一些可能导致权限错误的缓存
app.commandLine.appendSwitch('disable-background-networking');

// 禁用 GPU 缓存以避免权限错误（可选，如果不需要 GPU 加速）
// 如果缓存错误仍然出现，可以取消下面的注释
// app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;
let tracker: ActivityTracker | null = null;
let database: Database | null = null;
let reporter: Reporter | null = null;
let settings: Settings | null = null;
let autoLauncher: AutoLauncher | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let isManuallyStopped = false; // 标记是否手动停止

function createWindow() {
  if (mainWindow) {
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // 禁用一些可能导致缓存错误的特性
      enableWebSQL: false,
      spellcheck: false,
    },
    show: !settings?.getSetting('startMinimized'),
  });

  // 直接加载构建文件（窗口模式）
  const htmlPath = path.join(__dirname, '../renderer/index.html');
  mainWindow.loadFile(htmlPath);

  // 如果设置了启动时最小化，先隐藏窗口
  if (settings?.getSetting('startMinimized')) {
    mainWindow.hide();
  }

  // 处理最小化到托盘
  mainWindow.on('minimize', (event: Electron.Event) => {
    if (settings?.getSetting('minimizeToTray')) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // 处理关闭到托盘
  mainWindow.on('close', (event) => {
    if (!isQuitting && settings?.getSetting('closeToTray')) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // 创建系统托盘图标
  const fs = require('fs');
  let trayIcon: Electron.NativeImage = nativeImage.createEmpty();
  
  // 尝试加载图标，如果不存在则使用应用图标
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  const appIcon = app.getAppPath();
  
  try {
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
    } else {
      // 尝试使用应用图标
      const possibleIconPaths = [
        path.join(appIcon, 'assets', 'icon.png'),
        path.join(appIcon, 'icon.png'),
        path.join(__dirname, '../renderer/favicon.ico'),
      ];
      
      let found = false;
      for (const possiblePath of possibleIconPaths) {
        if (fs.existsSync(possiblePath)) {
          trayIcon = nativeImage.createFromPath(possiblePath);
          found = true;
          break;
        }
      }
      
      if (!found) {
        // 创建一个简单的16x16图标
        trayIcon = nativeImage.createEmpty();
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
      }
    }
    
    // 确保图标大小合适（Windows 推荐 16x16 或 32x32）
    if (trayIcon.getSize().width > 32) {
      trayIcon = trayIcon.resize({ width: 32, height: 32 });
    }
  } catch (error) {
    console.error('Error creating tray icon:', error);
    // 创建一个最小的图标
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        createWindow();
        mainWindow?.show();
      },
    },
    {
      label: '设置',
      click: () => {
        createWindow();
        mainWindow?.show();
        mainWindow?.webContents.send('open-settings');
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('活动分析器');
  tray.setContextMenu(contextMenu);
  
  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    createWindow();
    mainWindow?.show();
  });
}

// 设置应用缓存目录，避免权限问题
app.setPath('userCache', path.join(app.getPath('userData'), 'cache'));

// 禁用 GPU 加速以减少缓存错误（可选）
// app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  try {
    console.log('App ready, initializing...');
    
    // 初始化设置
    console.log('Initializing settings...');
    settings = new Settings();
    console.log('Settings initialized');
    
    // 初始化自动启动器
    console.log('Initializing auto launcher...');
    autoLauncher = new AutoLauncher();
    
    // 检查并应用开机自启动设置
    try {
      const autoStartEnabled = await autoLauncher.isEnabled();
      if (settings.getSetting('autoStart') !== autoStartEnabled) {
        if (settings.getSetting('autoStart')) {
          await autoLauncher.enable();
        } else {
          await autoLauncher.disable();
        }
      }
    } catch (error) {
      console.error('Error handling auto start:', error);
    }

    // 初始化数据库
    console.log('Initializing database...');
    database = new Database();
    database.init();
    console.log('Database initialized');

    // 初始化活动追踪器（使用设置中的检测间隔）
    console.log('Initializing tracker...');
    const checkInterval = settings.getSetting('checkInterval');
    tracker = new ActivityTracker(database, checkInterval);
    tracker.start();
    console.log('Tracker started');

    // 监听锁屏事件
    setupLockScreenMonitoring();

    // 初始化报告生成器
    console.log('Initializing reporter...');
    reporter = new Reporter(database);

    // 创建系统托盘
    console.log('Creating tray...');
    createTray();
    console.log('Tray created');

    // 创建窗口（如果设置了启动时最小化，窗口会隐藏）
    console.log('Creating window...');
    createWindow();
    console.log('Window created, app ready!');
  } catch (error) {
    console.error('Error during initialization:', error);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 如果设置了关闭到托盘，不退出应用
  if (settings?.getSetting('closeToTray')) {
    return;
  }
  if (tracker) {
    tracker.stop();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (tracker) {
    tracker.stop();
  }
});

// IPC 通信处理
ipcMain.handle('get-activity-data', async (event, date: string) => {
  if (!database) return null;
  return database.getActivityByDate(date);
});

ipcMain.handle('get-app-usage', async (event, startDate: string, endDate: string) => {
  if (!database) return null;
  return database.getAppUsage(startDate, endDate);
});

ipcMain.handle('get-daily-summary', async (event, date: string) => {
  if (!database) return null;
  return database.getDailySummary(date);
});

ipcMain.handle('get-window-usage', async (event, date: string) => {
  if (!database) return [];
  return database.getWindowUsage(date);
});

ipcMain.handle('get-activity-timeline', async (event, date: string) => {
  if (!database) return [];
  return database.getActivityTimeline(date);
});

ipcMain.handle('generate-report', async (event, date: string) => {
  if (!reporter) return { success: false, path: '' };
  return await reporter.generateDailyReport(date);
});

// 设置相关 IPC
ipcMain.handle('get-settings', async () => {
  if (!settings) return null;
  return settings.getSettings();
});

ipcMain.handle('update-settings', async (event, updates: Partial<AppSettings>) => {
  if (!settings) return false;
  
  settings.updateSettings(updates);
  
  // 如果更新了检测间隔，更新追踪器
  if (updates.checkInterval && tracker) {
    tracker.updateInterval(updates.checkInterval);
  }
  
  // 如果更新了开机自启动，更新注册表
  if (updates.autoStart !== undefined && autoLauncher) {
    if (updates.autoStart) {
      await autoLauncher.enable();
    } else {
      await autoLauncher.disable();
    }
  }
  
  return true;
});

ipcMain.handle('get-auto-start-status', async () => {
  if (!autoLauncher) return false;
  return await autoLauncher.isEnabled();
});

// 追踪控制相关 IPC
ipcMain.handle('start-tracking', async () => {
  if (!tracker) return false;
  tracker.start();
  isManuallyStopped = false;
  console.log('Tracking started manually');
  return true;
});

ipcMain.handle('stop-tracking', async () => {
  if (!tracker) return false;
  tracker.stop();
  isManuallyStopped = true;
  console.log('Tracking stopped manually');
  return true;
});

ipcMain.handle('get-tracking-status', async () => {
  if (!tracker) return false;
  return tracker.isRunning();
});

// 锁屏监控设置
function setupLockScreenMonitoring() {
  // Windows 和 macOS 都支持 lock-screen 和 unlock-screen 事件
  powerMonitor.on('lock-screen', () => {
    console.log('Screen locked, stopping tracking...');
    if (tracker && tracker.isRunning()) {
      tracker.stop();
      // 通知渲染进程
      if (mainWindow) {
        mainWindow.webContents.send('tracking-status-changed', false);
      }
    }
  });

  powerMonitor.on('unlock-screen', () => {
    console.log('Screen unlocked, resuming tracking...');
    // 只有在不是手动停止的情况下才自动恢复
    if (tracker && !tracker.isRunning() && !isManuallyStopped) {
      tracker.start();
      // 通知渲染进程
      if (mainWindow) {
        mainWindow.webContents.send('tracking-status-changed', true);
      }
    }
  });

  // 监听系统挂起和恢复（可选，用于更全面的监控）
  powerMonitor.on('suspend', () => {
    console.log('System suspending, stopping tracking...');
    if (tracker && tracker.isRunning()) {
      tracker.stop();
      if (mainWindow) {
        mainWindow.webContents.send('tracking-status-changed', false);
      }
    }
  });

  powerMonitor.on('resume', () => {
    console.log('System resumed, resuming tracking...');
    // 只有在不是手动停止的情况下才自动恢复
    if (tracker && !tracker.isRunning() && !isManuallyStopped) {
      tracker.start();
      if (mainWindow) {
        mainWindow.webContents.send('tracking-status-changed', true);
      }
    }
  });
}

