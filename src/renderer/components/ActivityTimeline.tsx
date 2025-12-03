import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ActivityRecord } from '../../tracker/database';
import './ActivityTimeline.css';

interface ActivityTimelineProps {
  records: ActivityRecord[];
  onViewAll?: () => void;
}

export function ActivityTimeline({ records, onViewAll }: ActivityTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTime = (timeString: string): string => {
    try {
      return format(parseISO(timeString), 'HH:mm:ss');
    } catch {
      return timeString;
    }
  };

  if (records.length === 0) {
    return (
      <div className="empty-timeline">暂无活动记录</div>
    );
  }

  // 按时间排序（最新的在前）
  const sortedRecords = [...records].sort((a, b) => {
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  const displayRecords = showAll ? sortedRecords : sortedRecords.slice(0, 20);
  const hasMore = sortedRecords.length > 20;

  return (
    <div className="activity-timeline">
      {displayRecords.map((record) => (
        <div key={record.id} className="timeline-item">
          <div className="timeline-time">
            {formatTime(record.startTime)}
            {record.endTime && ` - ${formatTime(record.endTime)}`}
          </div>
          <div className="timeline-content">
            <div className="timeline-app">{record.appName}</div>
            {record.windowTitle && record.windowTitle !== 'Unknown Window' && (
              <div className="timeline-window">{record.windowTitle}</div>
            )}
            <div className="timeline-duration">{formatDuration(record.duration)}</div>
          </div>
        </div>
      ))}
      {hasMore && !showAll && (
        <div className="timeline-more">
          <button 
            className="btn-view-more" 
            onClick={() => {
              if (onViewAll) {
                onViewAll();
              } else {
                setShowAll(true);
              }
            }}
          >
            查看全部 {sortedRecords.length} 条记录 →
          </button>
        </div>
      )}
    </div>
  );
}

