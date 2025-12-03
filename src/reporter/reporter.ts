import * as XLSX from 'xlsx';
import { Database, ActivityRecord, DailySummary } from '../tracker/database';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

export class Reporter {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async generateDailyReport(date: string): Promise<{ success: boolean; path: string }> {
    try {
      const summary = this.database.getDailySummary(date);
      if (!summary) {
        return { success: false, path: '' };
      }

      // 确保报告目录存在
      const reportsDir = path.join(app.getPath('userData'), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // 生成 Excel 报告
      const excelPath = await this.generateExcelReport(summary, reportsDir);
      
      // 生成 HTML 报告
      const htmlPath = await this.generateHTMLReport(summary, reportsDir);

      return {
        success: true,
        path: `Excel: ${excelPath}\nHTML: ${htmlPath}`,
      };
    } catch (error) {
      console.error('Error generating report:', error);
      return { success: false, path: '' };
    }
  }

  private async generateExcelReport(summary: DailySummary, reportsDir: string): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // 汇总表
    const summaryData = [
      ['日期', summary.date],
      ['总使用时长（秒）', summary.totalDuration],
      ['总使用时长', this.formatDuration(summary.totalDuration)],
      ['使用应用数', summary.appCount],
      ['活动记录数', summary.records.length],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, '汇总');

    // 应用使用统计
    const appUsageMap = new Map<string, { duration: number; count: number }>();
    summary.records.forEach(record => {
      const existing = appUsageMap.get(record.appName) || { duration: 0, count: 0 };
      appUsageMap.set(record.appName, {
        duration: existing.duration + record.duration,
        count: existing.count + 1,
      });
    });

    const appUsageData = [
      ['应用名称', '使用时长（秒）', '使用时长', '使用次数'],
      ...Array.from(appUsageMap.entries())
        .map(([appName, data]) => [
          appName,
          data.duration,
          this.formatDuration(data.duration),
          data.count,
        ])
        .sort((a, b) => (b[1] as number) - (a[1] as number)),
    ];
    const appUsageSheet = XLSX.utils.aoa_to_sheet(appUsageData);
    XLSX.utils.book_append_sheet(workbook, appUsageSheet, '应用使用统计');

    // 详细活动记录
    const recordsData = [
      ['开始时间', '结束时间', '应用名称', '窗口标题', '时长（秒）', '时长'],
      ...summary.records.map(record => [
        record.startTime,
        record.endTime || '',
        record.appName,
        record.windowTitle || '',
        record.duration,
        this.formatDuration(record.duration),
      ]),
    ];
    const recordsSheet = XLSX.utils.aoa_to_sheet(recordsData);
    XLSX.utils.book_append_sheet(workbook, recordsSheet, '详细记录');

    // 保存文件
    const fileName = `活动报告_${summary.date}.xlsx`;
    const filePath = path.join(reportsDir, fileName);
    XLSX.writeFile(workbook, filePath);

    return filePath;
  }

  private async generateHTMLReport(summary: DailySummary, reportsDir: string): Promise<string> {
    // 应用使用统计
    const appUsageMap = new Map<string, { duration: number; count: number }>();
    summary.records.forEach(record => {
      const existing = appUsageMap.get(record.appName) || { duration: 0, count: 0 };
      appUsageMap.set(record.appName, {
        duration: existing.duration + record.duration,
        count: existing.count + 1,
      });
    });

    const appUsageList = Array.from(appUsageMap.entries())
      .map(([appName, data]) => ({ appName, ...data }))
      .sort((a, b) => b.duration - a.duration);

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>活动报告 - ${summary.date}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #667eea;
      margin-bottom: 30px;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-item {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
    }
    .summary-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: 600;
    }
    h2 {
      color: #333;
      margin: 30px 0 15px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #333;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .footer {
      text-align: center;
      color: #666;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 活动分析报告 - ${summary.date}</h1>
    
    <div class="summary">
      <div class="summary-item">
        <div class="summary-label">总使用时长</div>
        <div class="summary-value">${this.formatDuration(summary.totalDuration)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">使用应用数</div>
        <div class="summary-value">${summary.appCount}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">活动记录数</div>
        <div class="summary-value">${summary.records.length}</div>
      </div>
    </div>

    <h2>应用使用排行</h2>
    <table>
      <thead>
        <tr>
          <th>排名</th>
          <th>应用名称</th>
          <th>使用时长</th>
          <th>使用次数</th>
        </tr>
      </thead>
      <tbody>
        ${appUsageList.map((app, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${this.escapeHtml(app.appName)}</td>
            <td>${this.formatDuration(app.duration)}</td>
            <td>${app.count}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>详细活动记录</h2>
    <table>
      <thead>
        <tr>
          <th>开始时间</th>
          <th>结束时间</th>
          <th>应用名称</th>
          <th>窗口标题</th>
          <th>时长</th>
        </tr>
      </thead>
      <tbody>
        ${summary.records.map(record => `
          <tr>
            <td>${this.formatTime(record.startTime)}</td>
            <td>${record.endTime ? this.formatTime(record.endTime) : '-'}</td>
            <td>${this.escapeHtml(record.appName)}</td>
            <td>${this.escapeHtml(record.windowTitle || '-')}</td>
            <td>${this.formatDuration(record.duration)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="footer">
      <p>报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
      <p>活动分析器 v1.0.0</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const fileName = `活动报告_${summary.date}.html`;
    const filePath = path.join(reportsDir, fileName);
    fs.writeFileSync(filePath, html, 'utf-8');

    return filePath;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  }

  private formatTime(timeString: string): string {
    try {
      const date = new Date(timeString);
      return date.toLocaleString('zh-CN');
    } catch {
      return timeString;
    }
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

