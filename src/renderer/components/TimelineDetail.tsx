import React, { useMemo, useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ActivityRecord } from '../../tracker/database';
import './TimelineDetail.css';

interface TimelineDetailProps {
  records: ActivityRecord[];
  onClose: () => void;
  asPage?: boolean; // 是否作为页面显示（而不是弹窗）
}

// 缓存日期格式化函数的结果
const timeCache = new Map<string, string>();
const dateTimeCache = new Map<string, string>();

const formatTimeCached = (timeString: string): string => {
  if (timeCache.has(timeString)) {
    return timeCache.get(timeString)!;
  }
  try {
    const formatted = format(parseISO(timeString), 'HH:mm:ss');
    timeCache.set(timeString, formatted);
    return formatted;
  } catch {
    return timeString;
  }
};

const formatDateTimeCached = (timeString: string): string => {
  if (dateTimeCache.has(timeString)) {
    return dateTimeCache.get(timeString)!;
  }
  try {
    const formatted = format(parseISO(timeString), 'yyyy-MM-dd HH:mm:ss');
    dateTimeCache.set(timeString, formatted);
    return formatted;
  } catch {
    return timeString;
  }
};

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

const INITIAL_DISPLAY_COUNT = 20; // 初始显示记录数（大幅减少以提高性能）
const BATCH_SIZE = 15; // 每批加载的记录数（进一步减少以提高性能）
const MAX_SORT_SIZE = 10000; // 超过此数量时使用简化排序
const MAX_DISPLAY_COUNT = 100; // 最大显示记录数（减少以提高性能）

