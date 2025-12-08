import React, { useState, useEffect } from 'react';
import './Settings.css';

interface AppSettings {
  checkInterval: number;
  autoStart: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  debugMode: boolean;
  databasePath?: string;
  logPath?: string;
  reportPath?: string;
}

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await window.electronAPI.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage('加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage('');

    try {
      // 检查数据库路径是否变更
      const currentSettings = await window.electronAPI.getSettings();
      const dbPathChanged = currentSettings?.databasePath !== settings.databasePath;
      const logPathChanged = currentSettings?.logPath !== settings.logPath;
      const reportPathChanged = currentSettings?.reportPath !== settings.reportPath;
      
      // 如果有路径变更，显示迁移提示
      if (dbPathChanged || logPathChanged || reportPathChanged) {
        setMessage('正在迁移数据文件...');
      }
      
      const success = await window.electronAPI.updateSettings(settings);
      if (success) {
        const pathChanges: string[] = [];
        if (dbPathChanged) pathChanges.push('数据库');
        if (logPathChanged) pathChanges.push('日志');
        if (reportPathChanged) pathChanges.push('报告');
        
        if (pathChanges.length > 0) {
          if (dbPathChanged) {
            setMessage(`设置已保存。${pathChanges.join('、')}路径已变更，数据已迁移，请重启应用以应用数据库路径更改。`);
          } else {
            setMessage(`设置已保存。${pathChanges.join('、')}路径已变更，数据已迁移。`);
          }
          setTimeout(() => {
            setMessage('');
          }, 6000);
        } else {
          setMessage('设置已保存');
          setTimeout(() => {
            setMessage('');
          }, 2000);
        }
      } else {
        setMessage('保存设置失败');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('迁移失败')) {
        setMessage(`保存失败: ${errorMessage}`);
      } else {
        setMessage('保存设置失败');
      }
      setTimeout(() => {
        setMessage('');
      }, 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof AppSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const formatInterval = (ms: number): string => {
    if (ms < 1000) return `${ms}毫秒`;
    if (ms < 60000) return `${ms / 1000}秒`;
    return `${ms / 60000}分钟`;
  };

  if (loading) {
    return (
      <div className="settings-content-wrapper">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="settings-content-wrapper">
      <div className="settings-header">
        <h2>⚙️ 设置</h2>
        <button className="btn-back" onClick={onClose}>← 返回</button>
      </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>检测设置</h3>
            <div className="setting-item">
              <label>
                <span>检测间隔</span>
                <span className="setting-hint">
                  当前: {formatInterval(settings.checkInterval)}
                </span>
              </label>
              <div className="setting-control">
                <input
                  type="range"
                  min="1000"
                  max="60000"
                  step="1000"
                  value={settings.checkInterval}
                  onChange={(e) => handleChange('checkInterval', parseInt(e.target.value))}
                />
                <div className="range-labels">
                  <span>1秒</span>
                  <span>60秒</span>
                </div>
                <input
                  type="number"
                  min="1000"
                  max="60000"
                  step="1000"
                  value={settings.checkInterval}
                  onChange={(e) => handleChange('checkInterval', parseInt(e.target.value) || 5000)}
                  className="interval-input"
                />
                <span className="unit">毫秒</span>
              </div>
              <p className="setting-description">
                检测活动窗口的时间间隔。间隔越小，数据越精确，但可能影响性能。
              </p>
            </div>
          </div>

          <div className="settings-section">
            <h3>启动设置</h3>
            <div className="setting-item">
              <label>
                <span>开机自启动</span>
              </label>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.autoStart}
                    onChange={(e) => handleChange('autoStart', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <p className="setting-description">
                启用后，应用将在系统启动时自动运行。
              </p>
            </div>

            <div className="setting-item">
              <label>
                <span>启动时最小化</span>
              </label>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.startMinimized}
                    onChange={(e) => handleChange('startMinimized', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <p className="setting-description">
                启用后，应用启动时不会显示主窗口。
              </p>
            </div>
          </div>

          <div className="settings-section">
            <h3>窗口行为</h3>
            <div className="setting-item">
              <label>
                <span>最小化到托盘</span>
              </label>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.minimizeToTray}
                    onChange={(e) => handleChange('minimizeToTray', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <p className="setting-description">
                启用后，点击最小化按钮会将窗口隐藏到系统托盘。
              </p>
            </div>

            <div className="setting-item">
              <label>
                <span>关闭到托盘</span>
              </label>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.closeToTray}
                    onChange={(e) => handleChange('closeToTray', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <p className="setting-description">
                启用后，点击关闭按钮会将窗口隐藏到系统托盘，而不是退出应用。
              </p>
            </div>
          </div>

          <div className="settings-section">
            <h3>调试设置</h3>
            <div className="setting-item">
              <label>
                <span>调试模式（打开开发者工具）</span>
              </label>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.debugMode}
                    onChange={(e) => handleChange('debugMode', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <p className="setting-description">
                启用后，将自动打开开发者工具控制台，方便查看调试日志和排查问题。
              </p>
            </div>
          </div>

          <div className="settings-section">
            <h3>数据存储设置</h3>
            <div className="setting-item">
              <label>
                <span>数据库路径</span>
              </label>
              <div className="setting-control path-control">
                <input
                  type="text"
                  value={settings.databasePath || ''}
                  onChange={(e) => handleChange('databasePath', e.target.value)}
                  placeholder="留空使用默认路径"
                  className="path-input"
                />
                <button
                  type="button"
                  className="btn-select-folder"
                  onClick={async () => {
                    const selectedPath = await window.electronAPI.selectFolder?.({
                      title: '选择数据库保存文件夹',
                      defaultPath: settings?.databasePath || undefined,
                    });
                    if (selectedPath && settings) {
                      handleChange('databasePath', selectedPath);
                    }
                  }}
                >
                  浏览...
                </button>
                <button
                  type="button"
                  className="btn-reset-path"
                  onClick={() => handleChange('databasePath', '')}
                  title="重置为默认路径"
                >
                  重置
                </button>
              </div>
              <p className="setting-description">
                自定义数据库文件保存位置。留空则使用默认路径（%APPDATA%\活动分析器\activity.db）。
                <br />
                <strong>注意：</strong>修改数据库路径后需要重启应用才能生效。
              </p>
            </div>

            <div className="setting-item">
              <label>
                <span>日志路径</span>
              </label>
              <div className="setting-control path-control">
                <input
                  type="text"
                  value={settings.logPath || ''}
                  onChange={(e) => handleChange('logPath', e.target.value)}
                  placeholder="留空使用默认路径"
                  className="path-input"
                />
                <button
                  type="button"
                  className="btn-select-folder"
                  onClick={async () => {
                    const selectedPath = await window.electronAPI.selectFolder?.({
                      title: '选择日志保存文件夹',
                      defaultPath: settings?.logPath || undefined,
                    });
                    if (selectedPath && settings) {
                      handleChange('logPath', selectedPath);
                    }
                  }}
                >
                  浏览...
                </button>
                <button
                  type="button"
                  className="btn-reset-path"
                  onClick={() => handleChange('logPath', '')}
                  title="重置为默认路径"
                >
                  重置
                </button>
              </div>
              <p className="setting-description">
                自定义日志文件保存位置。留空则使用默认路径（%APPDATA%\活动分析器\logs\）。
                <br />
                修改后立即生效，新的日志将保存到新位置。
              </p>
            </div>

            <div className="setting-item">
              <label>
                <span>报告路径</span>
              </label>
              <div className="setting-control path-control">
                <input
                  type="text"
                  value={settings.reportPath || ''}
                  onChange={(e) => handleChange('reportPath', e.target.value)}
                  placeholder="留空使用默认路径"
                  className="path-input"
                />
                <button
                  type="button"
                  className="btn-select-folder"
                  onClick={async () => {
                    const selectedPath = await window.electronAPI.selectFolder?.({
                      title: '选择报告保存文件夹',
                      defaultPath: settings?.reportPath || undefined,
                    });
                    if (selectedPath && settings) {
                      handleChange('reportPath', selectedPath);
                    }
                  }}
                >
                  浏览...
                </button>
                <button
                  type="button"
                  className="btn-reset-path"
                  onClick={() => handleChange('reportPath', '')}
                  title="重置为默认路径"
                >
                  重置
                </button>
              </div>
              <p className="setting-description">
                自定义报告文件保存位置。留空则使用默认路径（%APPDATA%\活动分析器\reports\）。
                <br />
                修改后立即生效，新的报告将保存到新位置，旧报告会自动迁移。
              </p>
            </div>
          </div>
        </div>

      <div className="settings-footer">
        {message && (
          <div className={`message ${message.includes('失败') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
        <div className="settings-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

