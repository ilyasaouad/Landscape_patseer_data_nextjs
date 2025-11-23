'use client'

import React, { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Plot with no SSR to prevent hydration errors
// Note: 'as any' is required due to plotly-react type limitations
const Plot = dynamic(async () => {
    const plotly = await import('plotly.js-dist-min')
    const createPlotlyComponent = (await import('react-plotly.js/factory')).default
    return createPlotlyComponent(plotly.default)
}, { ssr: false }) as any

// Constants
const TOP_OWNERS_CHART_LIMIT = 8
const BUBBLE_SIZE_MULTIPLIER = 8
const MIN_BUBBLE_SIZE = 8

// Interfaces
interface LongFormatData {
    owner: string
    year: number
    count: number
}

interface YearTotal {
    year: number
    total: number
}

interface OwnerTotal {
    owner: string
    total: number
}

interface SummaryStats {
    totalPatents: number
    uniqueOwners: number
    dateRange: string
    peakYear: string
    peakCount: number
}

interface ProcessedTimelineData {
    rawData: {
        data: any[]
        years: string[]
        ownerKey: string
        displayData: any[]
    }
    longFormatData: LongFormatData[]
    yearTotals: YearTotal[]
    topOwners: OwnerTotal[]
    summaryStats: SummaryStats
}

interface TimelineResponse {
    success: boolean
    data?: ProcessedTimelineData
    error?: string
}

// Helper function to truncate owner names
function truncateOwnerName(name: string): string {
    const words = name.split(' ')
    if (words.length <= 2) return name
    return words.slice(0, 2).join(' ') + '...'
}

export default function TimelineAnalysis() {
    const [timelineData, setTimelineData] = useState<ProcessedTimelineData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    // Only render on client
    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return

        const fetchData = async () => {
            try {
                setLoading(true)
                const response = await fetch('/api/timeline')
                const result: TimelineResponse = await response.json()

                if (result.success && result.data) {
                    setTimelineData(result.data)
                } else {
                    setError(result.error || 'Failed to load timeline data')
                }
            } catch (err) {
                setError('Failed to fetch timeline data')
                console.error('Fetch error:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [mounted])

    // 1. Overall timeline chart data
    const overallTimelineData = useMemo(() => {
        if (!timelineData) return []

        return [
            {
                type: 'scatter' as const,
                mode: 'lines+markers' as const,
                x: timelineData.yearTotals.map(yt => yt.year),
                y: timelineData.yearTotals.map(yt => yt.total),
                line: { color: '#10b981', width: 3 },
                marker: { size: 8, color: '#10b981' },
                name: 'Total Applications',
            },
        ]
    }, [timelineData])

    // 2. Top owners bubble chart data
    const topOwnersTimelineData = useMemo(() => {
        if (!timelineData) return []

        const topOwnerNames = timelineData.topOwners.map(o => o.owner)
        const topOwnersData = timelineData.longFormatData.filter(d =>
            topOwnerNames.includes(d.owner)
        )

        const xData: number[] = []
        const yData: string[] = []
        const sizeData: number[] = []
        const colorData: number[] = []
        const hoverText: string[] = []

        // Sort owners by total (ascending) so top owner appears at top of chart
        const sortedOwners = [...timelineData.topOwners].sort((a, b) => a.total - b.total)

        sortedOwners.forEach(({ owner }) => {
            const ownerData = topOwnersData
                .filter(d => d.owner === owner)
                .sort((a, b) => a.year - b.year)

            ownerData.forEach(d => {
                xData.push(d.year)
                yData.push(truncateOwnerName(owner))
                sizeData.push(Math.max(MIN_BUBBLE_SIZE, Math.sqrt(d.count) * BUBBLE_SIZE_MULTIPLIER))
                colorData.push(d.count)
                hoverText.push(`<b>${owner}</b><br>Year: ${d.year}<br>Patents: ${d.count}`)
            })
        })

        return [
            {
                type: 'scatter' as const,
                mode: 'markers' as const,
                x: xData,
                y: yData,
                marker: {
                    size: sizeData,
                    color: colorData,
                    colorscale: 'Viridis',
                    showscale: true,
                    colorbar: {
                        title: 'Patents',
                        thickness: 15,
                        len: 0.7,
                    },
                    opacity: 0.8,
                    line: { color: '#ffffff', width: 1 },
                },
                text: hoverText,
                hovertemplate: '%{text}<extra></extra>',
                showlegend: false,
            }
        ]
    }, [timelineData])

    // 3. Heatmap data
    const heatmapData = useMemo(() => {
        if (!timelineData) return null

        const topOwnerNames = timelineData.topOwners.map(o => o.owner)
        const allYears = Array.from(
            new Set(timelineData.longFormatData.map(d => d.year))
        ).sort((a, b) => a - b)

        const matrix: number[][] = []
        const yLabels: string[] = []

        topOwnerNames.forEach(owner => {
            const row: number[] = []
            allYears.forEach(year => {
                const item = timelineData.longFormatData.find(
                    d => d.owner === owner && d.year === year
                )
                row.push(item ? item.count : 0)
            })
            matrix.push(row)
            yLabels.push(truncateOwnerName(owner))
        })

        return {
            z: matrix,
            x: allYears,
            y: yLabels,
            type: 'heatmap' as const,
            colorscale: [
                [0, '#ffffff'],
                [1, '#0c4a6e']
            ],
            hoverongaps: false,
        }
    }, [timelineData])

    // Chart layouts (memoized)
    const overallLayout = useMemo(() => ({
        title: 'Total Patent Applications by Year (All Current Owners)',
        xaxis: { title: 'Year' },
        yaxis: { title: 'Number of Patent Applications' },
        height: 400,
        plot_bgcolor: '#f9fafb',
        paper_bgcolor: '#ffffff',
    }), [])

    const topOwnersLayout = useMemo(() => ({
        title: 'Patent Applications Timeline by Top Current Owners',
        xaxis: {
            title: 'Year',
            tickmode: 'linear' as const,
            dtick: 1,
            side: 'bottom' as const,
        },
        yaxis: {
            title: 'Current Owner',
            automargin: true,
            side: 'left' as const,
        },
        autosize: true,
        height: 600,
        plot_bgcolor: '#f9fafb',
        paper_bgcolor: '#ffffff',
        margin: { t: 80, b: 80, r: 20, l: 150 },
    }), [])

    const heatmapLayout = useMemo(() => ({
        title: 'Patent Applications Heatmap (Top Owners)',
        xaxis: {
            title: 'Year',
            side: 'top' as const,
            tickangle: -45,
        },
        yaxis: {
            title: 'Current Owner',
            side: 'left' as const,
            autorange: 'reversed' as const,
        },
        height: 320,
        plot_bgcolor: '#ffffff',
        paper_bgcolor: '#ffffff',
        margin: { l: 120, b: 50, t: 100 },
    }), [])

    const defaultConfig = useMemo(() => ({
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
    }), [])

    if (!mounted) {
        return null
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading timeline data...</p>
                </div>
            </div>
        )
    }

    if (error || !timelineData) {
        return (
            <div className="card border-l-4 border-red-500 bg-red-50">
                <h3 className="text-xl font-bold text-red-700 mb-2">⚠️ Error Loading Data</h3>
                <p className="text-red-600">{error || 'No data available'}</p>
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-4 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
                        <p className="font-semibold mb-2">Debug Info:</p>
                        <pre>{JSON.stringify({ error, hasData: !!timelineData }, null, 2)}</pre>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="card">
                <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="text-4xl">📈</span>
                    Timeline Analysis - Current Owner
                </h1>

                <div className="info-box bg-green-50 border border-green-200 p-4 rounded-lg">
                    <p className="text-green-900 font-medium mb-2">
                        Understanding Timeline Analysis:
                    </p>
                    <p className="text-green-800 text-sm">
                        This section shows patent filing trends over time by current patent owners.
                        Track how innovation activity has evolved and identify key periods of patent
                        activity for different organizations.
                    </p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="card">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <p className="text-sm text-blue-600 font-medium uppercase">Total Patents</p>
                        <p className="text-2xl font-bold text-blue-900">
                            {timelineData.summaryStats.totalPatents.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                        <p className="text-sm text-purple-600 font-medium uppercase">Active Owners</p>
                        <p className="text-2xl font-bold text-purple-900">
                            {timelineData.summaryStats.uniqueOwners.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <p className="text-sm text-green-600 font-medium uppercase">Date Range</p>
                        <p className="text-2xl font-bold text-green-900">
                            {timelineData.summaryStats.dateRange}
                        </p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                        <p className="text-sm text-amber-600 font-medium uppercase">Peak Activity</p>
                        <p className="text-2xl font-bold text-amber-900">
                            {timelineData.summaryStats.peakYear}
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                            {timelineData.summaryStats.peakCount.toLocaleString()} patents
                        </p>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="card">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Sample Timeline Data (First 10 Owners)
                </h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                                    Current Owner
                                </th>
                                {timelineData.rawData.years.map((year, idx) => (
                                    <th
                                        key={idx}
                                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        {year}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {timelineData.rawData.displayData.map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-left sticky left-0 bg-white z-10">
                                        {row[timelineData.rawData.ownerKey] || ''}
                                    </td>
                                    {timelineData.rawData.years.map((year, colIdx) => (
                                        <td
                                            key={colIdx}
                                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center"
                                        >
                                            {row[year] || ''}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Overall Timeline Chart */}
            {overallTimelineData.length > 0 && (
                <div className="card">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Patent Applications Over Time
                    </h2>
                    <p className="text-gray-600 mb-6 text-sm italic">
                        Total number of patent applications across all current owners by year
                    </p>

                    <div className="w-full h-96">
                        <Plot
                            data={overallTimelineData}
                            layout={overallLayout}
                            config={defaultConfig}
                        />
                    </div>
                </div>
            )}

            {/* Top Owners Bubble Chart */}
            {topOwnersTimelineData.length > 0 && (
                <div className="card">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Timeline by Top {TOP_OWNERS_CHART_LIMIT} Current Owners
                    </h2>
                    <p className="text-gray-600 mb-6 text-sm italic">
                        Bubble size and color represents patent count
                    </p>

                    <div className="w-full h-screen">
                        <Plot
                            data={topOwnersTimelineData}
                            layout={topOwnersLayout}
                            useResizeHandler={true}
                            style={{ width: '100%', height: '100%' }}
                            config={defaultConfig}
                        />
                    </div>
                </div>
            )}

            {/* Heatmap */}
            {heatmapData && heatmapData.z.length > 0 && (
                <div className="card">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Patent Activity Heatmap
                    </h2>
                    <p className="text-gray-600 mb-6 text-sm italic">
                        Top {TOP_OWNERS_CHART_LIMIT} owners patent activity intensity over time
                    </p>

                    <div className="w-full h-80 max-w-2xl mx-auto">
                        <Plot
                            data={[heatmapData]}
                            layout={heatmapLayout}
                            config={defaultConfig}
                        />
                    </div>
                </div>
            )}

            {/* About Section */}
            <div className="card">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Patent Data</h2>
                <p className="text-gray-700">
                    This timeline analysis shows patent application trends by current patent owners over
                    time. The data represents the innovation activity and patent filing strategies of
                    different organizations in the quantum computing technology space.
                </p>
            </div>
        </div>
    )
}