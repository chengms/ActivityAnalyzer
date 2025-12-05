import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSettings: () => void;
  onGenerateReport: () => void;
  onReportHistory: () => void;
  onToggleTracking: () => void;
  onAppRanking?: () => void;
  activeTab?: 'main' | 'ranking' | 'chart' | 'settings' | 'history';
  onTabChange?: (tab: 'main' | 'ranking' | 'chart' | 'settings' | 'history') => void;
  isTracking: boolean;
  reportGenerating: boolean;
  canGenerateReport: boolean;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onSettings,
  onGenerateReport,
  onReportHistory,
  onToggleTracking,
  onAppRanking,
  activeTab = 'main',
  onTabChange,
  isTracking,
  reportGenerating,
  canGenerateReport,
}: SidebarProps) {
  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed ? (
          <>
            <h2>📊 活动分析器</h2>
            <button
              className="sidebar-toggle"
              onClick={onToggleCollapse}
              title="折叠侧边栏"
            >
              ◀
            </button>
          </>
        ) : (
          <button
            className="sidebar-toggle"
            onClick={onToggleCollapse}
            title="展开侧边栏"
          >
            ▶
          </button>
        )}
      </div>
      
      {onTabChange && (
        <div className={`sidebar-tabs ${collapsed ? 'collapsed' : ''}`}>
          <button
            className={`sidebar-tab ${activeTab === 'main' ? 'active' : ''}`}
            onClick={() => onTabChange('main')}
            title="主界面"
          >
            <span className="sidebar-icon">📊</span>
            {!collapsed && <span className="sidebar-text">主界面</span>}
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'ranking' ? 'active' : ''}`}
            onClick={() => onTabChange('ranking')}
            title="应用排行"
          >
            <span className="sidebar-icon">🏆</span>
            {!collapsed && <span className="sidebar-text">应用排行</span>}
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'chart' ? 'active' : ''}`}
            onClick={() => onTabChange('chart')}
            title="应用使用时长分布"
          >
            <span className="sidebar-icon">📈</span>
            {!collapsed && <span className="sidebar-text">使用分布</span>}
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => onTabChange('history')}
            title="历史报告"
          >
            <span className="sidebar-icon">📋</span>
            {!collapsed && <span className="sidebar-text">历史报告</span>}
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => onTabChange('settings')}
            title="设置"
          >
            <span className="sidebar-icon">⚙️</span>
            {!collapsed && <span className="sidebar-text">设置</span>}
          </button>
        </div>
      )}
      
      <div className="sidebar-content">
        <div className="sidebar-section">
          {!collapsed && <div className="sidebar-section-title">操作</div>}
          <button
            className="sidebar-item"
            onClick={onToggleTracking}
            title={isTracking ? '停止记录' : '开始记录'}
          >
            <span className="sidebar-icon">
              {isTracking ? '⏸️' : '▶️'}
            </span>
            {!collapsed && (
              <span className="sidebar-text">
                {isTracking ? '停止记录' : '开始记录'}
              </span>
            )}
          </button>
          
          <button
            className="sidebar-item"
            onClick={onGenerateReport}
            disabled={reportGenerating || !canGenerateReport}
            title={reportGenerating ? '生成中...' : '生成报告'}
          >
            <span className="sidebar-icon">📄</span>
            {!collapsed && (
              <span className="sidebar-text">
                {reportGenerating ? '生成中...' : '生成报告'}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

