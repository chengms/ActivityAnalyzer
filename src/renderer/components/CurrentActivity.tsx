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
      setActivities([]);
      return;
    }

    // 定期更新最近活动信息（每1秒更新一次，保持流畅）
    const interval = setInterval(async () => {
      try {
        if (window.electronAPI.getRecentActivities) {
          const recentActivities = await window.electronAPI.getRecentActivities();
          setActivities(recentActivities);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('Error getting recent activities:', error);
      }
    }, 1000);

    // 立即获取一次
    if (window.electronAPI.getRecentActivities) {
      window.electronAPI.getRecentActivities().then(activities => {
        setActivities(activities);
        setLastUpdate(new Date());
      }).catch(err => {
        console.error('Error getting initial recent activities:', err);
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

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

  if (activities.length === 0) {
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
        <div className="recent-activities-list">
          {activities.map((activity, index) => (
            <div 
              key={`${activity.appName}-${activity.startTime.getTime()}-${index}`}
              className={`activity-card ${activity.isActive ? 'active' : ''}`}
            >
              <div className="activity-card-header">
                <span className="activity-rank">#{index + 1}</span>
                <span className="activity-status-indicator">
                  {activity.isActive ? '●' : '○'}
                </span>
                <div className="activity-names">
                  <div className="activity-app-name">{activity.appName}</div>
                  {activity.windowTitle && activity.windowTitle !== 'Unknown Window' && (
                    <div className="activity-window-title">{activity.windowTitle}</div>
                  )}
                </div>
                <div className="activity-duration">{formatDuration(activity.duration)}</div>
              </div>
              <div className="activity-card-meta">
                <span className="activity-time">
                  {activity.isActive ? '开始' : '结束'}: {formatTime(activity.isActive ? activity.startTime : (activity.endTime || activity.startTime))}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="activity-footer">
          <small>最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}</small>
        </div>
      </div>
    </div>
  );
}

