import React from 'react';
import { AppUsage } from '../../tracker/database';
import { AppUsageList } from './AppUsageList';
import './AppRankingView.css';

interface AppRankingViewProps {
  appUsage: AppUsage[];
  selectedDate: string;
  onDelete: (appName: string) => void;
  onClose: () => void;
}

export function AppRankingView({ appUsage, selectedDate, onDelete, onClose }: AppRankingViewProps) {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const totalDuration = appUsage.reduce((sum, app) => sum + app.totalDuration, 0);

  return (
    <div className="app-ranking-view">
      <div className="app-ranking-header">
        <h2>📊 应用使用排行 - {selectedDate}</h2>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>
      
      <div className="app-ranking-content">
        <div className="app-ranking-summary">
          <div className="summary-item">
            <span className="summary-label">总应用数</span>
            <span className="summary-value">{appUsage.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">总使用时长</span>
            <span className="summary-value">{formatDuration(totalDuration)}</span>
          </div>
        </div>

        <div className="app-ranking-list-container">
          <AppUsageList 
            usage={appUsage} 
            onDelete={onDelete}
            selectedDate={selectedDate}
          />
        </div>
      </div>
    </div>
  );
}

