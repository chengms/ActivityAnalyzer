import React, { useState } from 'react';
import { format } from 'date-fns';
import './ReportDateRangeDialog.css';

interface ReportDateRangeDialogProps {
  defaultDate: string;
  onConfirm: (startDateTime: string, endDateTime: string) => void;
  onCancel: () => void;
}

export function ReportDateRangeDialog({ defaultDate, onConfirm, onCancel }: ReportDateRangeDialogProps) {
  const [startDate, setStartDate] = useState<string>(defaultDate);
  const [startTime, setStartTime] = useState<string>('00:00'); // HTML time input 返回 HH:MM 格式
  const [endDate, setEndDate] = useState<string>(defaultDate);
  const [endTime, setEndTime] = useState<string>('23:59'); // HTML time input 返回 HH:MM 格式
  const [useDateRange, setUseDateRange] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (useDateRange) {
      // 验证日期时间
      // HTML time input 返回 HH:MM 格式，需要补充秒数部分以形成完整的 ISO 8601 格式
      const startDateTime = `${startDate}T${startTime}:00`;
      const endDateTime = `${endDate}T${endTime}:59`;
      
      if (startDate > endDate || (startDate === endDate && startTime > endTime)) {
        alert('开始时间不能晚于结束时间');
        return;
      }
      // 始终传递完整的日期时间字符串，即使日期相同
      onConfirm(startDateTime, endDateTime);
    } else {
      // 使用单日（默认一整天：00:00:00 到 23:59:59）
      const startDateTime = `${defaultDate}T00:00:00`;
      const endDateTime = `${defaultDate}T23:59:59`;
      onConfirm(startDateTime, endDateTime);
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
              <div className="date-time-group">
                <div className="date-time-label">开始时间：</div>
                <div className="date-time-inputs">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="date-input"
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    step="1"
                    className="time-input"
                  />
                </div>
              </div>
              <div className="date-time-group">
                <div className="date-time-label">结束时间：</div>
                <div className="date-time-inputs">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="date-input"
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    step="1"
                    className="time-input"
                  />
                </div>
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

