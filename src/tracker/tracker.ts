import { Database, ActivityRecord } from './database';
import activeWin from 'active-win';

export class ActivityTracker {
  private database: Database;
  private intervalId: NodeJS.Timeout | null = null;
  private saveIntervalId: NodeJS.Timeout | null = null; // 定期保存的interval ID
  private currentApp: string = '';
  private currentWindow: string = '';
  private currentStartTime: Date | null = null;
  private currentRecordId: number | null = null;
  private checkInterval: number = 5000; // 默认5秒检查一次
  private lastSaveTime: Date | null = null; // 上次保存时间
  private saveInterval: number = 60000; // 每60秒保存一次当前活动（即使没有切换）

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
    this.checkActivity().catch(err => {
      console.error('Error in initial checkActivity:', err);
    });
    
    // 定期检查活动（使用异步函数包装）
    this.intervalId = setInterval(() => {
      this.checkActivity().catch(err => {
        console.error('Error in checkActivity:', err);
      });
    }, this.checkInterval);

    // 定期保存当前活动（即使没有切换应用）
    // 每60秒保存一次当前活动的时长
    this.saveIntervalId = setInterval(() => {
      if (this.currentApp && this.currentStartTime) {
        console.log(`[AutoSave] Saving current activity: ${this.currentApp} - ${this.currentWindow}`);
        this.saveAndUpdateCurrentActivity();
      }
    }, this.saveInterval);
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
    
