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

  async generateDailyReport(date: string): Promise<{ success: boolean; path: string; htmlContent?: string; htmlPath?: string; excelPath?: string; error?: string }> {
    try {
      const summary = this.database.getDailySummary(date);
      if (!summary) {
        console.error(`[Report] No data found for date: ${date}`);
        return { success: false, path: '', error: `所选日期 ${date} 没有活动记录` };
      }

      // 确保报告目录存在
      const reportsDir = path.join(app.getPath('userData'), 'reports');
      try {
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }
      } catch (dirError) {
        console.error('[Report] Error creating reports directory:', dirError);
        return { success: false, path: '', error: `无法创建报告目录: ${dirError}` };
      }

      // 生成 Excel 报告
      let excelPath: string;
      try {
        excelPath = await this.generateExcelReport(summary, reportsDir);
      } catch (excelError) {
        console.error('[Report] Error generating Excel report:', excelError);
        return { success: false, path: '', error: `Excel报告生成失败: ${excelError}` };
      }
      
      // 生成 HTML 报告
      let htmlPath: string;
      try {
        htmlPath = await this.generateHTMLReport(summary, reportsDir);
      } catch (htmlError) {
        console.error('[Report] Error generating HTML report:', htmlError);
        return { success: false, path: '', error: `HTML报告生成失败: ${htmlError}` };
      }
      
      // 获取HTML内容用于显示
      const htmlContent = this.generateHTMLContent(summary);

      return {
        success: true,
        path: `Excel: ${excelPath}\nHTML: ${htmlPath}`,
        htmlContent,
        htmlPath,
        excelPath,
      };
    } catch (error) {
      console.error('[Report] Error generating report:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, path: '', error: `报告生成失败: ${errorMessage}` };
    }
  }

  async generateDateRangeReport(startDateTime: string, endDateTime: string): Promise<{ success: boolean; path: string; htmlContent?: string; htmlPath?: string; excelPath?: string; error?: string }> {
    try {
      const summary = this.database.getSummaryByDateRange(startDateTime, endDateTime);
      if (!summary) {
        console.error(`[Report] No data found for date range: ${startDateTime} to ${endDateTime}`);
        return { success: false, path: '', error: `所选时间段没有活动记录` };
      }

      // 确保报告目录存在
      const reportsDir = path.join(app.getPath('userData'), 'reports');
      try {
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }
      } catch (dirError) {
        console.error('[Report] Error creating reports directory:', dirError);
        return { success: false, path: '', error: `无法创建报告目录: ${dirError}` };
      }

      // 生成文件名（使用日期范围，移除时间部分中的特殊字符）
      const startDate = startDateTime.split('T')[0];
      const endDate = endDateTime.split('T')[0];
      const startTime = startDateTime.includes('T') ? startDateTime.split('T')[1].replace(/:/g, '-') : '';
      const endTime = endDateTime.includes('T') ? endDateTime.split('T')[1].replace(/:/g, '-') : '';
      
      let dateRangeStr: string;
      if (startDate === endDate) {
        // 同一天，包含时间
        dateRangeStr = startTime && endTime 
          ? `${startDate}_${startTime}_${endTime}`
          : startDate;
      } else {
        // 不同日期
        dateRangeStr = startTime && endTime
          ? `${startDate}_${startTime}_${endDate}_${endTime}`
          : `${startDate}_${endDate}`;
      }

      // 生成 Excel 报告
      let excelPath: string;
      try {
        excelPath = await this.generateExcelReport(summary, reportsDir, dateRangeStr);
      } catch (excelError) {
        console.error('[Report] Error generating Excel report:', excelError);
        return { success: false, path: '', error: `Excel报告生成失败: ${excelError}` };
      }
      
      // 生成 HTML 报告
      let htmlPath: string;
      try {
        htmlPath = await this.generateHTMLReport(summary, reportsDir, dateRangeStr);
      } catch (htmlError) {
        console.error('[Report] Error generating HTML report:', htmlError);
        return { success: false, path: '', error: `HTML报告生成失败: ${htmlError}` };
      }
      
      // 获取HTML内容用于显示
      const htmlContent = this.generateHTMLContent(summary);

      return {
        success: true,
        path: `Excel: ${excelPath}\nHTML: ${htmlPath}`,
        htmlContent,
        htmlPath,
        excelPath,
      };
    } catch (error) {
      console.error('[Report] Error generating date range report:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, path: '', error: `报告生成失败: ${errorMessage}` };
    }
  }

  // 生成HTML内容（不保存文件，用于直接显示）
  private generateHTMLContent(summary: DailySummary): string {
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

    return this.generateHTMLReportContent(summary, appUsageList);
  }

  private async generateExcelReport(summary: DailySummary, reportsDir: string, dateRangeStr?: string): Promise<string> {
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
    const fileName = dateRangeStr 
      ? `活动报告_${dateRangeStr}.xlsx`
      : `活动报告_${summary.date}.xlsx`;
    const filePath = path.join(reportsDir, fileName);
    
    try {
      XLSX.writeFile(workbook, filePath);
      console.log(`[Report] Excel file saved: ${filePath}`);
    } catch (writeError) {
      console.error('[Report] Error writing Excel file:', writeError);
      throw new Error(`无法写入Excel文件: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
    }

    return filePath;
  }

  private async generateHTMLReport(summary: DailySummary, reportsDir: string, dateRangeStr?: string): Promise<string> {
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

    const html = this.generateHTMLReportContent(summary, appUsageList);
    const fileName = dateRangeStr
      ? `活动报告_${dateRangeStr}.html`
      : `活动报告_${summary.date}.html`;
    const filePath = path.join(reportsDir, fileName);
    
    try {
      fs.writeFileSync(filePath, html, 'utf-8');
      console.log(`[Report] HTML file saved: ${filePath}`);
    } catch (writeError) {
      console.error('[Report] Error writing HTML file:', writeError);
      throw new Error(`无法写入HTML文件: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
    }

    return filePath;
  }

  private generateHTMLReportContent(summary: DailySummary, appUsageList: Array<{ appName: string; duration: number; count: number }>): string {
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
    
    return html;
  }

  // 获取历史报告列表
  getReportList(): Array<{ date: string; htmlPath: string; excelPath: string; exists: boolean; fileKey?: string }> {
    try {
      const reportsDir = path.join(app.getPath('userData'), 'reports');
      if (!fs.existsSync(reportsDir)) {
        return [];
      }

      const files = fs.readdirSync(reportsDir);
      const reportMap = new Map<string, { htmlPath?: string; excelPath?: string; displayDate?: string }>();

      files.forEach(file => {
        // 匹配单日报告：活动报告_YYYY-MM-DD.html
        let match = file.match(/^活动报告_(\d{4}-\d{2}-\d{2})\.(html|xlsx)$/);
        if (match) {
          const date = match[1];
          const ext = match[2];
          const filePath = path.join(reportsDir, file);
          
          // 使用文件名（不含扩展名）作为 key，以便 HTML 和 Excel 文件配对
          const fileKey = file.replace(/\.(html|xlsx)$/, '');
          if (!reportMap.has(fileKey)) {
            reportMap.set(fileKey, { displayDate: date });
          }
          
          const report = reportMap.get(fileKey)!;
          if (ext === 'html') {
            report.htmlPath = filePath;
          } else if (ext === 'xlsx') {
            report.excelPath = filePath;
          }
        } else {
          // 匹配时间段报告：
          // 同一天：活动报告_YYYY-MM-DD_HH-MM-SS_HH-MM-SS.html
          // 不同日期：活动报告_YYYY-MM-DD_HH-MM-SS_YYYY-MM-DD_HH-MM-SS.html
          match = file.match(/^活动报告_(\d{4}-\d{2}-\d{2})(?:_\d{2}-\d{2}-\d{2})?(?:_\d{4}-\d{2}-\d{2})?(?:_\d{2}-\d{2}-\d{2})?\.(html|xlsx)$/);
          if (match) {
            // 从文件名中提取开始日期（第一个日期部分）
            const startDate = match[1];
            const ext = match[2];
            const filePath = path.join(reportsDir, file);
            
            // 使用文件名（不含扩展名）作为 key，以便 HTML 和 Excel 文件配对
            const fileKey = file.replace(/\.(html|xlsx)$/, '');
            if (!reportMap.has(fileKey)) {
              reportMap.set(fileKey, { displayDate: startDate });
            }
            
            const report = reportMap.get(fileKey)!;
            if (ext === 'html') {
              report.htmlPath = filePath;
            } else if (ext === 'xlsx') {
              report.excelPath = filePath;
            }
          }
        }
      });

      return Array.from(reportMap.entries())
        .map(([fileKey, report]) => {
          // 从文件名中提取完整信息用于显示
          let displayDate = report.displayDate || fileKey;
          
          // 如果是时间段报告，尝试从文件名提取时间信息
          // 格式：活动报告_YYYY-MM-DD_HH-MM-SS_HH-MM-SS 或
          // 活动报告_YYYY-MM-DD_HH-MM-SS_YYYY-MM-DD_HH-MM-SS
          const timeRangeMatch = fileKey.match(/^活动报告_(\d{4}-\d{2}-\d{2})(?:_(\d{2}-\d{2}-\d{2}))?(?:_(\d{4}-\d{2}-\d{2}))?(?:_(\d{2}-\d{2}-\d{2}))?$/);
          if (timeRangeMatch && (timeRangeMatch[2] || timeRangeMatch[4])) {
            // 有时间信息，这是时间段报告
            const startDate = timeRangeMatch[1];
            const startTime = timeRangeMatch[2]?.replace(/-/g, ':') || '';
            const endDate = timeRangeMatch[3] || startDate;
            const endTime = timeRangeMatch[4]?.replace(/-/g, ':') || '';
            
            if (startTime && endTime) {
              // 格式化显示：如果是同一天，显示 "日期 开始时间-结束时间"
              // 如果是不同日期，显示 "开始日期 开始时间 至 结束日期 结束时间"
              if (startDate === endDate) {
                displayDate = `${startDate} ${startTime}-${endTime}`;
              } else {
                displayDate = `${startDate} ${startTime} 至 ${endDate} ${endTime}`;
              }
            }
          }
          
          return {
            date: displayDate,
            htmlPath: report.htmlPath || '',
            excelPath: report.excelPath || '',
            exists: fs.existsSync(report.htmlPath || '') || fs.existsSync(report.excelPath || ''),
            // 添加 fileKey 用于 React key（确保唯一性）
            fileKey: fileKey,
          };
        })
        .filter(report => report.exists)
        .sort((a, b) => {
          // 先按日期排序，日期相同则按文件名排序（时间段报告会排在单日报告之后）
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          // 如果日期相同，按文件名排序（确保时间段报告也能正确排序）
          return b.htmlPath.localeCompare(a.htmlPath);
        }); // 最新的在前
    } catch (error) {
      console.error('Error getting report list:', error);
      return [];
    }
  }

  // 读取HTML报告内容
  readHTMLReport(htmlPath: string): string | null {
    try {
      if (fs.existsSync(htmlPath)) {
        return fs.readFileSync(htmlPath, 'utf-8');
      }
      return null;
    } catch (error) {
      console.error('Error reading HTML report:', error);
      return null;
    }
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

