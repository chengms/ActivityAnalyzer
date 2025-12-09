import React, { useMemo, useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ActivityRecord } from '../../tracker/database';
import './TimelineDetail.css';

interface TimelineDetailProps {
  records: ActivityRecord[];
  onClose: () => void;
  asPage?: boolean; // 是否作为页面显示（而不是弹窗）
  filterAppName?: string | null; // 筛选的应用名称（可选）
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

export function TimelineDetail({ records, onClose, asPage = false, filterAppName }: TimelineDetailProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [displayRecords, setDisplayRecords] = useState<ActivityRecord[]>([]);
  const [switchCount, setSwitchCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  
  // 排序选项：'desc' 倒序（默认，从最新到最旧），'asc' 正序（从最旧到最新）
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // 时间段选择
  const [useTimeRange, setUseTimeRange] = useState(false);
  const [startDateTime, setStartDateTime] = useState<string>('');
  const [endDateTime, setEndDateTime] = useState<string>('');
  
  // 搜索和筛选
  const [searchText, setSearchText] = useState<string>('');
  const [filteredAppName, setFilteredAppName] = useState<string | null>(filterAppName || null);
  
  // 当 filterAppName prop 变化时，更新内部状态
  React.useEffect(() => {
    if (filterAppName !== undefined) {
      setFilteredAppName(filterAppName);
    }
  }, [filterAppName]);
  
  // 初始化：默认设置为今天的时间范围（从00:00:00到当前时间）
  React.useEffect(() => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const currentTime = format(now, 'HH:mm:ss');
    setStartDateTime(`${today}T00:00:00`);
    setEndDateTime(`${today}T${currentTime}`);
  }, []);
  
  // 当切换到正序时，自动设置时间段为当天最早记录时间到当前时间
  React.useEffect(() => {
    if (sortOrder === 'asc' && records.length > 0) {
      // 找到当天最早的记录时间
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const todayStart = new Date(`${today}T00:00:00`).getTime();
      const todayEnd = now.getTime();
      
      // 过滤出当天的记录（只包含到当前时间点的记录）
      const todayRecords = records.filter(record => {
        const recordTime = new Date(record.startTime).getTime();
        return recordTime >= todayStart && recordTime <= todayEnd;
      });
      
      if (todayRecords.length > 0) {
        // 找到最早的记录时间
        const earliestRecord = todayRecords.reduce((earliest, record) => {
          const recordTime = new Date(record.startTime).getTime();
          const earliestTime = new Date(earliest.startTime).getTime();
          return recordTime < earliestTime ? record : earliest;
        });
        
        // 设置开始时间为最早记录时间，结束时间为当前时间
        const earliestDate = parseISO(earliestRecord.startTime);
        const earliestDateTime = format(earliestDate, 'yyyy-MM-dd') + 'T' + format(earliestDate, 'HH:mm');
        const currentDateTime = format(now, 'yyyy-MM-dd') + 'T' + format(now, 'HH:mm');
        
        setStartDateTime(earliestDateTime);
        setEndDateTime(currentDateTime);
        setUseTimeRange(true); // 自动启用时间段选择
      } else {
        // 如果没有当天的记录，使用默认时间范围
        const currentDateTime = format(now, 'yyyy-MM-dd') + 'T' + format(now, 'HH:mm');
        setStartDateTime(`${today}T00:00`);
        setEndDateTime(currentDateTime);
        setUseTimeRange(true);
      }
    } else if (sortOrder === 'desc') {
      // 切换到倒序时，可以选择是否禁用时间段选择
      // 这里保持用户的选择，不自动禁用
    }
  }, [sortOrder, records]);
  
  // 使用 useMemo 优化排序和计算，避免每次渲染都重新计算
  const processedData = useMemo(() => {
    if (records.length === 0) {
      return { sortedRecords: [], switchCount: 0 };
    }
    
    let filteredRecords = records;
    
    // 应用名称筛选
    if (filteredAppName) {
      filteredRecords = filteredRecords.filter(record => record.appName === filteredAppName);
    }
    
    // 搜索过滤（搜索应用名称、窗口标题、进程路径、命令行等）
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filteredRecords = filteredRecords.filter(record => {
        return (
          record.appName.toLowerCase().includes(searchLower) ||
          (record.windowTitle && record.windowTitle.toLowerCase().includes(searchLower)) ||
          (record.processPath && record.processPath.toLowerCase().includes(searchLower)) ||
          (record.processName && record.processName.toLowerCase().includes(searchLower)) ||
          (record.commandLine && record.commandLine.toLowerCase().includes(searchLower)) ||
          (record.tabTitle && record.tabTitle.toLowerCase().includes(searchLower)) ||
          (record.tabUrl && record.tabUrl.toLowerCase().includes(searchLower))
        );
      });
    }
    
    // 时间段过滤（在应用名称筛选和搜索过滤之后）
    if (useTimeRange && startDateTime && endDateTime) {
      try {
        const startTime = new Date(startDateTime).getTime();
        const endTime = new Date(endDateTime).getTime();
        
        filteredRecords = filteredRecords.filter(record => {
          const recordTime = new Date(record.startTime).getTime();
          return recordTime >= startTime && recordTime <= endTime;
        });
      } catch (error) {
        console.error('Error filtering by time range:', error);
      }
    } else {
      // 如果没有选择时间段，只显示到当前时间点的记录
      const now = new Date().getTime();
      filteredRecords = filteredRecords.filter(record => {
        const recordTime = new Date(record.startTime).getTime();
        return recordTime <= now; // 只包含当前时间点及之前的记录
      });
    }
    
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
        const diff = sortOrder === 'desc' 
          ? b.startTime - a.startTime  // 倒序：从新到旧
          : a.startTime - b.startTime; // 正序：从旧到新
        if (diff !== 0) return diff;
        return sortOrder === 'desc'
          ? (b.endTime || 0) - (a.endTime || 0)
          : (a.endTime || 0) - (b.endTime || 0);
      });
      
