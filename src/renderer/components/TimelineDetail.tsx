import React from 'react';
import { format, parseISO } from 'date-fns';
import { ActivityRecord } from '../../tracker/database';
import './TimelineDetail.css';

interface TimelineDetailProps {
  records: ActivityRecord[];
  onClose: () => void;
}

export function TimelineDetail({ records, onClose }: TimelineDetailProps) {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}小时${minutes}分钟${secs > 0 ? `${secs}秒` : ''}`;
    }
    if (minutes > 0) {
      return `${minutes}分钟${secs > 0 ? `${secs}秒` : ''}`;
    }
    return `${secs}秒`;
  };

  const formatTime = (timeString: string): string => {
    try {
      return format(parseISO(timeString), 'HH:mm:ss');
    } catch {
      return timeString;
    }
  };

  const formatDateTime = (timeString: string): string => {
    try {
      return format(parseISO(timeString), 'yyyy-MM-dd HH:mm:ss');
    } catch {
      return timeString;
    }
  };

  // 按时间排序（最早的在前）
  const sortedRecords = [...records].sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  // 计算切换次数
  let switchCount = 0;
  let lastApp = '';
  sortedRecords.forEach(record => {
    if (lastApp && lastApp !== record.appName) {
      switchCount++;
    }
    lastApp = record.appName;
  });

  return (
    <div className="timeline-detail-overlay" onClick={onClose}>
      <div className="timeline-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="timeline-detail-header">
          <h2>详细时间线</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="timeline-detail-stats">
          <div className="stat-item">
            <span className="stat-label">总记录数:</span>
            <span className="stat-value">{records.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">应用切换:</span>
            <span className="stat-value">{switchCount} 次</span>
          </div>
        </div>
        <div className="timeline-detail-content">
          {sortedRecords.length === 0 ? (
            <div className="empty-timeline-detail">暂无活动记录</div>
          ) : (
            <div className="timeline-detail-list">
              {sortedRecords.map((record, index) => {
                const isSwitch = index > 0 && sortedRecords[index - 1].appName !== record.appName;
                return (
                  <div 
                    key={record.id || index} 
                    className={`timeline-detail-item ${isSwitch ? 'switch-item' : ''}`}
                  >
                    {isSwitch && (
                      <div className="switch-indicator">
                        <span>应用切换</span>
                      </div>
                    )}
                    <div className="timeline-detail-time">
                      <div className="time-start">{formatTime(record.startTime)}</div>
                      {record.endTime && (
                        <>
                          <div className="time-arrow">→</div>
                          <div className="time-end">{formatTime(record.endTime)}</div>
                        </>
                      )}
                    </div>
                    <div className="timeline-detail-info">
                      <div className="detail-app">{record.appName}</div>
                      {record.windowTitle && record.windowTitle !== 'Unknown Window' && (
                        <div className="detail-window">{record.windowTitle}</div>
                      )}
                      {/* 进程详细信息 */}
                      {(record.processId || record.architecture || record.processPath) && (
                        <div className="detail-process-info">
                          {record.processId && (
                            <span className="process-badge">PID: {record.processId}</span>
                          )}
                          {record.architecture && (
                            <span className="process-badge">{record.architecture}</span>
                          )}
                          {record.processName && record.processName !== record.appName && (
                            <span className="process-badge" title={record.processPath}>
                              {record.processName}
                            </span>
                          )}
                        </div>
                      )}
                      {record.processPath && (
                        <div className="detail-process-path" title={record.processPath}>
                          📁 {record.processPath.length > 60 
                            ? record.processPath.substring(0, 60) + '...' 
                            : record.processPath}
                        </div>
                      )}
                      {record.commandLine && (
                        <div className="detail-command-line" title={record.commandLine}>
                          💻 {record.commandLine.length > 80 
                            ? record.commandLine.substring(0, 80) + '...' 
                            : record.commandLine}
                        </div>
                      )}
                      <div className="detail-duration">{formatDuration(record.duration)}</div>
                    </div>
                    <div className="timeline-detail-datetime">
                      {formatDateTime(record.startTime)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

