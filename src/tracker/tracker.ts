import { Database, ActivityRecord } from './database';
import activeWin from 'active-win';

export class ActivityTracker {
  private database: Database;
  private intervalId: NodeJS.Timeout | null = null;
  private currentApp: string = '';
  private currentWindow: string = '';
  private currentStartTime: Date | null = null;
  private currentRecordId: number | null = null;
  private checkInterval: number = 5000; // 默认5秒检查一次

  constructor(database: Database, checkInterval?: number) {
    this.database = database;
    if (checkInterval) {
      this.checkInterval = checkInterval;
    }
  }

  start(checkInterval?: number) {
    // 如果提供了新的间隔，更新它
    if (checkInterval !== undefined) {
      this.checkInterval = checkInterval;
    }

    // 如果已经在运行，先停止
    this.stop();

    // 立即检查一次
    this.checkActivity();
    
    // 定期检查活动
    this.intervalId = setInterval(() => {
      this.checkActivity();
    }, this.checkInterval);
  }

  updateInterval(newInterval: number) {
    if (newInterval < 1000) {
      console.warn('检测间隔不能小于1秒');
      return;
    }
    this.checkInterval = newInterval;
    // 如果正在运行，重新启动以应用新间隔
    if (this.intervalId) {
      this.start();
    }
  }

  getInterval(): number {
    return this.checkInterval;
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // 保存当前活动记录
    this.saveCurrentActivity();
  }

  private async checkActivity() {
    try {
      // 先获取窗口标题
      const activeWindow = await this.getActiveWindowTitle();
      
      // 然后获取应用名称（传入窗口标题用于推断）
      const activeApp = await this.getActiveApplication(activeWindow);

      // 如果应用或窗口发生变化
      if (activeApp !== this.currentApp || activeWindow !== this.currentWindow) {
        // 保存之前的活动
        this.saveCurrentActivity();
        
        // 开始新的活动记录
        this.currentApp = activeApp;
        this.currentWindow = activeWindow;
        this.currentStartTime = new Date();
        this.currentRecordId = null;
      }
    } catch (error) {
      console.error('Error checking activity:', error);
    }
  }

  private saveCurrentActivity() {
    if (!this.currentStartTime || !this.currentApp) return;

    const now = new Date();
    const duration = Math.floor((now.getTime() - this.currentStartTime.getTime()) / 1000);
    
    if (duration < 1) return; // 忽略小于1秒的活动

    const record: ActivityRecord = {
      appName: this.currentApp,
      windowTitle: this.currentWindow,
      startTime: this.currentStartTime.toISOString(),
      endTime: now.toISOString(),
      duration,
      date: this.getDateString(this.currentStartTime),
    };

    if (this.currentRecordId) {
      // 更新现有记录（当前会话中的记录）
      this.database.updateActivityEndTime(
        this.currentRecordId,
        record.endTime!,
        record.duration
      );
    } else {
      // 插入新记录（保存详细时间线）
      const recordId = this.database.insertActivity(record);
      this.currentRecordId = recordId || null;
    }
  }

  private async getActiveApplication(windowTitle?: string): Promise<string> {
    // Windows 平台获取活动应用
    if (process.platform === 'win32') {
      try {
        // 首先尝试从窗口标题推断应用名称
        if (windowTitle && windowTitle !== 'Unknown Window') {
          const inferredApp = this.inferAppFromWindowTitle(windowTitle);
          if (inferredApp) {
            return inferredApp;
          }
        }

        // 使用 active-win 直接调用系统API
        const result = await activeWin();
        
        if (!result) {
          return 'Unknown';
        }

        // 从进程路径提取应用名称
        let appName = result.owner?.name || 'Unknown';
        
        // 如果有进程路径，从路径提取（更准确）
        if (result.owner?.path) {
          const path = require('path');
          appName = path.basename(result.owner.path, path.extname(result.owner.path));
        }

        // 清理应用名称
        appName = appName.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');
        
        // 再次尝试从进程名推断应用名称
        if (appName && windowTitle) {
          const inferredFromProcess = this.inferAppFromProcessName(appName, windowTitle);
          if (inferredFromProcess) {
            return inferredFromProcess;
          }
        }
        
        return appName || 'Unknown';
      } catch (error) {
        console.error('Error getting active application:', error);
        return 'Unknown';
      }
    }
    return 'Unknown';
  }

