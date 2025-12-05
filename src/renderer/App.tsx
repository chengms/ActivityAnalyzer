import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { DailySummary, AppUsage, WindowUsage } from '../tracker/database';
import { ActivityChart } from './components/ActivityChart';
import { AppUsageList } from './components/AppUsageList';
import { WindowUsageList } from './components/WindowUsageList';
import { TimelineDetail } from './components/TimelineDetail';
import { ReportViewer } from './components/ReportViewer';
import { ReportHistory } from './components/ReportHistory';
import { Settings } from './components/Settings';
import { Sidebar } from './components/Sidebar';
import { ReportDateRangeDialog } from './components/ReportDateRangeDialog';
import { CurrentActivity } from './components/CurrentActivity';
import './App.css';

declare global {
  interface Window {
    electronAPI: {
      getActivityData: (date: string) => Promise<any[]>;
      getAppUsage: (startDate: string, endDate: string) => Promise<AppUsage[]>;
      getDailySummary: (date: string) => Promise<DailySummary | null>;
      getWindowUsage?: (date: string) => Promise<WindowUsage[]>;
      getActivityTimeline?: (date: string) => Promise<any[]>;
      generateReport: (date: string, startDate?: string, endDate?: string) => Promise<{ success: boolean; path: string; htmlContent?: string; htmlPath?: string; excelPath?: string }>;
      getReportList?: () => Promise<Array<{ date: string; htmlPath: string; excelPath: string; exists: boolean }>>;
      readHTMLReport?: (htmlPath: string) => Promise<string | null>;
      openReportFile?: (filePath: string) => Promise<void>;
      getSettings?: () => Promise<any>;
      updateSettings?: (updates: any) => Promise<boolean>;
      getAutoStartStatus?: () => Promise<boolean>;
      onOpenSettings?: (callback: () => void) => (() => void) | undefined;
      startTracking?: () => Promise<boolean>;
      stopTracking?: () => Promise<boolean>;
      getTrackingStatus?: () => Promise<boolean>;
      getCurrentActivity?: () => Promise<{ appName: string; windowTitle: string; duration: number; startTime: Date | null } | null>;
      getRecentActivities?: () => Promise<Array<{ appName: string; windowTitle: string; duration: number; startTime: Date; endTime: Date | null; isActive: boolean }>>;
      onTrackingStatusChanged?: (callback: (isRunning: boolean) => void) => (() => void) | undefined;
      getReportList?: () => Promise<Array<{ date: string; htmlPath: string; excelPath: string; exists: boolean }>>;
      readHTMLReport?: (htmlPath: string) => Promise<string | null>;
      openReportFile?: (filePath: string) => Promise<void>;
      deleteActivityByAppWindow?: (date: string, appName: string, windowTitle: string) => Promise<number>;
      deleteActivityByApp?: (appName: string) => Promise<number>;
      deleteActivityByAppDate?: (date: string, appName: string) => Promise<number>;
      deleteUnknownActivities?: (date?: string) => Promise<number>;
    };
  }
}

