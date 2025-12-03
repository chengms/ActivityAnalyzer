import React from 'react';
import './ReportViewer.css';

interface ReportViewerProps {
  htmlContent: string;
  date: string;
  htmlPath?: string;
  excelPath?: string;
  onClose: () => void;
}

declare global {
  interface Window {
    electronAPI?: {
      openReportFile?: (filePath: string) => Promise<void>;
    };
  }
}

export function ReportViewer({ htmlContent, date, htmlPath, excelPath, onClose }: ReportViewerProps) {
  const handleOpenInBrowser = () => {
    if (htmlPath) {
      // 通过IPC打开文件
      if (window.electronAPI.openReportFile) {
        window.electronAPI.openReportFile(htmlPath);
      }
    }
  };

  const handleOpenExcel = () => {
    if (excelPath) {
      if (window.electronAPI.openReportFile) {
        window.electronAPI.openReportFile(excelPath);
      }
    }
  };

  return (
    <div className="report-viewer-overlay" onClick={onClose}>
      <div className="report-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-viewer-header">
          <h2>📊 活动分析报告 - {date}</h2>
          <div className="report-viewer-actions">
            {excelPath && (
              <button className="btn-open-excel" onClick={handleOpenExcel} title="打开Excel报告">
                📄 Excel
              </button>
            )}
            {htmlPath && (
              <button className="btn-open-browser" onClick={handleOpenInBrowser} title="在浏览器中打开">
                🌐 浏览器
              </button>
            )}
            <button className="btn-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="report-viewer-content">
          <iframe
            srcDoc={htmlContent}
            className="report-iframe"
            title="活动报告"
          />
        </div>
      </div>
    </div>
  );
}

