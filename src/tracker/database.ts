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
  // 进程详细信息
  processPath?: string; // 进程完整路径
  processName?: string; // 进程名称（不含扩展名）
  processId?: number; // 进程ID (PID)
  architecture?: string; // 进程架构（32位/64位）
  commandLine?: string; // 命令行参数
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
    
    // 创建活动记录表（基础字段）
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

    // 数据库迁移：添加进程信息字段（如果表已存在但字段不存在）
    this.migrateDatabase();
  }

  // 数据库迁移：添加新字段
  private migrateDatabase() {
    if (!this.db) return;
    
    try {
      // 检查表是否存在
      const tableInfo = this.db.prepare("PRAGMA table_info(activities)").all() as Array<{ name: string }>;
      const columnNames = tableInfo.map(col => col.name);
      
      // 添加缺失的字段
      if (!columnNames.includes('processPath')) {
        this.db.exec('ALTER TABLE activities ADD COLUMN processPath TEXT');
        console.log('[Database] Added processPath column');
      }
      if (!columnNames.includes('processName')) {
        this.db.exec('ALTER TABLE activities ADD COLUMN processName TEXT');
        console.log('[Database] Added processName column');
      }
      if (!columnNames.includes('processId')) {
        this.db.exec('ALTER TABLE activities ADD COLUMN processId INTEGER');
        console.log('[Database] Added processId column');
      }
      if (!columnNames.includes('architecture')) {
        this.db.exec('ALTER TABLE activities ADD COLUMN architecture TEXT');
        console.log('[Database] Added architecture column');
      }
      if (!columnNames.includes('commandLine')) {
        this.db.exec('ALTER TABLE activities ADD COLUMN commandLine TEXT');
        console.log('[Database] Added commandLine column');
      }

      // 重新查询表结构以获取最新的列信息（因为可能刚刚添加了新列）
      const updatedTableInfo = this.db.prepare("PRAGMA table_info(activities)").all() as Array<{ name: string }>;
      const updatedColumnNames = updatedTableInfo.map(col => col.name);

      // 添加进程ID索引（如果不存在且字段已存在）
      if (updatedColumnNames.includes('processId')) {
        const indexes = this.db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_processId'").all();
        if (indexes.length === 0) {
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_processId ON activities(processId)');
          console.log('[Database] Added processId index');
        }
      }
    } catch (error) {
      console.error('[Database] Migration error:', error);
    }
  }

  insertActivity(record: ActivityRecord): number | null {
    if (!this.db) return null;
    
    const stmt = this.db.prepare(`
      INSERT INTO activities (
        appName, windowTitle, startTime, endTime, duration, date,
        processPath, processName, processId, architecture, commandLine
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      record.appName,
      record.windowTitle,
      record.startTime,
      record.endTime || null,
      record.duration,
      record.date,
      record.processPath || null,
      record.processName || null,
      record.processId || null,
      record.architecture || null,
      record.commandLine || null
    );
    
    return (result.lastInsertRowid as number) || null;
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
    
    // 查询所有窗口，包括空标题的，按应用和窗口分组
    const stmt = this.db.prepare(`
      SELECT 
        appName,
        CASE 
          WHEN windowTitle IS NULL OR windowTitle = '' THEN 'Unknown Window'
          ELSE windowTitle
        END as windowTitle,
        SUM(duration) as totalDuration,
        COUNT(*) as usageCount,
        MIN(startTime) as firstSeen,
        MAX(COALESCE(endTime, startTime)) as lastSeen
      FROM activities
      WHERE date = ?
      GROUP BY appName, 
        CASE 
          WHEN windowTitle IS NULL OR windowTitle = '' THEN 'Unknown Window'
          ELSE windowTitle
        END
      ORDER BY totalDuration DESC
    `);
    
    const results = stmt.all(date) as WindowUsage[];
    
    // 确保所有窗口都被包含
    return results.filter(item => {
      // 过滤掉总时长为0或负数的记录（但保留所有有数据的记录）
      return item.totalDuration > 0;
    }).map(item => ({
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

  // 获取时间段内的活动记录（用于报告生成）
  getActivityByDateRange(startDate: string, endDate: string): ActivityRecord[] {
    if (!this.db) return [];
    
    const stmt = this.db.prepare(`
      SELECT * FROM activities 
      WHERE date >= ? AND date <= ?
      ORDER BY startTime ASC
    `);
    
    return stmt.all(startDate, endDate) as ActivityRecord[];
  }

  // 获取时间段内的汇总数据（用于报告生成）
  getSummaryByDateRange(startDate: string, endDate: string): DailySummary | null {
    if (!this.db) return null;
    
    const records = this.getActivityByDateRange(startDate, endDate);
    if (records.length === 0) return null;

    // 计算总时长
    const totalDuration = records.reduce((sum, record) => sum + record.duration, 0);

    // 计算应用数（去重）
    const appSet = new Set(records.map(r => r.appName));
    const appCount = appSet.size;

    return {
      date: startDate === endDate ? startDate : `${startDate} 至 ${endDate}`,
      totalDuration,
      appCount,
      records,
    };
  }

  // 删除指定应用和窗口的记录（按日期）
  deleteActivityByAppAndWindow(date: string, appName: string, windowTitle: string): number {
    if (!this.db) return 0;
    
    // 根据 getWindowUsage 的逻辑，'Unknown Window' 表示数据库中存储的是 NULL 或空字符串
    // 我们需要匹配数据库中实际存储的值
    if (windowTitle === 'Unknown Window') {
      // 匹配数据库中 windowTitle 为 NULL 或空字符串的记录
      const stmt = this.db.prepare(`
        DELETE FROM activities 
        WHERE date = ? AND appName = ? AND (windowTitle IS NULL OR windowTitle = '')
      `);
      return (stmt.run(date, appName).changes || 0);
    } else if (!windowTitle || windowTitle.trim() === '') {
      // 如果传入的 windowTitle 本身就是空，也匹配 NULL 或空字符串
      const stmt = this.db.prepare(`
        DELETE FROM activities 
        WHERE date = ? AND appName = ? AND (windowTitle IS NULL OR windowTitle = '')
      `);
      return (stmt.run(date, appName).changes || 0);
    } else {
      // 精确匹配具体的窗口标题
      const stmt = this.db.prepare(`
        DELETE FROM activities 
        WHERE date = ? AND appName = ? AND windowTitle = ?
      `);
      return (stmt.run(date, appName, windowTitle).changes || 0);
    }
  }

  // 删除指定应用的所有记录（所有日期）
  deleteActivityByApp(appName: string): number {
    if (!this.db) return 0;
    
    const stmt = this.db.prepare(`
      DELETE FROM activities 
      WHERE appName = ?
    `);
    
    const result = stmt.run(appName);
    return result.changes || 0;
  }

  // 删除指定应用在指定日期的所有记录
  deleteActivityByAppAndDate(date: string, appName: string): number {
    if (!this.db) return 0;
    
    const stmt = this.db.prepare(`
      DELETE FROM activities 
      WHERE date = ? AND appName = ?
    `);
    
    const result = stmt.run(date, appName);
    return result.changes || 0;
  }

  // 删除所有Unknown记录
  deleteUnknownActivities(date?: string): number {
    if (!this.db) return 0;
    
    if (date) {
      const stmt = this.db.prepare(`
        DELETE FROM activities 
        WHERE date = ? AND (appName = 'Unknown' OR appName = '' OR appName IS NULL)
      `);
      const result = stmt.run(date);
      return result.changes || 0;
    } else {
      const stmt = this.db.prepare(`
        DELETE FROM activities 
        WHERE appName = 'Unknown' OR appName = '' OR appName IS NULL
      `);
      const result = stmt.run();
      return result.changes || 0;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
