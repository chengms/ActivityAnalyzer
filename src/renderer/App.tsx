import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { DailySummary, AppUsage, WindowUsage } from '../tracker/database';
import { ActivityChart } from './components/ActivityChart';
import { AppUsageList } from './components/AppUsageList';
import { WindowUsageList } from './components/WindowUsageList';
import { TimelineDetail } from './components/TimelineDetail';
import { ReportViewer } from './components/ReportViewer';
import { ReportHistory } from './components/ReportHistory';
import { Settings } from './components/Settings';
import { Sidebar } from './components/Sidebar';
import './App.css';

declare global {
  interface Window {
    electronAPI: {
      getActivityData: (date: string) => Promise<any[]>;
      getAppUsage: (startDate: string, endDate: string) => Promise<AppUsage[]>;
      getDailySummary: (date: string) => Promise<DailySummary | null>;
      getWindowUsage?: (date: string) => Promise<WindowUsage[]>;
      getActivityTimeline?: (date: string) => Promise<any[]>;
      generateReport: (date: string) => Promise<{ success: boolean; path: string; htmlContent?: string; htmlPath?: string; excelPath?: string }>;
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

  useEffect(() => {
    loadData();
    
    // 监听打开设置事件
    if (window.electronAPI.onOpenSettings) {
      const removeListener = window.electronAPI.onOpenSettings(() => {
        setShowSettings(true);
      });
      return () => {
        if (removeListener) removeListener();
      };
    }
  }, [selectedDate]);

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

  const loadData = async () => {
    setLoading(true);
    try {
      const summary = await window.electronAPI.getDailySummary(selectedDate);
      setDailySummary(summary);

      // 获取窗口使用汇总
      if (window.electronAPI.getWindowUsage) {
        const windowData = await window.electronAPI.getWindowUsage(selectedDate);
        setWindowUsage(windowData);
      }

      // 获取最近7天的应用使用情况
      const endDate = selectedDate;
      const startDate = format(subDays(new Date(selectedDate), 7), 'yyyy-MM-dd');
      const usage = await window.electronAPI.getAppUsage(startDate, endDate);
      setAppUsage(usage);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setReportGenerating(true);
    try {
      const result = await window.electronAPI.generateReport(selectedDate);
      console.log('Report generation result:', result);
      
      if (result.success) {
        if (result.htmlContent) {
          // 显示报告查看器
          console.log('Showing report viewer with content length:', result.htmlContent.length);
          setReportContent(result.htmlContent);
          setReportDate(selectedDate);
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
              setReportDate(selectedDate);
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
        alert('报告生成失败');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('报告生成失败');
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
    
    const confirmed = window.confirm(`确定要删除 "${appName}" - "${windowTitle === 'Unknown Window' ? '(无窗口标题)' : windowTitle}" 的所有记录吗？`);
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
                <ActivityChart data={dailySummary.records} />
              </div>
            </div>

            <div className="content-grid">
              <div className="content-panel">
                <h2>应用使用排行</h2>
                <AppUsageList 
                  usage={appUsage.slice(0, 10)} 
                  onDelete={handleDeleteApp}
                  selectedDate={selectedDate}
                />
              </div>
              <div className="content-panel">
                <h2>窗口使用统计</h2>
                <WindowUsageList 
                  usage={windowUsage} 
                  onViewDetail={handleViewTimelineDetail}
                  onDelete={handleDeleteWindow}
                  selectedDate={selectedDate}
                />
              </div>
            </div>
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

