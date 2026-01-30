// Added React import to resolve 'Cannot find namespace React' errors
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LabelList, ReferenceLine } from 'recharts';
import { AllocationResult } from '../types';

interface ChartProps {
  data: AllocationResult[];
}

const COLORS = ['#0f172a', '#b45309', '#059669', '#334155', '#4f46e5', '#be123c'];

// Added comment: Fixed error by importing React to use React.FC
export const AllocationPie: React.FC<ChartProps> = ({ data }) => {
  const chartData = data.map(item => ({
    name: item.symbol,
    value: Math.max(0, item.amount), // Chỉ hiển thị phần vốn thực tế
    percent: ((item.weight) * 100).toFixed(1) + '%'
  }));

  return (
    <div className="h-96 w-full">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 text-center">Cơ cấu giải ngân thực tế</h4>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
            label={({ name, percent }) => `${name}: ${percent}`}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                fontSize: '12px',
                fontWeight: '900',
                padding: '12px 16px'
            }}
            formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Added comment: Fixed error by importing React to use React.FC
export const ProfitBarChart: React.FC<ChartProps> = ({ data }) => {
  const chartData = data.map(item => ({
    name: item.symbol,
    'Lợi nhuận dự báo': item.expectedProfit,
    'Vốn đầu tư': item.amount
  }));

  const formatValue = (val: number) => {
    const absVal = Math.abs(val);
    const formatted = absVal >= 1000000 ? (absVal/1000000).toFixed(1) + 'tr' : new Intl.NumberFormat('vi-VN').format(absVal);
    return (val < 0 ? "-" : "") + formatted;
  };

  return (
    <div className="h-96 w-full">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 text-center">Dự báo P/L Danh mục (Profit/Loss)</h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 30, right: 10, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fontWeight: '900', fill: '#475569' }} 
          />
          <YAxis hide />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Tooltip 
            contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                fontSize: '11px',
                fontWeight: '900'
            }}
            formatter={(value: number) => formatValue(value) + ' đ'}
          />
          <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
          <Bar name="Lợi nhuận mục tiêu" dataKey="Lợi nhuận dự báo">
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry['Lợi nhuận dự báo'] >= 0 ? '#059669' : '#e11d48'} // Xanh cho lãi, Đỏ cho lỗ
                radius={entry['Lợi nhuận dự báo'] >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6]}
              />
            ))}
            <LabelList 
                dataKey="Lợi nhuận dự báo" 
                position="top" 
                formatter={formatValue}
                style={{ fontSize: '9px', fontWeight: '900' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};