import React from 'react';
import { AppUsage } from '../../tracker/database';
import './AppUsageList.css';

interface AppUsageListProps {
  usage: AppUsage[];
  onDelete?: (appName: string) => void;
  selectedDate: string;
}

export function AppUsageList({ usage, onDelete, selectedDate }: AppUsageListProps) {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const getMaxDuration = () => {
    if (usage.length === 0) return 1;
    return Math.max(...usage.map(u => u.totalDuration));
  };

  const maxDuration = getMaxDuration();

  if (usage.length === 0) {
    return (
      <div className="empty-usage">暂无数据</div>
    );
  }

  return (
    <div className="app-usage-list">
      {usage.map((item, index) => {
        const percentage = (item.totalDuration / maxDuration) * 100;
        return (
          <div key={item.appName} className="usage-item">
            <div className="usage-header">
              <span className="usage-rank">#{index + 1}</span>
              <span className="usage-app-name">{item.appName}</span>
              <span className="usage-duration">{formatDuration(item.totalDuration)}</span>
            </div>
            <div className="usage-bar-container">
              <div
                className="usage-bar"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="usage-meta">
              <span>使用次数: {item.usageCount}</span>
              {onDelete && (
                <button 
                  className="btn-delete-item"
                  onClick={() => onDelete(item.appName)}
                  title="删除此应用的所有记录"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

