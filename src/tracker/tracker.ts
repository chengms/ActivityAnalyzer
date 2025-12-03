import { Database, ActivityRecord } from './database';

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

  private checkActivity() {
    try {
      const activeApp = this.getActiveApplication();
      const activeWindow = this.getActiveWindowTitle();

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

  private getActiveApplication(): string {
    // Windows 平台获取活动应用
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        
        // 使用临时文件避免引号转义问题
        const tempFile = path.join(os.tmpdir(), `get-app-${Date.now()}.ps1`);
        const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")]
  public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int ProcessId);
  public static int GetActiveProcessId() {
    IntPtr hwnd = GetForegroundWindow();
    int pid;
    GetWindowThreadProcessId(hwnd, out pid);
    return pid;
  }
}
"@
$pid = [Win32]::GetActiveProcessId()
(Get-Process -Id $pid).ProcessName
`;
        
        fs.writeFileSync(tempFile, psScript, 'utf-8');
        
        try {
          const result = execSync(
            `chcp 65001 >nul && powershell -ExecutionPolicy Bypass -NoProfile -File "${tempFile}"`,
            {
              encoding: 'utf-8',
              timeout: 2000,
              stdio: ['pipe', 'pipe', 'ignore'],
              shell: true,
            }
          );
          let appName = result.toString('utf-8').trim();
          // 清理无效字符
          appName = appName.replace(/^\uFEFF/, ''); // 移除BOM
          appName = appName.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, ''); // 移除控制字符
          return appName || 'Unknown';
        } finally {
          // 清理临时文件
          try {
            fs.unlinkSync(tempFile);
          } catch {}
        }
      } catch (error) {
        console.error('Error getting active application:', error);
        return 'Unknown';
      }
    }
    return 'Unknown';
  }

  private getActiveWindowTitle(): string {
    // Windows 平台获取活动窗口标题
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        
        // 使用临时文件避免引号转义问题
        const tempFile = path.join(os.tmpdir(), `get-title-${Date.now()}.ps1`);
        // 使用Base64编码来避免编码问题
        const psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  public static string GetActiveWindowTitle() {
    IntPtr hwnd = GetForegroundWindow();
    if (hwnd == IntPtr.Zero) return "";
    StringBuilder sb = new StringBuilder(1024);
    int length = GetWindowText(hwnd, sb, 1024);
    if (length == 0) return "";
    return sb.ToString();
  }
}
"@
try {
  $title = [Win32]::GetActiveWindowTitle()
  if ($title -and $title.Length -gt 0) {
    # 使用Base64编码输出，避免编码问题
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($title)
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
          // 使用chcp 65001设置UTF-8代码页，然后执行PowerShell
          const result = execSync(
            `chcp 65001 >nul 2>&1 && powershell -ExecutionPolicy Bypass -NoProfile -File "${tempFile}"`,
            {
              encoding: 'utf-8',
              timeout: 3000,
              stdio: ['pipe', 'pipe', 'ignore'],
              shell: true,
            }
          );
          
          let output = result.toString('utf-8').trim();
          
          // 清理可能的BOM和换行符
          output = output.replace(/^\uFEFF/, '').replace(/[\r\n]/g, '').trim();
          
          // 如果是Base64编码的，解码
          if (output && /^[A-Za-z0-9+/=]+$/.test(output)) {
            try {
              // Node.js环境中的Buffer
              const title = Buffer.from(output, 'base64').toString('utf-8');
              
              // 清理无效字符
              let cleanTitle = title.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');
              
              // 如果标题为空或只包含空白字符，返回Unknown Window
              if (!cleanTitle || /^\s*$/.test(cleanTitle)) {
                return 'Unknown Window';
              }
              
              return cleanTitle;
            } catch (decodeError) {
              // 如果解码失败，尝试直接使用
              console.warn('Failed to decode base64 title, using raw:', decodeError);
            }
          }
          
          // 如果不是Base64，直接使用（向后兼容）
          if (output && !/^\s*$/.test(output)) {
            return output.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');
          }
          
          return 'Unknown Window';
        } finally {
          // 清理临时文件
          try {
            fs.unlinkSync(tempFile);
          } catch {}
        }
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

