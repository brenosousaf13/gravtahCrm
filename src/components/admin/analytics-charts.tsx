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
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, PieChart as PieChartIcon } from "lucide-react"

interface AnalyticsChartsProps {
    topProducts: { name: string; count: number }[]
    statusDistribution: { name: string; value: number }[]
}

export function AnalyticsCharts({ topProducts, statusDistribution }: AnalyticsChartsProps) {
    const PIE_COLORS: Record<string, string> = {
        novo: "#22c55e", // Green
        em_analise: "#3b82f6", // Blue
        aguardando_resposta: "#eab308", // Yellow
        aprovado: "#000000", // Black
        negado: "#ef4444", // Red
        finalizado: "#71717a", // Zinc
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {/* Top Defects Chart (Col-span-4) */}
            <Card className="lg:col-span-4">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Top 5 Produtos com Defeito
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="h-[300px] w-full">
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

            {/* Status Distribution Chart (Col-span-3) */}
            <Card className="lg:col-span-3">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4" /> Distribuição de Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
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
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
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
        </div>
    )
}