      sorted = recordsWithTimestamp.map(r => r.record);
    } else {
      // 少量数据时，使用原来的排序方法
      sorted = [...filteredRecords].sort((a, b) => {
        const startTimeDiff = sortOrder === 'desc'
          ? new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          : new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        if (startTimeDiff !== 0) {
          return startTimeDiff;
        }
        if (a.endTime && b.endTime) {
          return sortOrder === 'desc'
            ? new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
            : new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
        }
        if (a.endTime) return sortOrder === 'desc' ? -1 : 1;
        if (b.endTime) return sortOrder === 'desc' ? 1 : -1;
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
  }, [records, sortOrder, useTimeRange, startDateTime, endDateTime, filteredAppName, searchText]);

  // 使用 useEffect 异步更新显示，避免阻塞渲染
  useEffect(() => {
    if (records.length === 0) {
      setDisplayRecords([]);
      setSwitchCount(0);
      setDisplayCount(INITIAL_DISPLAY_COUNT);
      displayCountRef.current = INITIAL_DISPLAY_COUNT; // 同步更新 ref
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
          displayCountRef.current = INITIAL_DISPLAY_COUNT; // 同步更新 ref
          setIsProcessing(false);
        });
      } else {
        setDisplayRecords([]);
        setDisplayCount(INITIAL_DISPLAY_COUNT);
        displayCountRef.current = INITIAL_DISPLAY_COUNT; // 同步更新 ref
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
    // 当 processedData 变化时（比如切换排序），重置 displayCountRef
    // 但只在 displayCount 被重置时同步更新 ref
    if (displayCount === INITIAL_DISPLAY_COUNT) {
      displayCountRef.current = INITIAL_DISPLAY_COUNT;
    }
  }, [processedData.sortedRecords, displayCount]);

  // 加载更多记录 - 分批加载，避免卡顿
  const loadMore = React.useCallback(() => {
    // 使用最新的 displayCount 状态，确保与当前显示同步
    const sortedRecords = sortedRecordsRef.current;
    const currentDisplayCount = displayCount; // 使用状态而不是 ref
    
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
      // 再次获取最新的值，确保使用最新的状态
      const sortedRecords = sortedRecordsRef.current;
      // 使用传入的 currentDisplayCount，确保一致性
      const currentCount = currentDisplayCount;
      
      // 如果已经达到最大显示数量，不再加载更多
      if (currentCount >= MAX_DISPLAY_COUNT) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
        return;
      }
      
      const newCount = Math.min(currentCount + BATCH_SIZE, sortedRecords.length, MAX_DISPLAY_COUNT);
      const newRecords = sortedRecords.slice(0, newCount);
      
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
  }, [displayCount]);

  // 移除自动滚动加载，只通过按钮手动加载
  // 这样可以避免卡顿，用户可以通过点击按钮控制加载时机

  const hasMore = displayCount < processedData.sortedRecords.length && displayCount < MAX_DISPLAY_COUNT;

  const content = (
    <>
      <div className="timeline-detail-header">
        <h2>详细时间线</h2>
        {!asPage && <button className="btn-close" onClick={onClose}>×</button>}
      </div>
      
      {/* 控制面板：排序和时间段选择 */}
      <div className="timeline-detail-controls">
        <div className="control-group">
          <label className="control-label">排序方式：</label>
          <div className="sort-buttons">
            <button
              className={`sort-btn ${sortOrder === 'desc' ? 'active' : ''}`}
              onClick={() => setSortOrder('desc')}
            >
              倒序（最新在前）
            </button>
            <button
              className={`sort-btn ${sortOrder === 'asc' ? 'active' : ''}`}
              onClick={() => setSortOrder('asc')}
            >
              正序（最早在前）
            </button>
          </div>
        </div>
        
        {/* 搜索和筛选 */}
        <div className="control-group">
          <label className="control-label">搜索：</label>
          <input
            type="text"
            className="search-input"
            placeholder="搜索应用、窗口、进程路径等..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              width: '250px'
            }}
          />
        </div>
        
        <div className="control-group">
          <label className="control-label">筛选应用：</label>
          <select
            className="filter-select"
            value={filteredAppName || ''}
            onChange={(e) => setFilteredAppName(e.target.value || null)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '150px'
            }}
          >
            <option value="">全部应用</option>
            {Array.from(new Set(records.map(r => r.appName))).sort().map(appName => (
              <option key={appName} value={appName}>{appName}</option>
            ))}
          </select>
          {filteredAppName && (
            <button
              onClick={() => setFilteredAppName(null)}
              style={{
                marginLeft: '8px',
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                background: '#f5f5f5',
                cursor: 'pointer'
              }}
            >
              清除筛选
            </button>
          )}
        </div>
        
        <div className="control-group">
          <label className="control-label">
            <input
              type="checkbox"
              checked={useTimeRange}
              onChange={(e) => setUseTimeRange(e.target.checked)}
            />
            指定时间段
          </label>
          {useTimeRange && (
            <div className="time-range-inputs">
              <div className="time-range-item">
                <label>开始时间：</label>
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  onClick={(e) => {
                    if (e.currentTarget.showPicker) {
                      e.currentTarget.showPicker();
                    }
                  }}
                  onFocus={(e) => {
                    if (e.currentTarget.showPicker) {
                      e.currentTarget.showPicker();
                    }
                  }}
                  className="datetime-input"
                />
              </div>
              <div className="time-range-item">
                <label>结束时间：</label>
                <input
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  onClick={(e) => {
                    if (e.currentTarget.showPicker) {
                      e.currentTarget.showPicker();
                    }
                  }}
                  onFocus={(e) => {
                    if (e.currentTarget.showPicker) {
                      e.currentTarget.showPicker();
                    }
                  }}
                  className="datetime-input"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
        <div className="timeline-detail-stats">
          <div className="stat-item">
            <span className="stat-label">总记录数:</span>
            <span className="stat-value">{processedData.sortedRecords.length}</span>
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
                  ) : displayCount >= MAX_DISPLAY_COUNT ? (
                    <div className="timeline-max-display-message">
                      已显示 {MAX_DISPLAY_COUNT} 条记录（共 {processedData.sortedRecords.length} 条）
                      <br />
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        为保持性能，最多同时显示 {MAX_DISPLAY_COUNT} 条记录
                      </span>
                    </div>
                  ) : (
                    <button 
                      className="btn-load-more" 
                      onClick={loadMore}
                      disabled={isLoadingMore}
                    >
                      加载更多 ({Math.min(processedData.sortedRecords.length - displayCount, MAX_DISPLAY_COUNT - displayCount)} 条剩余)
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
  // 返回 false 表示 props 不同，需要重新渲染
  
  // 比较记录 ID（最重要）
  if (prevProps.record.id !== nextProps.record.id) return false;
  
  // 比较关键字段，确保数据正确显示
  if (prevProps.record.commandLine !== nextProps.record.commandLine) return false;
  if (prevProps.record.windowTitle !== nextProps.record.windowTitle) return false;
  if (prevProps.record.processPath !== nextProps.record.processPath) return false;
  if (prevProps.record.appName !== nextProps.record.appName) return false;
  if (prevProps.record.startTime !== nextProps.record.startTime) return false;
  if (prevProps.record.endTime !== nextProps.record.endTime) return false;
  if (prevProps.record.duration !== nextProps.record.duration) return false;
  if (prevProps.isSwitch !== nextProps.isSwitch) return false;
  
  // 所有关键字段都相同，不需要重新渲染
  return true;
});

