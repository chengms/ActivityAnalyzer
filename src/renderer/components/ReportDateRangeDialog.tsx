import React, { useState } from 'react';
import { format } from 'date-fns';
import './ReportDateRangeDialog.css';

interface ReportDateRangeDialogProps {
  defaultDate: string;
  onConfirm: (startDate: string, endDate: string) => void;
  onCancel: () => void;
}

export function ReportDateRangeDialog({ defaultDate, onConfirm, onCancel }: ReportDateRangeDialogProps) {
  const [startDate, setStartDate] = useState<string>(defaultDate);
  const [endDate, setEndDate] = useState<string>(defaultDate);
  const [useDateRange, setUseDateRange] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (useDateRange) {
      if (startDate > endDate) {
        alert('开始日期不能晚于结束日期');
        return;
      }
      onConfirm(startDate, endDate);
    } else {
      // 使用单日（默认一整天）
      onConfirm(defaultDate, defaultDate);
    }
  };

  return (
    <div className="report-dialog-overlay" onClick={onCancel}>
      <div className="report-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="report-dialog-header">
          <h2>📄 生成报告</h2>
          <button className="btn-close" onClick={onCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="report-dialog-form">
          <div className="report-dialog-option">
            <label>
              <input
                type="radio"
                checked={!useDateRange}
                onChange={() => setUseDateRange(false)}
              />
              <span>单日报告（默认：{defaultDate}）</span>
            </label>
          </div>
          
          <div className="report-dialog-option">
            <label>
              <input
                type="radio"
                checked={useDateRange}
                onChange={() => setUseDateRange(true)}
              />
              <span>时间段报告</span>
            </label>
          </div>

          {useDateRange && (
            <div className="report-dialog-date-range">
              <div className="date-range-item">
                <label>开始日期：</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="date-range-item">
                <label>结束日期：</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="report-dialog-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="btn-confirm">
              生成报告
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