export function TimelineDetail({ records, onClose, asPage = false }: TimelineDetailProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [displayRecords, setDisplayRecords] = useState<ActivityRecord[]>([]);
  const [switchCount, setSwitchCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  
  // 使用 useMemo 优化排序和计算，避免每次渲染都重新计算
  const processedData = useMemo(() => {
    if (records.length === 0) {
      return { sortedRecords: [], switchCount: 0 };
    }
    
    // 只显示到当前时间点的记录
    const now = new Date().getTime();
    const filteredRecords = records.filter(record => {
      const recordTime = new Date(record.startTime).getTime();
      return recordTime <= now; // 只包含当前时间点及之前的记录
    });
    
    if (filteredRecords.length === 0) {
      return { sortedRecords: [], switchCount: 0 };
    }
    
    // 对于大量数据，使用更高效的排序策略
    let sorted: ActivityRecord[];
    if (filteredRecords.length > MAX_SORT_SIZE) {
      // 大量数据时，只对时间戳进行排序，避免重复创建 Date 对象
      const recordsWithTimestamp = filteredRecords.map(r => ({
        record: r,
        startTime: new Date(r.startTime).getTime(),
        endTime: r.endTime ? new Date(r.endTime).getTime() : 0
      }));
      
      recordsWithTimestamp.sort((a, b) => {
        const diff = b.startTime - a.startTime;
        if (diff !== 0) return diff;
        return (b.endTime || 0) - (a.endTime || 0);
      });
      
      sorted = recordsWithTimestamp.map(r => r.record);
    } else {
      // 少量数据时，使用原来的排序方法
      sorted = [...filteredRecords].sort((a, b) => {
        const startTimeDiff = new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        if (startTimeDiff !== 0) {
          return startTimeDiff;
        }
        if (a.endTime && b.endTime) {
          return new Date(b.endTime).getTime() - new Date(a.endTime).getTime();
        }
        if (a.endTime) return -1;
        if (b.endTime) return 1;
        return 0;
      });
    }

    // 计算切换次数（优化：只遍历一次，不需要完整排序）
    let count = 0;
    let lastApp = '';
    // 使用 Map 存储时间戳，避免重复创建 Date 对象
    const recordsWithTime = filteredRecords.map(r => ({
      record: r,
      time: new Date(r.startTime).getTime()
    }));
    
    recordsWithTime.sort((a, b) => a.time - b.time);
    
    recordsWithTime.forEach(({ record }) => {
      if (lastApp && lastApp !== record.appName) {
        count++;
      }
      lastApp = record.appName;
    });

    return { sortedRecords: sorted, switchCount: count };
  }, [records]);

  // 使用 useEffect 异步更新显示，避免阻塞渲染
  useEffect(() => {
    if (records.length === 0) {
      setDisplayRecords([]);
      setSwitchCount(0);
      setDisplayCount(INITIAL_DISPLAY_COUNT);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    
    // 使用 setTimeout 延迟处理，确保 UI 先响应
    // 对于大量数据，分多个步骤处理
    const processData = () => {
      const sorted = processedData.sortedRecords;
      const initialRecords = sorted.slice(0, INITIAL_DISPLAY_COUNT);
      
      // 先设置统计数据（快速）
      setSwitchCount(processedData.switchCount);
      
      // 然后分批设置显示记录（避免一次性渲染太多）
      if (initialRecords.length > 0) {
        // 使用 requestIdleCallback 如果可用，否则使用 setTimeout
        const scheduleUpdate = (callback: () => void) => {
          if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(callback, { timeout: 100 });
          } else {
            setTimeout(callback, 0);
          }
        };
        
        scheduleUpdate(() => {
          setDisplayRecords(initialRecords);
          setDisplayCount(INITIAL_DISPLAY_COUNT);
          setIsProcessing(false);
        });
      } else {
        setDisplayRecords([]);
        setDisplayCount(INITIAL_DISPLAY_COUNT);
        setIsProcessing(false);
      }
    };
    
    // 延迟处理，让 UI 先响应
    setTimeout(processData, 0);
  }, [processedData]);

  // 使用 ref 存储 sortedRecords，避免依赖问题
  const sortedRecordsRef = React.useRef<ActivityRecord[]>([]);
  const displayCountRef = React.useRef(INITIAL_DISPLAY_COUNT);
  const isLoadingMoreRef = React.useRef(false);
  
  React.useEffect(() => {
    sortedRecordsRef.current = processedData.sortedRecords;
  }, [processedData.sortedRecords]);

  // 加载更多记录 - 分批加载，避免卡顿
  const loadMore = React.useCallback(() => {
    const sortedRecords = sortedRecordsRef.current;
    const currentDisplayCount = displayCountRef.current;
    
    if (isLoadingMoreRef.current || currentDisplayCount >= sortedRecords.length) {
      return;
    }
    
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    
    // 使用 requestIdleCallback 在浏览器空闲时加载，避免阻塞 UI
    const scheduleLoad = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(callback, { timeout: 300 });
      } else {
        setTimeout(callback, 150);
      }
    };
    
    scheduleLoad(() => {
      const sortedRecords = sortedRecordsRef.current;
      const newCount = Math.min(currentDisplayCount + BATCH_SIZE, sortedRecords.length);
      
      // 如果超过最大显示数量，只保留最新的记录
      let newRecords: ActivityRecord[];
      if (newCount > MAX_DISPLAY_COUNT) {
        // 只保留最新的 MAX_DISPLAY_COUNT 条记录
        newRecords = sortedRecords.slice(0, MAX_DISPLAY_COUNT);
      } else {
        newRecords = sortedRecords.slice(0, newCount);
      }
      
      // 直接更新，不使用 requestAnimationFrame，避免延迟
      setDisplayRecords(newRecords);
      displayCountRef.current = newCount;
      setDisplayCount(newCount);
      
      // 加载完成后，延迟一点再允许下次加载，避免连续点击导致卡顿
      setTimeout(() => {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }, 150);
    });
  }, []);

  // 移除自动滚动加载，只通过按钮手动加载
  // 这样可以避免卡顿，用户可以通过点击按钮控制加载时机

  const hasMore = displayCount < processedData.sortedRecords.length;

  const content = (
    <>
      <div className="timeline-detail-header">
        <h2>详细时间线</h2>
        {!asPage && <button className="btn-close" onClick={onClose}>×</button>}
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
        <div className="timeline-detail-content" ref={contentRef}>
          {isProcessing ? (
            <div className="timeline-loading">
              <div className="loading-spinner"></div>
              <div className="loading-text">正在加载数据...</div>
            </div>
          ) : displayRecords.length === 0 ? (
            <div className="empty-timeline-detail">暂无活动记录</div>
          ) : (
            <div className="timeline-detail-list">
              {displayRecords.map((record, index) => {
                // 由于是倒序显示，检查下一个记录（在时间上更早的记录）来判断是否是应用切换
                const isSwitch = index < displayRecords.length - 1 && 
                                  displayRecords[index + 1].appName !== record.appName;
                
                // 使用稳定的 key，避免重新渲染
                const recordKey = record.id ? `record-${record.id}` : `record-${index}-${record.startTime}`;
                
                return (
                  <TimelineItem
                    key={recordKey}
                    record={record}
                    isSwitch={isSwitch}
                    index={index}
                  />
                );
              })}
              {hasMore && (
                <div className="timeline-load-more">
                  {isLoadingMore ? (
                    <div className="loading-more-indicator">
                      <div className="loading-spinner-small"></div>
                      <span>正在加载更多...</span>
                    </div>
                  ) : (
                    <button 
                      className="btn-load-more" 
                      onClick={loadMore}
                      disabled={isLoadingMore}
                    >
                      加载更多 ({processedData.sortedRecords.length - displayCount} 条剩余)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
    </>
  );

  if (asPage) {
    return (
      <div className="timeline-detail-page">
        {content}
      </div>
    );
  }

  return (
    <div className="timeline-detail-overlay" onClick={onClose}>
      <div className="timeline-detail-modal" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}

// 单独的 TimelineItem 组件，使用 React.memo 优化渲染
const TimelineItem = React.memo(({ record, isSwitch, index }: { 
  record: ActivityRecord; 
  isSwitch: boolean; 
  index: number;
}) => {
  return (
    <div 
      className={`timeline-detail-item ${isSwitch ? 'switch-item' : ''}`}
    >
      {isSwitch && (
        <div className="switch-indicator">
          <span>应用切换</span>
        </div>
      )}
      <div className="timeline-detail-time">
        <div className="time-start">{formatTimeCached(record.startTime)}</div>
        {record.endTime && (
          <>
            <div className="time-arrow">→</div>
            <div className="time-end">{formatTimeCached(record.endTime)}</div>
          </>
        )}
      </div>
      <div className="timeline-detail-info">
        <div className="detail-app">{record.appName}</div>
        {record.windowTitle && record.windowTitle !== 'Unknown Window' && (
          <div className="detail-window">{record.windowTitle}</div>
        )}
        {/* 进程详细信息 - 紧凑布局 */}
        <div className="detail-meta-row">
          {(record.processId || record.architecture) && (
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
          <div className="detail-duration">{formatDuration(record.duration)}</div>
        </div>
        {record.processPath && (
          <div className="detail-process-path" title={record.processPath}>
            📁 {record.processPath.length > 50 
              ? record.processPath.substring(0, 50) + '...' 
              : record.processPath}
          </div>
        )}
        {record.commandLine && (
          <div className="detail-command-line" title={record.commandLine}>
            💻 {record.commandLine.length > 60 
              ? record.commandLine.substring(0, 60) + '...' 
              : record.commandLine}
          </div>
        )}
        {/* 标签页信息 */}
        {record.tabTitle && (
          <div className="detail-tab" title={record.tabUrl || ''}>
            🏷️ {record.tabTitle}
            {record.tabUrl && (
              <span className="tab-url" title={record.tabUrl}>
                {record.tabUrl.length > 40 
                  ? record.tabUrl.substring(0, 40) + '...' 
                  : record.tabUrl}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="timeline-detail-datetime">
        {formatDateTimeCached(record.startTime)}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时重新渲染
  // 返回 true 表示 props 相同，不需要重新渲染
  // 简化比较逻辑，提高性能
  if (prevProps.record.id !== nextProps.record.id) return false;
  if (prevProps.record.startTime !== nextProps.record.startTime) return false;
  if (prevProps.isSwitch !== nextProps.isSwitch) return false;
  // 不比较 index，因为 index 变化不应该触发重新渲染
  return true;
});

