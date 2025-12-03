import React, { useState, useEffect } from 'react';
import './Settings.css';

interface AppSettings {
  checkInterval: number;
  autoStart: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  debugMode: boolean;
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
      const success = await window.electronAPI.updateSettings(settings);
      if (success) {
        setMessage('设置已保存');
        setTimeout(() => {
          setMessage('');
        }, 2000);
      } else {
        setMessage('保存设置失败');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('保存设置失败');
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
      <div className="settings-overlay">
        <div className="settings-modal">
          <div className="loading">加载中...</div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ 设置</h2>
          <button className="close-btn" onClick={onClose}>×</button>
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
        </div>

        <div className="settings-footer">
          {message && (
            <div className={`message ${message.includes('失败') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
          <div className="settings-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

