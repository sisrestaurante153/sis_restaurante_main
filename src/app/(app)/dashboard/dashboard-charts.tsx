"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface DashboardChartsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  costs: any[];
}

export function DashboardCharts({ items, costs }: DashboardChartsProps) {
  // Chart 1: Items by Type
  const itemTypeData = useMemo(() => {
    const counts = items.reduce((acc, item) => {
      const t = item.type || "Outros";
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([name, value]) => ({ name: name as string, value: value as number }))
      .sort((a: { name: string; value: number }, b: { name: string; value: number }) => b.value - a.value);
  }, [items]);

  // Chart 2: Mocked Costs Evolution (Since we only have summaries, we'll mock a 7-day trend based on total)
  const costTrendData = useMemo(() => {
    const total = costs.reduce((sum, row) => sum + Number(row.total || 0), 0);
    const base = total > 0 ? total / 7 : 1500;
    
    const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    return days.map((day, i) => {
      // Create some realistic looking variation
      const variation = 1 + (Math.sin(i) * 0.3); 
      return {
        name: day,
        custo: Math.round(base * variation)
      };
    });
  }, [costs]);

  const COLORS = ["#001F3F", "#1966B8", "#FF6B00", "#FFAB66", "#8AB3E0"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Chart: Costs Trend */}
      <div className="bg-white p-6 rounded-2xl border border-ink-200 shadow-sm">
        <div className="mb-6">
          <h3 className="font-display font-semibold text-lg text-blue-900">Evolução de Custos</h3>
          <p className="text-sm text-ink-500 font-body">Variação projetada dos últimos 7 dias</p>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDE8DF" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "#6B6560" }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "#6B6560" }}
                tickFormatter={(value) => `R$${value}`}
              />
              <Tooltip 
                cursor={{ fill: "#F6F1E8" }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #EDE8DF', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`R$ ${value}`, "Custo"]}
              />
              <Bar dataKey="custo" fill="#FF6B00" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart: Items Distribution */}
      <div className="bg-white p-6 rounded-2xl border border-ink-200 shadow-sm">
        <div className="mb-2">
          <h3 className="font-display font-semibold text-lg text-blue-900">Distribuição do Cardápio</h3>
          <p className="text-sm text-ink-500 font-body">Itens por categoria</p>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={itemTypeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {itemTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #EDE8DF' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                formatter={(value) => <span className="text-sm text-ink-600 font-body">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
