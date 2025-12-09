import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { ActivityRecord } from '../../tracker/database';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ActivityChartProps {
  data: ActivityRecord[];
  onSegmentClick?: (appName: string) => void;
}

export function ActivityChart({ data, onSegmentClick }: ActivityChartProps) {
  // 按应用分组统计时长
  const appDurationMap = new Map<string, number>();
  
  data.forEach(record => {
    const current = appDurationMap.get(record.appName) || 0;
    appDurationMap.set(record.appName, current + record.duration);
  });

  // 转换为数组并排序
  const appData = Array.from(appDurationMap.entries())
    .map(([appName, duration]) => ({ appName, duration }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10); // 只显示前10个

  // 生成颜色
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe',
    '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea'
  ];

  const chartData = {
    labels: appData.map(item => item.appName),
    datasets: [
      {
        data: appData.map(item => item.duration),
        backgroundColor: colors.slice(0, appData.length),
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const hours = Math.floor(value / 3600);
            const minutes = Math.floor((value % 3600) / 60);
            return `${label}: ${hours > 0 ? `${hours}小时` : ''}${minutes}分钟`;
          },
        },
      },
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onSegmentClick) {
        const elementIndex = elements[0].index;
        const appName = appData[elementIndex]?.appName;
        if (appName) {
          onSegmentClick(appName);
        }
      }
    },
    onHover: (event: any, elements: any[]) => {
      if (event.native) {
        (event.native.target as HTMLElement).style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    },
  };

  if (appData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        暂无数据
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', minHeight: '400px' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
}

