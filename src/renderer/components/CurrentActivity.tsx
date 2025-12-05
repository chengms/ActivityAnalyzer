import React, { useState, useEffect } from 'react';
import './CurrentActivity.css';

interface ActivityInfo {
  appName: string;
  windowTitle: string;
  duration: number;
  startTime: Date;
  endTime: Date | null;
  isActive: boolean;
}

interface CurrentActivityProps {
  isTracking: boolean;
}

export function CurrentActivity({ isTracking }: CurrentActivityProps) {
  const [activities, setActivities] = useState<ActivityInfo[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!isTracking) {
      setCurrentApp('');
      setCurrentWindow('');
      setCurrentDuration(0);
      return;
    }

    // 定期更新当前活动信息（每2秒更新一次）
    const interval = setInterval(async () => {
      try {
        if (window.electronAPI.getCurrentActivity) {
          const info = await window.electronAPI.getCurrentActivity();
          if (info) {
            setCurrentApp(info.appName);
            setCurrentWindow(info.windowTitle);
            setCurrentDuration(info.duration);
            setLastUpdate(new Date());
          } else {
            // 如果没有活动信息，清空显示
            setCurrentApp('');
            setCurrentWindow('');
            setCurrentDuration(0);
          }
        }
      } catch (error) {
        console.error('Error getting current activity:', error);
      }
    }, 2000);

    // 立即获取一次
    if (window.electronAPI.getCurrentActivity) {
      window.electronAPI.getCurrentActivity().then(info => {
        if (info) {
          setCurrentApp(info.appName);
          setCurrentWindow(info.windowTitle);
          setCurrentDuration(info.duration);
          setLastUpdate(new Date());
        }
      }).catch(err => {
        console.error('Error getting initial current activity:', err);
      });
    }

    return () => clearInterval(interval);
  }, [isTracking]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isTracking) {
    return (
      <div className="current-activity">
        <div className="current-activity-header">
          <h3>🔴 实时检测</h3>
          <span className="status-badge inactive">已停止</span>
        </div>
        <div className="current-activity-content">
          <p className="no-activity">追踪已停止，请点击"开始记录"以启用实时检测</p>
        </div>
      </div>
    );
  }

  if (!currentApp) {
    return (
      <div className="current-activity">
        <div className="current-activity-header">
          <h3>🟢 实时检测</h3>
          <span className="status-badge active">运行中</span>
        </div>
        <div className="current-activity-content">
          <p className="no-activity">正在检测活动...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="current-activity">
      <div className="current-activity-header">
        <h3>🟢 实时检测</h3>
        <span className="status-badge active">运行中</span>
      </div>
      <div className="current-activity-content">
        <div className="activity-item">
          <div className="activity-label">当前应用</div>
          <div className="activity-value">{currentApp}</div>
        </div>
        {currentWindow && currentWindow !== 'Unknown Window' && (
          <div className="activity-item">
            <div className="activity-label">窗口标题</div>
            <div className="activity-value window-title">{currentWindow}</div>
          </div>
        )}
        <div className="activity-item">
          <div className="activity-label">持续时长</div>
          <div className="activity-value duration">{formatDuration(currentDuration)}</div>
        </div>
        <div className="activity-footer">
          <small>最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}</small>
        </div>
      </div>
    </div>
  );
}

