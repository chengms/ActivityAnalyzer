import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface AppSettings {
  checkInterval: number; // 检测间隔（毫秒）
  autoStart: boolean; // 开机自启动
  startMinimized: boolean; // 启动时最小化
  minimizeToTray: boolean; // 最小化到托盘
  closeToTray: boolean; // 关闭到托盘
  debugMode: boolean; // 调试模式（打开开发者工具）
}

const DEFAULT_SETTINGS: AppSettings = {
  checkInterval: 5000, // 默认 5 秒
  autoStart: false,
  startMinimized: false,
  minimizeToTray: true,
  closeToTray: true,
  debugMode: false, // 默认关闭调试模式
};

export class Settings {
  private settingsPath: string;
  private settings: AppSettings;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
    this.settings = this.loadSettings();
  }

  private loadSettings(): AppSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        const loaded = JSON.parse(data);
        // 合并默认设置，确保新字段有默认值
        return { ...DEFAULT_SETTINGS, ...loaded };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings() {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }

  updateSettings(updates: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
  }

  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    this.settings[key] = value;
    this.saveSettings();
  }

  reset() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
  }
}

