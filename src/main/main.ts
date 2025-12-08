import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, powerMonitor, shell, dialog } from 'electron';
import path from 'path';
import { Database } from '../tracker/database';
import { ActivityTracker } from '../tracker/tracker';
import { Reporter } from '../reporter/reporter';
import { Settings, AppSettings } from '../settings/settings';
import { AutoLauncher } from './autoLauncher';
import { logger } from './logger';
import * as fs from 'fs';

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
    autoHideMenuBar: true, // 隐藏默认菜单栏
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

  // 如果启用了调试模式，打开开发者工具
  if (settings?.getSetting('debugMode')) {
    mainWindow.webContents.openDevTools();
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
  let trayIcon: Electron.NativeImage | null = null;
  
  // 尝试从多个可能的位置加载图标
  // 注意：打包后的应用路径与开发模式不同
  const isDev = !app.isPackaged;
  const possibleIconPaths: string[] = [];
  
  if (isDev) {
    // 开发模式：从项目根目录加载
    // 在开发模式下，app.getAppPath() 返回项目根目录
    // __dirname 是 dist/main/，需要向上两级到项目根目录
    const projectRoot = app.getAppPath();
    const distMainDir = __dirname; // dist/main/
    const projectRootFromDist = path.join(distMainDir, '../../'); // 从 dist/main/ 向上两级
    
    possibleIconPaths.push(
      // 从项目根目录加载（最常用）
      path.join(projectRoot, 'build', 'icon.ico'),
      path.join(projectRoot, 'build', 'icon-1.png'),
      // 从 dist/main/ 相对路径加载
      path.join(distMainDir, '../../build/icon.ico'),
      path.join(distMainDir, '../../build/icon-1.png'),
      // 使用 path.resolve 确保路径正确
      path.resolve(projectRoot, 'build', 'icon.ico'),
      path.resolve(projectRoot, 'build', 'icon-1.png'),
      path.resolve(distMainDir, '../../build/icon.ico'),
      path.resolve(distMainDir, '../../build/icon-1.png'),
      // 备用路径
      path.join(projectRoot, 'assets', 'icon.png'),
      path.join(projectRoot, 'icon.png'),
    );
  } else {
    // 打包后的应用：从 resources 目录加载
    // electron-builder 会将 buildResources 目录的内容复制到 resources 目录
    const resourcesPath = process.resourcesPath || path.join(path.dirname(process.execPath), 'resources');
    possibleIconPaths.push(
      path.join(resourcesPath, 'build', 'icon.ico'),
      path.join(resourcesPath, 'build', 'icon-1.png'),
      path.join(resourcesPath, 'app.asar.unpacked', 'build', 'icon.ico'),
      // 如果图标被打包到 asar 中
      path.join(app.getAppPath(), 'build', 'icon.ico'),
      path.join(app.getAppPath(), 'build', 'icon-1.png'),
      // 备用：从应用目录加载
      path.join(path.dirname(process.execPath), 'build', 'icon.ico'),
      path.join(path.dirname(process.execPath), 'build', 'icon-1.png'),
    );
  }
  
  // 添加通用备用路径
  possibleIconPaths.push(
    path.join(__dirname, '../renderer/favicon.ico'),
  );
  
  try {
    let found = false;
    // 在开发模式下，记录所有尝试的路径以便调试
    if (isDev) {
      logger.info(`[Dev Mode] Searching for tray icon in ${possibleIconPaths.length} possible paths`);
      logger.info(`[Dev Mode] app.getAppPath(): ${app.getAppPath()}`);
      logger.info(`[Dev Mode] __dirname: ${__dirname}`);
    }
    
    for (const iconPath of possibleIconPaths) {
      const normalizedPath = path.normalize(iconPath);
      if (fs.existsSync(normalizedPath)) {
        logger.info(`Loading tray icon from: ${normalizedPath}`);
        trayIcon = nativeImage.createFromPath(normalizedPath);
        
        // 验证图标是否有效
        if (trayIcon && trayIcon.getSize().width > 0) {
          found = true;
          logger.info(`Successfully loaded tray icon (${trayIcon.getSize().width}x${trayIcon.getSize().height})`);
          break;
        } else {
          logger.warn(`Icon file found but invalid: ${normalizedPath}`);
        }
      } else if (isDev) {
        // 在开发模式下，记录未找到的路径（仅前几个，避免日志过多）
        const index = possibleIconPaths.indexOf(iconPath);
        if (index < 5) {
          logger.debug(`Icon not found at: ${normalizedPath}`);
        }
      }
    }
    
    if (!found || !trayIcon) {
      logger.warn('No tray icon found, creating empty icon');
      // 创建一个简单的16x16图标
      trayIcon = nativeImage.createEmpty();
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }
    
    // 确保图标大小合适（Windows 推荐 16x16 或 32x32）
    const iconSize = trayIcon.getSize();
    if (iconSize.width > 32 || iconSize.height > 32) {
      logger.info(`Resizing tray icon from ${iconSize.width}x${iconSize.height} to 32x32`);
      trayIcon = trayIcon.resize({ width: 32, height: 32 });
    } else if (iconSize.width < 16 || iconSize.height < 16) {
      logger.info(`Resizing tray icon from ${iconSize.width}x${iconSize.height} to 16x16`);
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }
  } catch (error) {
    logger.error('Error creating tray icon:', error);
    // 创建一个最小的图标
    trayIcon = nativeImage.createEmpty();
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
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
    // 初始化设置（需要先初始化，因为 Database 和 Logger 需要读取设置）
    settings = new Settings();
    
    // 更新日志目录（使用设置中的路径）
    const logPath = settings.getSetting('logPath');
    logger.updateLogDir(logPath);
    logger.info('App ready, initializing...');
    logger.info('Settings initialized');
    
    // 初始化自动启动器
    logger.info('Initializing auto launcher...');
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
      logger.error('Error handling auto start:', error);
    }

    // 初始化数据库（使用设置中的路径）
    logger.info('Initializing database...');
    const dbPath = settings.getSetting('databasePath');
    database = new Database(dbPath);
    database.init();
    logger.info(`Database initialized at: ${database.getDbPath()}`);

    // 初始化活动追踪器（使用设置中的检测间隔）
    logger.info('Initializing tracker...');
    const checkInterval = settings.getSetting('checkInterval');
    tracker = new ActivityTracker(database, checkInterval);
    tracker.start();
    logger.info('Tracker started');

    // 监听锁屏事件
    setupLockScreenMonitoring();

    // 初始化报告生成器
    logger.info('Initializing reporter...');
    reporter = new Reporter(database);

    // 创建系统托盘
    logger.info('Creating tray...');
    createTray();
    logger.info('Tray created');

    // 创建窗口（如果设置了启动时最小化，窗口会隐藏）
    logger.info('Creating window...');
    createWindow();
    logger.info('Window created, app ready!');
    logger.info(`Log file location: ${logger.getLogFilePath()}`);
  } catch (error) {
    logger.error('Error during initialization:', error);
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

// 删除活动记录相关 IPC
ipcMain.handle('delete-activity-by-app-window', async (event, date: string, appName: string, windowTitle: string) => {
  if (!database) return 0;
  return database.deleteActivityByAppAndWindow(date, appName, windowTitle);
});

ipcMain.handle('delete-activity-by-app', async (event, appName: string) => {
  if (!database) return 0;
  return database.deleteActivityByApp(appName);
});

ipcMain.handle('delete-activity-by-app-date', async (event, date: string, appName: string) => {
  if (!database) return 0;
  return database.deleteActivityByAppAndDate(date, appName);
});

ipcMain.handle('delete-unknown-activities', async (event, date?: string) => {
  if (!database) return 0;
  return database.deleteUnknownActivities(date);
});

ipcMain.handle('generate-report', async (event, date: string, startDateTime?: string, endDateTime?: string) => {
  if (!reporter) return { success: false, path: '' };
  // 如果提供了开始日期时间和结束日期时间，生成时间段报告
  // 支持日期字符串（YYYY-MM-DD）或完整的日期时间字符串（ISO 8601）
  if (startDateTime && endDateTime) {
    // 检查是否是完整的一天（00:00:00 到 23:59:59）
    const startDate = startDateTime.split('T')[0];
    const endDate = endDateTime.split('T')[0];
    const isFullDay = startDate === endDate && 
                      startDateTime.endsWith('T00:00:00') && 
                      endDateTime.endsWith('T23:59:59');
    
    // 如果不是完整的一天，生成时间段报告（即使日期相同，只要时间不同）
    if (!isFullDay) {
      return await reporter.generateDateRangeReport(startDateTime, endDateTime);
    }
  }
  // 否则生成单日报告（使用传入的 date 或 startDateTime 的日期部分）
  const reportDate = startDateTime ? startDateTime.split('T')[0] : date;
  return await reporter.generateDailyReport(reportDate);
});

ipcMain.handle('get-report-list', async () => {
  if (!reporter) return [];
  return reporter.getReportList();
});

ipcMain.handle('read-html-report', async (event, htmlPath: string) => {
  if (!reporter) return null;
  return reporter.readHTMLReport(htmlPath);
});

ipcMain.handle('open-report-file', async (event, filePath: string) => {
  try {
    await shell.openPath(filePath);
  } catch (error) {
    logger.error('Error opening report file:', error);
    throw error;
  }
});

// 设置相关 IPC
ipcMain.handle('get-settings', async () => {
  if (!settings) return null;
  return settings.getSettings();
});

ipcMain.handle('update-settings', async (event, updates: Partial<AppSettings>) => {
  if (!settings) return false;
  
  try {
    settings.updateSettings(updates);
    
    // 如果更新了检测间隔，更新追踪器
    if (updates.checkInterval && tracker) {
      tracker.updateInterval(updates.checkInterval);
    }
    
    // 如果更新了开机自启动，更新注册表
    if (updates.autoStart !== undefined && autoLauncher) {
      try {
        if (updates.autoStart) {
          await autoLauncher.enable();
        } else {
          await autoLauncher.disable();
        }
      } catch (error) {
        logger.error('Error updating auto start:', error);
        // 继续执行，不中断设置更新
      }
    }
    
    // 如果更新了调试模式，打开/关闭开发者工具
    if (updates.debugMode !== undefined && mainWindow) {
      if (updates.debugMode) {
        mainWindow.webContents.openDevTools();
      } else {
        mainWindow.webContents.closeDevTools();
      }
    }
    
    // 如果更新了数据库路径，迁移数据库文件
    if (updates.databasePath !== undefined) {
      const oldDbPath = database ? database.getDbPath() : null;
      const newDbPath = updates.databasePath.trim() || '';
      
      // 计算新的数据库路径
      let targetDbPath: string;
      if (newDbPath === '') {
        // 重置为默认路径
        const userDataPath = app.getPath('userData');
        targetDbPath = path.join(userDataPath, 'activity.db');
      } else {
        if (path.isAbsolute(newDbPath)) {
          if (newDbPath.toLowerCase().endsWith('.db')) {
            targetDbPath = newDbPath;
          } else {
            targetDbPath = path.join(newDbPath, 'activity.db');
          }
        } else {
          targetDbPath = path.join(newDbPath, 'activity.db');
        }
      }
      
      // 如果路径确实变更了，且旧数据库文件存在，则迁移
      if (oldDbPath && oldDbPath !== targetDbPath && fs.existsSync(oldDbPath)) {
        try {
          // 确保目标目录存在
          const targetDir = path.dirname(targetDbPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          // 如果目标文件已存在，先备份
          if (fs.existsSync(targetDbPath)) {
            const backupPath = targetDbPath + '.backup.' + Date.now();
            fs.copyFileSync(targetDbPath, backupPath);
            logger.info(`Backed up existing database to: ${backupPath}`);
          }
          
          // 关闭当前数据库连接
          if (database) {
            try {
              database.close();
              logger.info('Database connection closed for migration');
            } catch (e) {
              logger.warn('Error closing database connection:', e);
              // 继续尝试迁移，可能数据库已经关闭
            }
          }
          
          // 移动数据库文件
          fs.copyFileSync(oldDbPath, targetDbPath);
          logger.info(`Database file copied from ${oldDbPath} to ${targetDbPath}`);
          
          // 验证新文件是否有效（简单检查文件大小）
          const oldStats = fs.statSync(oldDbPath);
          const newStats = fs.statSync(targetDbPath);
          if (newStats.size === oldStats.size && newStats.size > 0) {
            // 删除旧文件（仅在确认新文件有效后）
            fs.unlinkSync(oldDbPath);
            logger.info(`Old database file removed: ${oldDbPath}`);
          } else {
            throw new Error('Database file size mismatch after copy');
          }
          
          logger.info('Database migration completed successfully');
          
          // 尝试重新初始化数据库（使用新路径）
          // 注意：由于路径已变更，需要重新创建 Database 实例
          // 但为了安全，我们不在迁移后立即重新初始化，而是提示用户重启
          // 这样可以避免在迁移过程中出现数据不一致的问题
        } catch (error) {
          logger.error('Error migrating database:', error);
          
          // 尝试重新打开旧数据库（如果迁移失败）
          if (database && oldDbPath && fs.existsSync(oldDbPath)) {
            try {
              database.init();
              logger.info('Re-opened database at old location after migration failure');
            } catch (reopenError) {
              logger.error('Failed to re-open database:', reopenError);
            }
          }
          
          // 回滚设置
          const currentSettings = settings.getSettings();
          settings.updateSetting('databasePath', currentSettings.databasePath || '');
          throw new Error(`数据库迁移失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      if (updates.databasePath !== undefined) {
        logger.warn('Database path changed. Application restart required to apply the change.');
      }
    }
    
    // 如果更新了日志路径，迁移日志目录
    if (updates.logPath !== undefined) {
      const oldLogDir = logger.getLogDirPath();
      const newLogPath = updates.logPath.trim() || '';
      
      // 计算新的日志目录路径
      let targetLogDir: string;
      if (newLogPath === '') {
        // 重置为默认路径
        const userDataPath = app.getPath('userData');
        targetLogDir = path.join(userDataPath, 'logs');
      } else {
        if (path.isAbsolute(newLogPath)) {
          targetLogDir = path.join(newLogPath, 'logs');
        } else {
          targetLogDir = path.join(newLogPath, 'logs');
        }
      }
      
      // 如果路径确实变更了，且旧日志目录存在，则迁移
      if (oldLogDir !== targetLogDir && fs.existsSync(oldLogDir)) {
        try {
          // 确保目标目录存在
          if (!fs.existsSync(targetLogDir)) {
            fs.mkdirSync(targetLogDir, { recursive: true });
          }
          
          // 复制所有日志文件
          const logFiles = fs.readdirSync(oldLogDir).filter(file => 
            file.startsWith('app-') && file.endsWith('.log')
          );
          
          if (logFiles.length > 0) {
            for (const file of logFiles) {
              const oldFilePath = path.join(oldLogDir, file);
              const newFilePath = path.join(targetLogDir, file);
              
              // 如果目标文件已存在，跳过（保留较新的）
              if (fs.existsSync(newFilePath)) {
                const oldStats = fs.statSync(oldFilePath);
                const newStats = fs.statSync(newFilePath);
                if (oldStats.mtime > newStats.mtime) {
                  fs.copyFileSync(oldFilePath, newFilePath);
                }
              } else {
                fs.copyFileSync(oldFilePath, newFilePath);
              }
            }
            logger.info(`Migrated ${logFiles.length} log files from ${oldLogDir} to ${targetLogDir}`);
          }
          
          // 更新日志目录
          logger.updateLogDir(updates.logPath);
          logger.info(`Log directory updated to: ${logger.getLogDirPath()}`);
        } catch (error) {
          logger.error('Error migrating log directory:', error);
          // 回滚设置
          const currentSettings = settings.getSettings();
          settings.updateSetting('logPath', currentSettings.logPath || '');
          throw new Error(`日志目录迁移失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        // 路径未变更或旧目录不存在，直接更新
        logger.updateLogDir(updates.logPath);
        logger.info(`Log directory updated to: ${logger.getLogDirPath()}`);
      }
    }
    
    return true;
  } catch (error) {
    logger.error('Error updating settings:', error);
    return false;
  }
});

ipcMain.handle('get-auto-start-status', async () => {
  if (!autoLauncher) return false;
  return await autoLauncher.isEnabled();
});

// 选择文件夹对话框
ipcMain.handle('select-folder', async (event, options?: { title?: string; defaultPath?: string }) => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options?.title || '选择文件夹',
    defaultPath: options?.defaultPath,
    properties: ['openDirectory', 'createDirectory'],
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  
  return result.filePaths[0];
});

// 日志相关 IPC
ipcMain.handle('get-log-file-path', async () => {
  return logger.getLogFilePath();
});

ipcMain.handle('get-log-dir-path', async () => {
  return logger.getLogDirPath();
});

// 追踪控制相关 IPC
ipcMain.handle('start-tracking', async () => {
  if (!tracker) return false;
  tracker.start();
  isManuallyStopped = false;
  logger.info('Tracking started manually');
  return true;
});

ipcMain.handle('stop-tracking', async () => {
  if (!tracker) return false;
  tracker.stop();
  isManuallyStopped = true;
  logger.info('Tracking stopped manually');
  return true;
});

ipcMain.handle('get-tracking-status', async () => {
  if (!tracker) return false;
  return tracker.isRunning();
});

ipcMain.handle('get-current-activity', async () => {
  if (!tracker) return null;
  return tracker.getCurrentActivity();
});

ipcMain.handle('get-recent-activities', async () => {
  if (!tracker) return [];
  return tracker.getRecentActivities();
});

// 锁屏监控设置
function setupLockScreenMonitoring() {
  // Windows 和 macOS 都支持 lock-screen 和 unlock-screen 事件
  powerMonitor.on('lock-screen', () => {
    logger.info('Screen locked, stopping tracking...');
    if (tracker && tracker.isRunning()) {
      tracker.stop();
      // 通知渲染进程
      if (mainWindow) {
        mainWindow.webContents.send('tracking-status-changed', false);
      }
    }
  });

  powerMonitor.on('unlock-screen', () => {
    logger.info('Screen unlocked, resuming tracking...');
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
    logger.info('System suspending, stopping tracking...');
    if (tracker && tracker.isRunning()) {
      tracker.stop();
      if (mainWindow) {
        mainWindow.webContents.send('tracking-status-changed', false);
      }
    }
  });

  powerMonitor.on('resume', () => {
    logger.info('System resumed, resuming tracking...');
    // 只有在不是手动停止的情况下才自动恢复
    if (tracker && !tracker.isRunning() && !isManuallyStopped) {
      tracker.start();
      if (mainWindow) {
        mainWindow.webContents.send('tracking-status-changed', true);
      }
    }
  });
}