    if (this.saveIntervalId) {
      clearInterval(this.saveIntervalId);
      this.saveIntervalId = null;
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
        if (this.currentApp) {
          console.log(`[Activity] App changed: ${this.currentApp} -> ${activeApp}`);
          this.saveCurrentActivity();
        }
        
        // 开始新的活动记录
        this.currentApp = activeApp;
        this.currentWindow = activeWindow;
        this.currentStartTime = new Date();
        this.currentRecordId = null;
        console.log(`[Activity] Started tracking: ${activeApp} - ${activeWindow}`);
      }
    } catch (error) {
      console.error('[Activity] Error checking activity:', error);
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

    try {
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
      console.log(`Saved activity: ${this.currentApp} - ${this.currentWindow} (${duration}s)`);
      this.lastSaveTime = now;
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  }

  // 保存并更新当前活动（用于定期保存，不重置开始时间）
  private saveAndUpdateCurrentActivity() {
    if (!this.currentStartTime || !this.currentApp) return;

    const now = new Date();
    const duration = Math.floor((now.getTime() - this.currentStartTime.getTime()) / 1000);
    
    if (duration < 1) return; // 忽略小于1秒的活动

    try {
      if (this.currentRecordId) {
        // 更新现有记录的结束时间和时长
        this.database.updateActivityEndTime(
          this.currentRecordId,
          now.toISOString(),
          duration
        );
        console.log(`Updated activity: ${this.currentApp} - ${this.currentWindow} (${duration}s)`);
      } else {
        // 如果还没有记录ID，创建新记录
        const record: ActivityRecord = {
          appName: this.currentApp,
          windowTitle: this.currentWindow,
          startTime: this.currentStartTime.toISOString(),
          endTime: now.toISOString(),
          duration,
          date: this.getDateString(this.currentStartTime),
        };
        const recordId = this.database.insertActivity(record);
        this.currentRecordId = recordId || null;
        console.log(`Created activity: ${this.currentApp} - ${this.currentWindow} (${duration}s)`);
      }
      this.lastSaveTime = now;
    } catch (error) {
      console.error('Error saving/updating activity:', error);
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
            console.log(`[AppName] Inferred from window title "${windowTitle}": ${inferredApp}`);
            return inferredApp;
          }
        }

        // 使用 active-win 直接调用系统API
        let result = await activeWin();
        
        // 如果 active-win 失败，使用后备方案
        if (!result || !result.owner) {
          console.warn('[AppName] active-win failed, trying fallback method...');
          result = await this.getActiveWindowFallback();
        }

        if (!result || !result.owner) {
          console.warn('[AppName] All methods failed, returning Unknown');
          return 'Unknown';
        }

        // 从进程路径提取应用名称
        let appName = result.owner.name || 'Unknown';
        
        // 如果有进程路径，从路径提取（更准确）
        if (result.owner.path) {
          const path = require('path');
          appName = path.basename(result.owner.path, path.extname(result.owner.path));
          console.log(`[AppName] Extracted from path: ${result.owner.path} -> ${appName}`);
        } else if (result.owner.name) {
          console.log(`[AppName] Using owner name: ${result.owner.name}`);
        }

        // 清理应用名称
        appName = appName.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');
        
        // 再次尝试从进程名推断应用名称
        if (appName && windowTitle) {
          const inferredFromProcess = this.inferAppFromProcessName(appName, windowTitle);
          if (inferredFromProcess) {
            console.log(`[AppName] Inferred from process "${appName}" and window "${windowTitle}": ${inferredFromProcess}`);
            return inferredFromProcess;
          }
        }
        
        console.log(`[AppName] Final app name: ${appName}`);
        return appName || 'Unknown';
      } catch (error) {
        console.error('[AppName] Error getting active application:', error);
        // 尝试后备方案
        try {
          const fallbackResult = await this.getActiveWindowFallback();
          if (fallbackResult?.owner?.path) {
            const path = require('path');
            const appName = path.basename(fallbackResult.owner.path, path.extname(fallbackResult.owner.path));
            console.log(`[AppName] Fallback succeeded: ${appName}`);
            return appName;
          }
        } catch (fallbackError) {
          console.error('[AppName] Fallback also failed:', fallbackError);
        }
        return 'Unknown';
      }
    }
    return 'Unknown';
  }

  // 后备方案：使用 PowerShell 直接调用 Windows API 获取进程信息
  private async getActiveWindowFallback(): Promise<any> {
    try {
      const { execSync } = require('child_process');
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      const tempFile = path.join(os.tmpdir(), `get-process-${Date.now()}.ps1`);
      const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Diagnostics;
public class Win32 {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")]
  public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int ProcessId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  
  public static string GetActiveWindowInfo() {
    IntPtr hwnd = GetForegroundWindow();
    if (hwnd == IntPtr.Zero) return "";
    
    int pid;
    GetWindowThreadProcessId(hwnd, out pid);
    
    try {
      Process proc = Process.GetProcessById(pid);
      string processName = proc.ProcessName;
      string processPath = "";
      try {
        processPath = proc.MainModule.FileName;
      } catch {}
      
      StringBuilder sb = new StringBuilder(512);
      int length = GetWindowText(hwnd, sb, 512);
      string title = length > 0 ? sb.ToString() : "";
      
      return $"{processName}|{processPath}|{title}";
    } catch {
      return "";
    }
  }
}
"@
try {
  $info = [Win32]::GetActiveWindowInfo()
  if ($info) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($info)
    $base64 = [Convert]::ToBase64String($bytes)
    Write-Output $base64
  } else {
    Write-Output ""
  }
} catch {
  Write-Output ""
}
`;
      
      fs.writeFileSync(tempFile, psScript, 'utf-8');
      
      try {
        const result = execSync(
          `powershell -ExecutionPolicy Bypass -NoProfile -File "${tempFile}"`,
          {
            encoding: 'utf-8',
            timeout: 3000,
            stdio: ['pipe', 'pipe', 'ignore'],
            shell: true,
          }
        );
        
        const output = result.toString('utf-8').trim();
        if (output && /^[A-Za-z0-9+/=]+$/.test(output)) {
          const decoded = Buffer.from(output, 'base64').toString('utf-8');
          const [processName, processPath, title] = decoded.split('|');
          
          if (processName || processPath) {
            return {
              owner: {
                name: processName || '',
                path: processPath || '',
              },
              title: title || '',
            };
          }
        }
      } finally {
        try {
          fs.unlinkSync(tempFile);
        } catch {}
      }
    } catch (error) {
      console.error('[AppName] Fallback method error:', error);
    }
    
    return null;
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
        
        if (!result) {
          console.warn('[WindowTitle] active-win returned null');
          return 'Unknown Window';
        }

        if (!result.title) {
          console.warn('[WindowTitle] No title in result');
          return 'Unknown Window';
        }

        // 清理窗口标题
        let title = result.title.trim();
        title = title.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');
        
        // 如果标题为空或只包含空白字符，返回Unknown Window
        if (!title || /^\s*$/.test(title)) {
          console.warn('[WindowTitle] Title is empty after cleaning');
          return 'Unknown Window';
        }
        
        console.log(`[WindowTitle] Got title: ${title}`);
        return title;
      } catch (error) {
        console.error('[WindowTitle] Error getting active window title:', error);
        return 'Unknown Window';
      }
    }
    return 'Unknown Window';
  }

  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

