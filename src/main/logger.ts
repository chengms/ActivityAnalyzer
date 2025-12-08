import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * 日志记录器
 * 在 release 版本中将日志写入文件
 */
class Logger {
  private logDir: string;
  private logFile: string;
  private maxLogSize: number = 10 * 1024 * 1024; // 10MB
  private maxLogFiles: number = 5; // 保留5个日志文件

  constructor() {
    // 日志目录：用户数据目录下的 logs 文件夹
    // 如果 app 还未 ready，使用临时目录，稍后更新
    try {
      this.logDir = path.join(app.getPath('userData'), 'logs');
    } catch (error) {
      // 如果 app 还未 ready，使用临时目录
      this.logDir = path.join(require('os').tmpdir(), 'activity-analyzer-logs');
    }
    
    this.logFile = path.join(this.logDir, `app-${this.getDateString()}.log`);

    // 确保日志目录存在
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      // 清理旧日志文件
      this.cleanOldLogs();
    } catch (error) {
      // 如果初始化失败，使用控制台输出
      console.error('Failed to initialize logger:', error);
    }
  }

  /**
   * 更新日志目录（在 app ready 后调用，或路径变更时调用）
   */
  updateLogDir(customPath?: string): void {
    try {
      let newLogDir: string;
      if (customPath && customPath.trim() !== '') {
        // 使用自定义路径
        newLogDir = path.isAbsolute(customPath) 
          ? customPath 
          : path.join(customPath, 'logs');
      } else {
        // 使用默认路径
        newLogDir = path.join(app.getPath('userData'), 'logs');
      }
      
      if (newLogDir !== this.logDir) {
        this.logDir = newLogDir;
        this.logFile = path.join(this.logDir, `app-${this.getDateString()}.log`);
        
        if (!fs.existsSync(this.logDir)) {
          fs.mkdirSync(this.logDir, { recursive: true });
        }
        
        this.cleanOldLogs();
      }
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 获取日期字符串（用于日志文件名）
   */
  private getDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * 清理旧日志文件
   */
  private cleanOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          time: fs.statSync(path.join(this.logDir, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time); // 按时间倒序

      // 删除超过最大数量的旧文件
      if (files.length > this.maxLogFiles) {
        files.slice(this.maxLogFiles).forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (error) {
            // 忽略删除错误
          }
        });
      }
    } catch (error) {
      // 忽略清理错误
    }
  }

  /**
   * 检查日志文件大小，如果太大则轮转
   */
  private rotateLogIfNeeded(): void {
    try {
      const stats = fs.statSync(this.logFile);
      if (stats.size > this.maxLogSize) {
        // 重命名当前日志文件
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const oldLogFile = path.join(this.logDir, `app-${this.getDateString()}-${timestamp}.log`);
        fs.renameSync(this.logFile, oldLogFile);
        
        // 创建新的日志文件
        this.logFile = path.join(this.logDir, `app-${this.getDateString()}.log`);
      }
    } catch (error) {
      // 如果文件不存在，忽略错误
    }
  }

  /**
   * 写入日志
   */
  private writeLog(level: LogLevel, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : '';
    const logMessage = `[${timestamp}] [${level}] ${message}${formattedArgs}\n`;

    // 在开发模式下也输出到控制台
    if (!app.isPackaged) {
      const consoleMethod = level === LogLevel.ERROR ? console.error :
                           level === LogLevel.WARN ? console.warn :
                           level === LogLevel.INFO ? console.info :
                           console.log;
      consoleMethod(`[${level}]`, message, ...args);
    }

    // 在 release 版本中，只记录 WARN 和 ERROR
    // 在开发版本中，记录所有级别
    if (app.isPackaged) {
      if (level === LogLevel.WARN || level === LogLevel.ERROR) {
        this.writeToFile(logMessage);
      }
    } else {
      // 开发模式记录所有级别
      this.writeToFile(logMessage);
    }
  }

  /**
   * 写入文件
   */
  private writeToFile(message: string): void {
    try {
      this.rotateLogIfNeeded();
      fs.appendFileSync(this.logFile, message, 'utf8');
    } catch (error) {
      // 如果写入失败，尝试输出到控制台（如果可用）
      if (!app.isPackaged) {
        console.error('Failed to write log:', error);
      }
    }
  }

  /**
   * 记录调试信息（仅在开发模式）
   */
  debug(message: string, ...args: any[]): void {
    if (!app.isPackaged) {
      this.writeLog(LogLevel.DEBUG, message, ...args);
    }
  }

  /**
   * 记录信息
   */
  info(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.INFO, message, ...args);
  }

  /**
   * 记录警告（在 release 版本中会写入文件）
   */
  warn(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.WARN, message, ...args);
  }

  /**
   * 记录错误（在 release 版本中会写入文件）
   */
  error(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.ERROR, message, ...args);
  }

  /**
   * 获取日志文件路径
   */
  getLogFilePath(): string {
    return this.logFile;
  }

  /**
   * 获取日志目录路径
   */
  getLogDirPath(): string {
    return this.logDir;
  }
}

// 导出单例
export const logger = new Logger();

