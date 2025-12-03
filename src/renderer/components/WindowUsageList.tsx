import React from 'react';
import { WindowUsage } from '../../tracker/database';
import './WindowUsageList.css';

interface WindowUsageListProps {
  usage: WindowUsage[];
  onViewDetail?: () => void;
  onDelete?: (appName: string, windowTitle: string) => void;
  selectedDate: string;
}

export function WindowUsageList({ usage, onViewDetail, onDelete, selectedDate }: WindowUsageListProps) {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const formatTime = (timeString: string): string => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  const getMaxDuration = () => {
    if (usage.length === 0) return 1;
    return Math.max(...usage.map(u => u.totalDuration));
  };

  const maxDuration = getMaxDuration();

  if (usage.length === 0) {
    return (
      <div className="empty-window-usage">暂无数据</div>
    );
  }

  return (
    <div className="window-usage-list">
      {usage.map((item, index) => {
        const percentage = (item.totalDuration / maxDuration) * 100;
        return (
          <div key={`${item.appName}-${item.windowTitle}-${index}`} className="window-usage-item">
            <div className="window-usage-header">
              <div className="window-usage-info">
                <span className="window-usage-rank">#{index + 1}</span>
                <div className="window-usage-names">
                  <span className="window-usage-app">{item.appName}</span>
                  <span className="window-usage-title">
                    {item.windowTitle && item.windowTitle !== 'Unknown Window' 
                      ? item.windowTitle 
                      : '(无窗口标题)'}
                  </span>
                </div>
              </div>
              <span className="window-usage-duration">{formatDuration(item.totalDuration)}</span>
            </div>
            <div className="window-usage-bar-container">
              <div
                className="window-usage-bar"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="window-usage-meta">
              <span>使用次数: {item.usageCount}</span>
              <span>首次: {formatTime(item.firstSeen)}</span>
              <span>最后: {formatTime(item.lastSeen)}</span>
              {onDelete && (
                <button 
                  className="btn-delete-item"
                  onClick={() => onDelete(item.appName, item.windowTitle)}
                  title="删除此记录"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        );
      })}
      {onViewDetail && (
        <div className="window-usage-footer">
          <button className="btn-view-detail" onClick={onViewDetail}>
            查看详细时间线 →
          </button>
        </div>
      )}
    </div>
  );
}

