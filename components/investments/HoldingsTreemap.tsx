import React from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { formatBaseCurrency } from '../../services/currencyService';

interface TreemapData {
    name: string;
    ticker: string;
    value: number;
    price: number;
    quantity: number;
    isLive: boolean;
}

interface HoldingsTreemapProps {
    data: TreemapData[];
    isDarkMode: boolean;
}

const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
    '#84cc16', '#a855f7', '#f43f5e', '#2dd4bf', '#d946ef'
];

const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, ticker, value } = props;
    const total = root.value;
    const percent = (value / total) * 100;

    // Don't render content for tiny slices
    if (width < 35 || height < 30) return null;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: COLORS[index % COLORS.length],
                    stroke: '#fff',
                    strokeWidth: 2 / (depth + 1),
                    strokeOpacity: 1,
                }}
                className="hover:opacity-90 transition-all duration-300 cursor-crosshair"
            />
            {width > 45 && height > 35 && (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - 4}
                        textAnchor="middle"
                        fill="#000000"
                        fontSize={width > 100 ? 14 : 11}
                        fontWeight="900"
                        style={{ 
                            filter: 'drop-shadow(0px 1px 1px rgba(255,255,255,0.6))',
                            pointerEvents: 'none'
                        }}
                    >
                        {ticker}
                    </text>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 12}
                        textAnchor="middle"
                        fill="#000000"
                        fillOpacity={0.8}
                        fontSize={width > 100 ? 11 : 9}
                        fontWeight="900"
                        style={{ 
                            filter: 'drop-shadow(0px 1px 1px rgba(255,255,255,0.4))',
                            pointerEvents: 'none'
                        }}
                    >
                        {percent.toFixed(1)}%
                    </text>
                </>
            )}
        </g>
    );
};

const CustomTooltip = ({ active, payload, isDarkMode }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    
    return (
        <div className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md ${isDarkMode ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-sm font-black text-slate-900 dark:text-white">{data.ticker}</span>
                {data.isLive && (
                    <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">
                        Live Feed
                    </span>
                )}
            </div>
            <div className="space-y-1">
                <div className="flex justify-between gap-6 text-xs">
                    <span className="text-slate-500 font-medium">Position Value</span>
                    <span className="font-bold text-blue-500">{formatBaseCurrency(data.value)}</span>
                </div>
                <div className="flex justify-between gap-6 text-[10px]">
                    <span className="text-slate-400 font-medium">Market Price</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">{formatBaseCurrency(data.price)}</span>
                </div>
                <div className="flex justify-between gap-6 text-[10px]">
                    <span className="text-slate-400 font-medium">Net Quantity</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">{data.quantity.toLocaleString()} units</span>
                </div>
            </div>
        </div>
    );
};

export const HoldingsTreemap: React.FC<HoldingsTreemapProps> = ({ data, isDarkMode }) => {
    return (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm flex flex-col h-[600px] animate-fade-in relative overflow-hidden">
            <div className="mb-6 px-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">PORTFOLIO COMPOSITION</h3>
                <p className="text-xs text-slate-500 font-medium">Relative market value weighting based on live feeds</p>
            </div>

            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={data}
                        dataKey="value"
                        aspectRatio={4 / 3}
                        stroke="#fff"
                        content={<CustomizedContent />}
                    >
                        <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                    </Treemap>
                </ResponsiveContainer>
            </div>
        </div>
    );
};