import DatabaseLib from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

export interface ActivityRecord {
  id?: number;
  appName: string;
  windowTitle: string;
  startTime: string;
  endTime?: string;
  duration: number; // 秒
  date: string; // YYYY-MM-DD
}

export interface AppUsage {
  appName: string;
  totalDuration: number;
  usageCount: number;
}

export interface WindowUsage {
  appName: string;
  windowTitle: string;
  totalDuration: number;
  usageCount: number;
  firstSeen: string;
  lastSeen: string;
}

export interface DailySummary {
  date: string;
  totalDuration: number;
  appCount: number;
  records: ActivityRecord[];
}

export class Database {
  private db: DatabaseLib.Database | null = null;
  private dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'activity.db');
  }

  init() {
    this.db = new DatabaseLib(this.dbPath);
    
    // 创建活动记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appName TEXT NOT NULL,
        windowTitle TEXT,
        startTime TEXT NOT NULL,
        endTime TEXT,
        duration INTEGER NOT NULL,
        date TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_date ON activities(date);
      CREATE INDEX IF NOT EXISTS idx_appName ON activities(appName);
      CREATE INDEX IF NOT EXISTS idx_startTime ON activities(startTime);
    `);
  }

  insertActivity(record: ActivityRecord) {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT INTO activities (appName, windowTitle, startTime, endTime, duration, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      record.appName,
      record.windowTitle,
      record.startTime,
      record.endTime || null,
      record.duration,
      record.date
    );
    
    return result.lastInsertRowid as number;
  }

  // 查找或创建同一天相同应用和窗口的记录
  findOrCreateActivity(record: ActivityRecord): number | null {
    if (!this.db) return null;
    
    // 查找同一天相同应用和窗口的记录
    const findStmt = this.db.prepare(`
      SELECT id, duration, startTime, endTime
      FROM activities
      WHERE date = ? AND appName = ? AND windowTitle = ?
      ORDER BY startTime DESC
      LIMIT 1
    `);
    
    const existing = findStmt.get(record.date, record.appName, record.windowTitle) as {
      id: number;
      duration: number;
      startTime: string;
      endTime: string | null;
    } | undefined;
    
    if (existing) {
      // 更新现有记录：累加时长，更新结束时间
      const newDuration = existing.duration + record.duration;
      const newEndTime = record.endTime || record.startTime;
      
      const updateStmt = this.db.prepare(`
        UPDATE activities
        SET duration = ?, endTime = ?
        WHERE id = ?
      `);
      
      updateStmt.run(newDuration, newEndTime, existing.id);
      return existing.id;
    } else {
      // 创建新记录
      return this.insertActivity(record);
    }
  }

  updateActivityEndTime(id: number, endTime: string, duration: number) {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      UPDATE activities 
      SET endTime = ?, duration = ?
      WHERE id = ?
    `);
    
    stmt.run(endTime, duration, id);
  }

  getActivityByDate(date: string): ActivityRecord[] {
    if (!this.db) return [];
    
    const stmt = this.db.prepare(`
      SELECT * FROM activities 
      WHERE date = ? 
      ORDER BY startTime ASC
    `);
    
    return stmt.all(date) as ActivityRecord[];
  }

  getAppUsage(startDate: string, endDate: string): AppUsage[] {
    if (!this.db) return [];
    
    const stmt = this.db.prepare(`
      SELECT 
        appName,
        SUM(duration) as totalDuration,
        COUNT(*) as usageCount
      FROM activities
      WHERE date >= ? AND date <= ?
      GROUP BY appName
      ORDER BY totalDuration DESC
    `);
    
    return stmt.all(startDate, endDate) as AppUsage[];
  }

  getDailySummary(date: string): DailySummary | null {
    if (!this.db) return null;
    
    const records = this.getActivityByDate(date);
    if (records.length === 0) return null;
    
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    const appCount = new Set(records.map(r => r.appName)).size;
    
    return {
      date,
      totalDuration,
      appCount,
      records,
    };
  }

  // 获取窗口使用汇总（按应用+窗口分组）
  getWindowUsage(date: string): WindowUsage[] {
    if (!this.db) return [];
    
    const stmt = this.db.prepare(`
      SELECT 
        appName,
        COALESCE(windowTitle, '') as windowTitle,
        SUM(duration) as totalDuration,
        COUNT(*) as usageCount,
        MIN(startTime) as firstSeen,
        MAX(COALESCE(endTime, startTime)) as lastSeen
      FROM activities
      WHERE date = ?
      GROUP BY appName, COALESCE(windowTitle, '')
      HAVING SUM(duration) > 0
      ORDER BY totalDuration DESC
    `);
    
    const results = stmt.all(date) as WindowUsage[];
    
    // 确保所有窗口都被包含，即使窗口标题为空
    return results.map(item => ({
      ...item,
      windowTitle: item.windowTitle || 'Unknown Window',
    }));
  }

  // 获取详细时间线（所有记录，不合并）
  getActivityTimeline(date: string): ActivityRecord[] {
    if (!this.db) return [];
    
    const stmt = this.db.prepare(`
      SELECT * FROM activities 
      WHERE date = ? 
      ORDER BY startTime ASC
    `);
    
    return stmt.all(date) as ActivityRecord[];
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

