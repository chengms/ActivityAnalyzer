import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import './ReportHistory.css';

interface ReportInfo {
  date: string;
  htmlPath: string;
  excelPath: string;
  exists: boolean;
  fileKey?: string; // 用于 React key，确保唯一性
}

interface ReportHistoryProps {
  onSelectReport: (htmlPath: string, date: string, excelPath: string) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    electronAPI: {
      getReportList?: () => Promise<ReportInfo[]>;
      readHTMLReport?: (htmlPath: string) => Promise<string | null>;
    };
  }
}

export function ReportHistory({ onSelectReport, onClose }: ReportHistoryProps) {
  const [reports, setReports] = useState<ReportInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      if (window.electronAPI.getReportList) {
        const reportList = await window.electronAPI.getReportList();
        setReports(reportList);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReport = async (report: ReportInfo) => {
    if (window.electronAPI.readHTMLReport && report.htmlPath) {
      const htmlContent = await window.electronAPI.readHTMLReport(report.htmlPath);
      if (htmlContent) {
        onSelectReport(report.htmlPath, report.date, report.excelPath);
      }
    }
  };

  const formatDate = (dateString: string): string => {
    // 检查是否包含时间范围信息（时间段报告）
    if (dateString.includes(' 至 ') || (dateString.includes('-') && dateString.match(/\d{2}:\d{2}:\d{2}/))) {
      // 时间段报告，直接返回（已经格式化好了）
      // 格式可能是：YYYY-MM-DD HH:MM:SS-HH:MM:SS 或 YYYY-MM-DD HH:MM:SS 至 YYYY-MM-DD HH:MM:SS
      // 转换为中文格式显示
      try {
        // 尝试解析并格式化
        if (dateString.includes(' 至 ')) {
          // 不同日期的时间段
          const [startPart, endPart] = dateString.split(' 至 ');
          const [startDate, startTime] = startPart.split(' ');
          const [endDate, endTime] = endPart.split(' ');
          if (startDate && startTime && endDate && endTime) {
            const start = parseISO(`${startDate}T${startTime}`);
            const end = parseISO(`${endDate}T${endTime}`);
            return `${format(start, 'yyyy年MM月dd日 HH:mm:ss')} 至 ${format(end, 'yyyy年MM月dd日 HH:mm:ss')}`;
          }
        } else if (dateString.includes('-') && dateString.match(/\d{2}:\d{2}:\d{2}/)) {
          // 同一天的时间段
          const [datePart, timePart] = dateString.split(' ');
          if (datePart && timePart) {
            const [startTime, endTime] = timePart.split('-');
            if (startTime && endTime) {
              const date = parseISO(`${datePart}T${startTime}`);
              return `${format(date, 'yyyy年MM月dd日')} ${startTime}-${endTime}`;
            }
          }
        }
        return dateString; // 如果解析失败，返回原始字符串
      } catch {
        return dateString;
      }
    }
    
    // 单日报告，只显示日期
    try {
      const date = parseISO(dateString);
      return format(date, 'yyyy年MM月dd日');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="report-history-overlay" onClick={onClose}>
      <div className="report-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-history-header">
          <h2>📋 历史报告</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="report-history-content">
          {loading ? (
            <div className="report-history-loading">加载中...</div>
          ) : reports.length === 0 ? (
            <div className="report-history-empty">暂无历史报告</div>
          ) : (
            <div className="report-history-list">
              {reports.map((report) => (
                <div
                  key={report.fileKey || report.htmlPath || report.date}
                  className="report-history-item"
                  onClick={() => handleSelectReport(report)}
                >
                  <div className="report-item-icon">📄</div>
                  <div className="report-item-info">
                    <div className="report-item-date">{formatDate(report.date)}</div>
                    <div className="report-item-files">
                      {report.htmlPath && <span className="file-badge">HTML</span>}
                      {report.excelPath && <span className="file-badge">Excel</span>}
                    </div>
                  </div>
                  <div className="report-item-arrow">→</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