  // 从窗口标题推断应用名称
  private inferAppFromWindowTitle(windowTitle: string): string | null {
    if (!windowTitle || windowTitle === 'Unknown Window') {
      return null;
    }

    // 应用名称映射表（窗口标题关键词 -> 应用名称）
    const appMappings: { [key: string]: string } = {
      'weixin': '微信',
      '微信': '微信',
      'wechat': '微信',
      'WeChat': '微信',
      'chrome': 'Chrome',
      'edge': 'Microsoft Edge',
      'firefox': 'Firefox',
      'visual studio code': 'VS Code',
      'vscode': 'VS Code',
      'cursor': 'Cursor',
      'notepad++': 'Notepad++',
      'notepad': '记事本',
      'word': 'Microsoft Word',
      'excel': 'Microsoft Excel',
      'powerpoint': 'Microsoft PowerPoint',
      'outlook': 'Microsoft Outlook',
      'teams': 'Microsoft Teams',
      'slack': 'Slack',
      'discord': 'Discord',
      'qq': 'QQ',
      '钉钉': '钉钉',
      'dingtalk': '钉钉',
      '飞书': '飞书',
      'feishu': '飞书',
      'wps': 'WPS',
      'photoshop': 'Photoshop',
      'illustrator': 'Illustrator',
      'premiere': 'Premiere Pro',
      'after effects': 'After Effects',
    };

    const lowerTitle = windowTitle.toLowerCase();
    
    // 检查是否包含关键词（优先匹配更长的关键词）
    const sortedMappings = Object.entries(appMappings).sort((a, b) => b[0].length - a[0].length);
    
    for (const [keyword, appName] of sortedMappings) {
      if (lowerTitle.includes(keyword.toLowerCase())) {
        return appName;
      }
    }

    return null;
  }

  // 从进程名和窗口标题推断应用名称
  private inferAppFromProcessName(processName: string, windowTitle: string): string | null {
    if (!processName || !windowTitle) {
      return null;
    }

    const lowerProcess = processName.toLowerCase();
    const lowerTitle = windowTitle.toLowerCase();

    // 如果进程名是powershell但窗口标题包含特定应用，推断应用名称
    if (lowerProcess === 'powershell' || lowerProcess === 'pwsh') {
      // 检查窗口标题
      if (lowerTitle.includes('weixin') || lowerTitle.includes('微信') || lowerTitle.includes('wechat')) {
        return '微信';
      }
      if (lowerTitle.includes('qq')) {
        return 'QQ';
      }
      if (lowerTitle.includes('钉钉') || lowerTitle.includes('dingtalk')) {
        return '钉钉';
      }
      if (lowerTitle.includes('飞书') || lowerTitle.includes('feishu')) {
        return '飞书';
      }
    }

    // 进程名直接匹配
    const processMappings: { [key: string]: string } = {
      'wechat': '微信',
      'weixin': '微信',
      'wechatapp': '微信',
      'qq': 'QQ',
      'tim': 'QQ',
      'dingtalk': '钉钉',
      'feishu': '飞书',
      'chrome': 'Chrome',
      'msedge': 'Microsoft Edge',
      'firefox': 'Firefox',
      'code': 'VS Code',
      'cursor': 'Cursor',
      'notepad++': 'Notepad++',
      'notepad': '记事本',
      'winword': 'Microsoft Word',
      'excel': 'Microsoft Excel',
      'powerpnt': 'Microsoft PowerPoint',
      'outlook': 'Microsoft Outlook',
      'teams': 'Microsoft Teams',
    };

    for (const [keyword, appName] of Object.entries(processMappings)) {
      if (lowerProcess.includes(keyword.toLowerCase())) {
        return appName;
      }
    }

    return null;
  }

  private async getActiveWindowTitle(): Promise<string> {
    // Windows 平台获取活动窗口标题
    if (process.platform === 'win32') {
      try {
        // 使用 active-win 直接调用系统API
        const result = await activeWin();
        
        if (!result || !result.title) {
          return 'Unknown Window';
        }

        // 清理窗口标题
        let title = result.title.trim();
        title = title.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');
        
        // 如果标题为空或只包含空白字符，返回Unknown Window
        if (!title || /^\s*$/.test(title)) {
          return 'Unknown Window';
        }
        
        return title;
      } catch (error) {
        console.error('Error getting active window title:', error);
        return 'Unknown Window';
      }
    }
    return 'Unknown Window';
  }

  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

