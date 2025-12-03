import { contextBridge, ipcRenderer } from 'electron';

export interface AppSettings {
  checkInterval: number;
  autoStart: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getActivityData: (date: string) => ipcRenderer.invoke('get-activity-data', date),
  getAppUsage: (startDate: string, endDate: string) => 
    ipcRenderer.invoke('get-app-usage', startDate, endDate),
  getDailySummary: (date: string) => ipcRenderer.invoke('get-daily-summary', date),
  getWindowUsage: (date: string) => ipcRenderer.invoke('get-window-usage', date),
  getActivityTimeline: (date: string) => ipcRenderer.invoke('get-activity-timeline', date),
  generateReport: (date: string) => ipcRenderer.invoke('generate-report', date),
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
  onTrackingStatusChanged: (callback: (isRunning: boolean) => void) => {
    const handler = (_: any, isRunning: boolean) => callback(isRunning);
    ipcRenderer.on('tracking-status-changed', handler);
    return () => ipcRenderer.removeListener('tracking-status-changed', handler);
  },
});

