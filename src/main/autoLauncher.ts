import { app } from 'electron';

export class AutoLauncher {
  private appName: string;
  private appPath: string;

  constructor() {
    this.appName = app.getName();
    this.appPath = process.execPath;
  }

  async isEnabled(): Promise<boolean> {
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const result = execSync(
          `reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${this.appName}"`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
        );
        return result.includes(this.appPath);
      } catch (error: any) {
        // 如果注册表项不存在，返回 false（这是正常的）
        if (error.status === 1) {
          return false;
        }
        console.error('Error checking auto-launch status:', error.message);
        return false;
      }
    }
    return false;
  }

  async enable(): Promise<boolean> {
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const command = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${this.appName}" /t REG_SZ /d "${this.appPath}" /f`;
        execSync(command, { 
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        });
        return true;
      } catch (error: any) {
        console.error('Error enabling auto-launch:', error.message || error);
        return false;
      }
    }
    return false;
  }

  async disable(): Promise<boolean> {
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const command = `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${this.appName}" /f`;
        execSync(command, { 
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        });
        return true;
      } catch (error: any) {
        // 如果注册表项不存在，也算成功（已经禁用了）
        if (error.status === 1) {
          return true;
        }
        console.error('Error disabling auto-launch:', error.message || error);
        return false;
      }
    }
    return false;
  }
}

