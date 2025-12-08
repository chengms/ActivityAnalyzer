import { contextBridge, ipcRenderer } from 'electron';

export interface AppSettings {
  checkInterval: number;
  autoStart: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  debugMode: boolean;
  databasePath?: string;
  logPath?: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getActivityData: (date: string) => ipcRenderer.invoke('get-activity-data', date),
  getAppUsage: (startDate: string, endDate: string) => 
    ipcRenderer.invoke('get-app-usage', startDate, endDate),
  getDailySummary: (date: string) => ipcRenderer.invoke('get-daily-summary', date),
  getWindowUsage: (date: string) => ipcRenderer.invoke('get-window-usage', date),
  getActivityTimeline: (date: string) => ipcRenderer.invoke('get-activity-timeline', date),
  generateReport: (date: string, startDate?: string, endDate?: string) => 
    ipcRenderer.invoke('generate-report', date, startDate, endDate),
  getReportList: () => ipcRenderer.invoke('get-report-list') as Promise<Array<{ date: string; htmlPath: string; excelPath: string; exists: boolean }>>,
  readHTMLReport: (htmlPath: string) => ipcRenderer.invoke('read-html-report', htmlPath) as Promise<string | null>,
  openReportFile: (filePath: string) => ipcRenderer.invoke('open-report-file', filePath) as Promise<void>,
  // 设置相关
  getSettings: () => ipcRenderer.invoke('get-settings') as Promise<AppSettings | null>,
  updateSettings: (updates: Partial<AppSettings>) => 
    ipcRenderer.invoke('update-settings', updates) as Promise<boolean>,
  getAutoStartStatus: () => ipcRenderer.invoke('get-auto-start-status') as Promise<boolean>,
  // 监听设置打开事件
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on('open-settings', callback);
    return () => ipcRenderer.removeListener('open-settings', callback);
  },
  // 追踪控制
  startTracking: () => ipcRenderer.invoke('start-tracking') as Promise<boolean>,
  stopTracking: () => ipcRenderer.invoke('stop-tracking') as Promise<boolean>,
  getTrackingStatus: () => ipcRenderer.invoke('get-tracking-status') as Promise<boolean>,
  getCurrentActivity: () => ipcRenderer.invoke('get-current-activity') as Promise<{ appName: string; windowTitle: string; duration: number; startTime: Date | null } | null>,
  getRecentActivities: () => ipcRenderer.invoke('get-recent-activities') as Promise<Array<{ appName: string; windowTitle: string; duration: number; startTime: Date; endTime: Date | null; isActive: boolean }>>,
  onTrackingStatusChanged: (callback: (isRunning: boolean) => void) => {
    const handler = (_: any, isRunning: boolean) => callback(isRunning);
    ipcRenderer.on('tracking-status-changed', handler);
    return () => ipcRenderer.removeListener('tracking-status-changed', handler);
  },
  // 删除活动记录
  deleteActivityByAppWindow: (date: string, appName: string, windowTitle: string) => 
    ipcRenderer.invoke('delete-activity-by-app-window', date, appName, windowTitle) as Promise<number>,
  deleteActivityByApp: (appName: string) => 
    ipcRenderer.invoke('delete-activity-by-app', appName) as Promise<number>,
  deleteActivityByAppDate: (date: string, appName: string) => 
    ipcRenderer.invoke('delete-activity-by-app-date', date, appName) as Promise<number>,
  deleteUnknownActivities: (date?: string) => 
    ipcRenderer.invoke('delete-unknown-activities', date) as Promise<number>,
  // 日志相关
  getLogFilePath: () => ipcRenderer.invoke('get-log-file-path') as Promise<string>,
  getLogDirPath: () => ipcRenderer.invoke('get-log-dir-path') as Promise<string>,
  // 文件夹选择
  selectFolder: (options?: { title?: string; defaultPath?: string }) => 
    ipcRenderer.invoke('select-folder', options) as Promise<string | null>,
});

