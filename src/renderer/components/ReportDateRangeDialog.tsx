import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import './ReportDateRangeDialog.css';

interface ReportDateRangeDialogProps {
  defaultDate: string;
  onConfirm: (startDateTime: string, endDateTime: string) => void;
  onCancel: () => void;
}

export function ReportDateRangeDialog({ defaultDate, onConfirm, onCancel }: ReportDateRangeDialogProps) {
  const [startDate, setStartDate] = useState<string>(defaultDate);
  const [startTime, setStartTime] = useState<string>('00:00:00'); // 使用 HH:MM:SS 格式以支持秒选择
  const [endDate, setEndDate] = useState<string>(defaultDate);
  const [endTime, setEndTime] = useState<string>('23:59:59'); // 使用 HH:MM:SS 格式以支持秒选择
  const [useDateRange, setUseDateRange] = useState<boolean>(false);
  const startTimeInputRef = useRef<HTMLInputElement>(null);
  const endTimeInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 不立即关闭对话框，让用户看到生成过程
    // 对话框会在报告生成完成后由父组件关闭
    if (useDateRange) {
      // 验证日期时间
      // 确保时间格式为 HH:MM:SS
      // HTML time input 在 step="1" 时：
      // - 如果用户选择了秒，返回 HH:MM:SS 格式
      // - 如果只选择了时分，可能返回 HH:MM 格式
      const normalizeTime = (time: string, isEndTime: boolean = false): string => {
        const parts = time.split(':');
        // 如果已经是 HH:MM:SS 格式，直接返回
        if (parts.length === 3) {
          return time;
        }
        // 如果是 HH:MM 格式，补充秒数
        // 对于开始时间，补充 :00；对于结束时间，补充 :59
        if (parts.length === 2) {
          return isEndTime ? `${time}:59` : `${time}:00`;
        }
        // 其他情况（不应该发生），默认补充 :00
        return `${time}:00`;
      };
      
      const normalizedStartTime = normalizeTime(startTime, false);
      const normalizedEndTime = normalizeTime(endTime, true);
      
      const startDateTime = `${startDate}T${normalizedStartTime}`;
      const endDateTime = `${endDate}T${normalizedEndTime}`;
      
      if (startDate > endDate || (startDate === endDate && normalizedStartTime > normalizedEndTime)) {
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
    // 注意：对话框由父组件在报告生成完成后关闭
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
                    ref={startTimeInputRef}
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    onClick={(e) => {
                      // 立即显示时间选择器
                      e.currentTarget.showPicker?.();
                    }}
                    onFocus={(e) => {
                      // 聚焦时也显示选择器
                      e.currentTarget.showPicker?.();
                    }}
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
                    ref={endTimeInputRef}
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    onClick={(e) => {
                      // 立即显示时间选择器
                      e.currentTarget.showPicker?.();
                    }}
                    onFocus={(e) => {
                      // 聚焦时也显示选择器
                      e.currentTarget.showPicker?.();
                    }}
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
          {useDateRange && (
            <div className="report-dialog-hint">
              <small>💡 提示：点击时间输入框可立即打开时间选择器</small>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

