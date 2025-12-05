import React, { useCallback } from 'react';
import './ReportViewer.css';

interface ReportViewerProps {
  htmlContent: string;
  date: string;
  htmlPath?: string;
  excelPath?: string;
  onClose: () => void;
  onGoHome?: () => void;
}

declare global {
  interface Window {
    electronAPI?: {
      openReportFile?: (filePath: string) => Promise<void>;
    };
  }
}

export function ReportViewer({ htmlContent, date, htmlPath, excelPath, onClose, onGoHome }: ReportViewerProps) {
  const handleOpenInBrowser = useCallback(() => {
    if (htmlPath) {
      // 通过IPC打开文件
      if (window.electronAPI?.openReportFile) {
        window.electronAPI.openReportFile(htmlPath);
      }
    }
  }, [htmlPath]);

  const handleOpenExcel = useCallback(() => {
    if (excelPath) {
      if (window.electronAPI?.openReportFile) {
        window.electronAPI.openReportFile(excelPath);
      }
    }
  }, [excelPath]);

  const handleGoHome = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Home button clicked in ReportViewer');
    if (onGoHome) {
      console.log('Calling onGoHome callback');
      onGoHome();
    } else {
      console.warn('onGoHome is not defined');
    }
  }, [onGoHome]);

  return (
    <div className="report-viewer-content-wrapper">
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
          <button 
            className="btn-go-home" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Home button clicked in ReportViewer - direct handler');
              if (onGoHome) {
                console.log('Calling onGoHome callback');
                onGoHome();
              } else {
                console.warn('onGoHome is not defined, using fallback');
                // 如果 onGoHome 未定义，尝试直接关闭
                if (onClose) {
                  onClose();
                }
              }
            }}
            title="返回主页"
            type="button"
          >
            🏠 主页
          </button>
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
  );
}