function App() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [appUsage, setAppUsage] = useState<AppUsage[]>([]);
  const [windowUsage, setWindowUsage] = useState<WindowUsage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [reportGenerating, setReportGenerating] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(true);
  const [showTimelineDetail, setShowTimelineDetail] = useState<boolean>(false);
  const [timelineRecords, setTimelineRecords] = useState<any[]>([]);
  const [showReportViewer, setShowReportViewer] = useState<boolean>(false);
  const [reportContent, setReportContent] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>('');
  const [reportPaths, setReportPaths] = useState<{ htmlPath?: string; excelPath?: string }>({});
  const [showReportHistory, setShowReportHistory] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [showReportDialog, setShowReportDialog] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'main' | 'ranking'>('main');
  const lastCheckedDateRef = useRef<string>(format(new Date(), 'yyyy-MM-dd'));

  // 使用 useCallback 包装 loadData，确保在 selectedDate 变化时正确更新
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log(`[App] Loading data for date: ${selectedDate}`);
      const summary = await window.electronAPI.getDailySummary(selectedDate);
      setDailySummary(summary);

      // 获取窗口使用汇总
      if (window.electronAPI.getWindowUsage) {
        const windowData = await window.electronAPI.getWindowUsage(selectedDate);
        setWindowUsage(windowData);
      }

      // 获取当天的应用使用情况（默认只显示当天）
      const usage = await window.electronAPI.getAppUsage(selectedDate, selectedDate);
      setAppUsage(usage);
      console.log(`[App] Data loaded successfully for date: ${selectedDate}`);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // 当 selectedDate 变化时，重新加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // 监听打开设置事件
  useEffect(() => {
    if (window.electronAPI.onOpenSettings) {
      const removeListener = window.electronAPI.onOpenSettings(() => {
        setShowSettings(true);
      });
      return () => {
        if (removeListener) removeListener();
      };
    }
  }, []);

  // 自动检测日期变化，新一天时自动跳转到当前日期
  useEffect(() => {
    const checkDateChange = () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const lastChecked = lastCheckedDateRef.current;
      
      // 如果日期变化了，且当前查看的日期是过去的日期，则自动切换到今天
      if (today !== lastChecked) {
        setSelectedDate((currentDate) => {
          if (currentDate < today) {
            console.log(`日期已变化：${lastChecked} -> ${today}，自动切换到今天`);
            lastCheckedDateRef.current = today;
            return today;
          }
          // 日期变化了，但用户正在查看未来日期或今天，只更新检查日期
          lastCheckedDateRef.current = today;
          return currentDate;
        });
      }
    };

    // 立即检查一次
    checkDateChange();

    // 每分钟检查一次日期变化（确保在午夜后能及时响应）
    const intervalId = setInterval(checkDateChange, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // 初始化追踪状态
  useEffect(() => {
    const initTrackingStatus = async () => {
      if (window.electronAPI.getTrackingStatus) {
        const status = await window.electronAPI.getTrackingStatus();
        setIsTracking(status);
      }
    };
    initTrackingStatus();

    // 监听追踪状态变化
    if (window.electronAPI.onTrackingStatusChanged) {
      const removeListener = window.electronAPI.onTrackingStatusChanged((isRunning: boolean) => {
        setIsTracking(isRunning);
      });
      return () => {
        if (removeListener) removeListener();
      };
    }
  }, []);

  const handleGenerateReport = () => {
    // 显示时间段选择对话框
    setShowReportDialog(true);
  };

  const handleConfirmReport = async (startDateTime: string, endDateTime: string) => {
    // 先关闭对话框，立即响应用户操作
    setShowReportDialog(false);
    // 然后开始生成报告（异步，不阻塞UI）
    setReportGenerating(true);
    try {
      // 提取日期部分用于显示
      const startDate = startDateTime.split('T')[0];
      const endDate = endDateTime.split('T')[0];
      
      // 检查是否是完整的一天（00:00:00 到 23:59:59）
      const isFullDay = startDate === endDate && 
                        startDateTime.endsWith('T00:00:00') && 
                        endDateTime.endsWith('T23:59:59');
      
      // 如果是完整的一天，传递日期参数（单日报告）
      // 否则传递完整的时间段参数（包含时分秒），即使日期相同
      const result = isFullDay
        ? await window.electronAPI.generateReport(startDate)
        : await window.electronAPI.generateReport(selectedDate, startDateTime, endDateTime);
      console.log('Report generation result:', result);
      
      if (result.success) {
        // 格式化日期时间显示（在两个代码路径中都使用）
        const formatDateTime = (dt: string) => {
          const [date, time] = dt.split('T');
          return `${date} ${time}`;
        };
        
        // 格式化报告日期显示
        // 如果是完整的一天（00:00:00 到 23:59:59），只显示日期
        // 否则显示完整的时间范围（即使日期相同，只要时间不同）
        let reportDateStr: string;
        if (isFullDay) {
          // 完整的一天，只显示日期
          reportDateStr = startDate;
        } else if (startDate === endDate) {
          // 同一天但时间不同，显示时间范围
          reportDateStr = `${formatDateTime(startDateTime)} 至 ${formatDateTime(endDateTime)}`;
        } else {
          // 不同日期，显示完整的时间范围
          reportDateStr = `${formatDateTime(startDateTime)} 至 ${formatDateTime(endDateTime)}`;
        }
        
        if (result.htmlContent) {
          // 显示报告查看器
          console.log('Showing report viewer with content length:', result.htmlContent.length);
          setReportContent(result.htmlContent);
          setReportDate(reportDateStr);
          setReportPaths({
            htmlPath: result.htmlPath,
            excelPath: result.excelPath,
          });
          setShowReportViewer(true);
        } else {
          // 如果没有htmlContent，尝试从文件读取
          if (result.htmlPath && window.electronAPI.readHTMLReport) {
            const content = await window.electronAPI.readHTMLReport(result.htmlPath);
            if (content) {
              setReportContent(content);
              // 使用相同的格式化逻辑，确保两种代码路径显示一致
              setReportDate(reportDateStr);
              setReportPaths({
                htmlPath: result.htmlPath,
                excelPath: result.excelPath,
              });
              setShowReportViewer(true);
            } else {
              alert(`报告生成成功！\n路径: ${result.path}`);
            }
          } else {
            alert(`报告生成成功！\n路径: ${result.path}`);
          }
        }
      } else {
        const errorMsg = result.error || '未知错误';
        alert(`报告生成失败\n\n${errorMsg}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`报告生成失败\n\n${errorMsg}`);
    } finally {
      setReportGenerating(false);
    }
  };

  const handleViewReport = (htmlPath: string, date: string, excelPath: string) => {
    if (window.electronAPI.readHTMLReport) {
      window.electronAPI.readHTMLReport(htmlPath).then((content) => {
        if (content) {
          setReportContent(content);
          setReportDate(date);
          setReportPaths({ htmlPath, excelPath });
          setShowReportViewer(true);
          setShowReportHistory(false);
        }
      });
    }
  };

  const handleToggleTracking = async () => {
    try {
      if (isTracking) {
        if (window.electronAPI.stopTracking) {
          await window.electronAPI.stopTracking();
          setIsTracking(false);
        }
      } else {
        if (window.electronAPI.startTracking) {
          await window.electronAPI.startTracking();
          setIsTracking(true);
        }
      }
    } catch (error) {
      console.error('Error toggling tracking:', error);
    }
  };

  const handleViewTimelineDetail = async () => {
    if (window.electronAPI.getActivityTimeline) {
      try {
        const records = await window.electronAPI.getActivityTimeline(selectedDate);
        setTimelineRecords(records);
        setShowTimelineDetail(true);
      } catch (error) {
        console.error('Error loading timeline:', error);
      }
    }
  };

  const handleDeleteWindow = async (appName: string, windowTitle: string) => {
    if (!window.electronAPI.deleteActivityByAppWindow) return;
    
    const confirmed = window.confirm(`确定要删除 "${appName}" - "${windowTitle === 'Unknown Window' ? '(无窗口标题)' : windowTitle}" 在 ${selectedDate} 的所有记录吗？`);
    if (!confirmed) return;

    try {
      const deleted = await window.electronAPI.deleteActivityByAppWindow(selectedDate, appName, windowTitle);
      if (deleted > 0) {
        alert(`已删除 ${deleted} 条记录`);
        loadData(); // 重新加载数据
      } else {
        alert('没有找到要删除的记录');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('删除失败');
    }
  };

  const handleDeleteApp = async (appName: string) => {
    if (!window.electronAPI.deleteActivityByAppDate) return;
    
    const confirmed = window.confirm(`确定要删除 "${appName}" 在 ${selectedDate} 的所有记录吗？`);
    if (!confirmed) return;

    try {
      const deleted = await window.electronAPI.deleteActivityByAppDate(selectedDate, appName);
      if (deleted > 0) {
        alert(`已删除 ${deleted} 条记录`);
        loadData(); // 重新加载数据
      } else {
        alert('没有找到要删除的记录');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('删除失败');
    }
  };


  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  return (
    <div className="app">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSettings={() => setShowSettings(true)}
        onGenerateReport={handleGenerateReport}
        onReportHistory={() => setShowReportHistory(true)}
        onToggleTracking={handleToggleTracking}
        onAppRanking={() => setActiveTab('ranking')}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isTracking={isTracking}
        reportGenerating={reportGenerating}
        canGenerateReport={!!dailySummary}
      />
      
      <div className={`app-main-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="app-header">
          <div className="header-left">
            <div className="tracking-status">
              <span className={`status-indicator ${isTracking ? 'active' : 'inactive'}`}>
                {isTracking ? '●' : '○'}
              </span>
              <span className="status-text">
                {isTracking ? '正在记录' : '已停止'}
              </span>
            </div>
          </div>
          <div className="header-right">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-picker"
            />
          </div>
        </header>

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}

      {showTimelineDetail && (
        <TimelineDetail 
          records={timelineRecords} 
          onClose={() => setShowTimelineDetail(false)} 
        />
      )}

      {showReportViewer && (
        <ReportViewer
          htmlContent={reportContent}
          date={reportDate}
          htmlPath={reportPaths.htmlPath}
          excelPath={reportPaths.excelPath}
          onClose={() => setShowReportViewer(false)}
        />
      )}

      {showReportHistory && (
        <ReportHistory
          onSelectReport={handleViewReport}
          onClose={() => setShowReportHistory(false)}
        />
      )}

      {showReportDialog && (
        <ReportDateRangeDialog
          defaultDate={selectedDate}
          onConfirm={handleConfirmReport}
          onCancel={() => setShowReportDialog(false)}
        />
      )}


        <main className="app-main">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : dailySummary ? (
          <>
            <div className="summary-cards">
              <div className="summary-card">
                <div className="card-icon">⏱️</div>
                <div className="card-content">
                  <div className="card-label">总使用时长</div>
                  <div className="card-value">{formatDuration(dailySummary.totalDuration)}</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="card-icon">📱</div>
                <div className="card-content">
                  <div className="card-label">使用应用数</div>
                  <div className="card-value">{dailySummary.appCount}</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="card-icon">📝</div>
                <div className="card-content">
                  <div className="card-label">活动记录数</div>
                  <div className="card-value">{dailySummary.records.length}</div>
                </div>
              </div>
            </div>

            <div className="charts-section">
              <div className="chart-container">
                <h2>应用使用时长分布</h2>
                <ActivityChart key={selectedDate} data={dailySummary.records} />
              </div>
            </div>

            {activeTab === 'main' ? (
              <div className="content-grid">
                <div className="content-panel">
                  <h2>窗口使用统计</h2>
                  <WindowUsageList 
                    usage={windowUsage.slice(0, 10)} 
                    onViewDetail={windowUsage.length > 10 ? handleViewTimelineDetail : undefined}
                    onDelete={handleDeleteWindow}
                    selectedDate={selectedDate}
                  />
                </div>
                <div className="content-panel">
                  <h2>实时检测</h2>
                  <CurrentActivity isTracking={isTracking} />
                </div>
              </div>
            ) : (
              <div className="app-ranking-tab-content">
                <div className="content-panel">
                  <div className="panel-header">
                    <h2>应用使用排行 - {selectedDate}</h2>
                    <div className="ranking-summary">
                      <span>总应用数: {appUsage.length}</span>
                      <span>总时长: {formatDuration(appUsage.reduce((sum, app) => sum + app.totalDuration, 0))}</span>
                    </div>
                  </div>
                  <AppUsageList 
                    usage={appUsage} 
                    onDelete={handleDeleteApp}
                    selectedDate={selectedDate}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h2>暂无数据</h2>
            <p>选择日期没有活动记录</p>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}

export default App;

