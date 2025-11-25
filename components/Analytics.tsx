import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LabelList } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/DesignSystem';
import { Transaction } from '../types';

interface Props {
  transactions: Transaction[];
  labels: any;
  formatCurrency: (val: number) => string;
  currency: string;
}

export const Analytics: React.FC<Props> = ({ transactions, labels, formatCurrency, currency }) => {
  
  // Prepare data for the charts (Daily Trend with Zero-Fill)
  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];

    // 1. Group transactions by Date (YYYY-MM-DD)
    const rawData: Record<string, { income: number; expense: number }> = {};
    
    // Find min and max date to create the range
    const dates = transactions.map(t => new Date(t.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Populate raw data
    transactions.forEach(t => {
      const dateStr = t.date.split('T')[0]; // YYYY-MM-DD
      if (!rawData[dateStr]) rawData[dateStr] = { income: 0, expense: 0 };
      
      if (t.type === 'income') rawData[dateStr].income += t.amount;
      else rawData[dateStr].expense += t.amount;
    });

    // 2. Fill in the Gaps (Zero-Fill)
    const filledData = [];
    const currentDate = new Date(minDate);
    
    // Iterate from Start Date to End Date
    while (currentDate <= maxDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayData = rawData[dateKey] || { income: 0, expense: 0 };
      
      filledData.push({
        // Display Name: "25 Nov"
        name: currentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        fullDate: dateKey,
        income: dayData.income,
        expense: dayData.expense
      });

      // Next Day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return filledData;
  }, [transactions]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      if (!data[t.category]) data[t.category] = 0;
      data[t.category] += t.amount;
    });
    return Object.keys(data).map(key => ({ name: key, value: data[key] })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [transactions]);

  // Dynamic Axis Formatter
  const formatAxis = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Main Income vs Expense Area Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{labels.cashFlow}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#71717a" 
                  tickLine={false} 
                  axisLine={false}
                  minTickGap={30} 
                />
                <YAxis stroke="#71717a" tickLine={false} axisLine={false} tickFormatter={formatAxis} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#ef4444" 
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                  strokeWidth={2}
                  activeDot={{ r: 6 }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Expense Categories Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.topSpending}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" stroke="#71717a" hide />
                <YAxis dataKey="name" type="category" stroke="#a1a1aa" tickLine={false} axisLine={false} width={80} style={{ fontSize: '12px' }} />
                <Tooltip 
                  cursor={{fill: '#27272a'}}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#f97316" fillOpacity={0.8 - (index * 0.1)} />
                  ))}
                  {/* Added Labels to show value at the end of bar */}
                  <LabelList dataKey="value" position="right" fill="#fff" fontSize={12} formatter={(val: number) => formatCurrency(val)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
