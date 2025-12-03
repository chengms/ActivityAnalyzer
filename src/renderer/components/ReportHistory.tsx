import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import './ReportHistory.css';

interface ReportInfo {
  date: string;
  htmlPath: string;
  excelPath: string;
  exists: boolean;
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
                  key={report.date}
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

