"use client"

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
    AreaChart,
    Area,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, PieChart as PieChartIcon, LineChart } from "lucide-react"

interface AnalyticsChartsProps {
    topProducts: { name: string; count: number }[]
    topBrands: { name: string; count: number }[]
    statusDistribution: { name: string; value: number }[]
    dailyVolume: { date: string; count: number }[]
}

export function AnalyticsCharts({ topProducts, topBrands, statusDistribution, dailyVolume }: AnalyticsChartsProps) {
    const PIE_COLORS: Record<string, string> = {
        novo: "#22c55e", // Green
        em_analise: "#3b82f6", // Blue
        aguardando_resposta: "#eab308", // Yellow
        aprovado: "#000000", // Black
        negado: "#ef4444", // Red
        finalizado: "#71717a", // Zinc
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Defects Products Chart */}
            <Card>
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Top 5 Produtos com Defeito
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={topProducts}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 10 }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f4f4f5' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" fill="#0C0C0C" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Top Defects Brands Chart */}
            <Card>
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Top 5 Marcas com Defeito
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={topBrands}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 10 }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f4f4f5' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" fill="#0C0C0C" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Status Distribution Chart */}
            <Card>
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4" /> Distribuição de Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="h-[250px] w-full flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusDistribution.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={PIE_COLORS[entry.name] || "#9ca3af"}
                                            stroke="none"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number | undefined, name: string | undefined) => [value, (name || "").replace("_", " ").toUpperCase()]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Simple Legend using absolute positioning or just overlaid */}
                        <div className="absolute bottom-0 right-0 flex flex-col gap-1 pointer-events-none">
                            {/* Keep the legend simple/hidden here or customized. 
                                 Let's keep the previous layout style but compact. 
                             */}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                        {statusDistribution.map((entry, index) => (
                            <div key={index} className="flex items-center gap-1">
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: PIE_COLORS[entry.name] || "#9ca3af" }}
                                />
                                <span className="text-[10px] uppercase text-zinc-500 font-bold">
                                    {entry.name.replace("_", " ")}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Daily Volume Trend Chart */}
            <Card>
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <LineChart className="w-4 h-4" /> Volume Diário (7 Dias)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={dailyVolume}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0C0C0C" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#0C0C0C" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    cursor={{ stroke: '#0C0C0C', strokeWidth: 1 }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#0C0C0C"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCount)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
