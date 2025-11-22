'use client'

import React, { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Plot with no SSR to prevent hydration errors
const Plot = dynamic(async () => {
    const plotly = await import('plotly.js-dist-min')
    const createPlotlyComponent = (await import('react-plotly.js/factory')).default
    return createPlotlyComponent(plotly.default)
}, { ssr: false }) as any

interface TimelineData {
    timelineData: any[]
    years: string[]
    ownerKey: string
}

export default function TimelineAnalysis() {
    const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
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
                const result = await response.json()

                console.log('Timeline API Response:', result)

                if (result.success) {
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

    // Convert pivot table to long format
    const longData = useMemo(() => {
        if (!timelineData) return []

        const data: Array<{ owner: string; year: number; count: number }> = []

        timelineData.timelineData.forEach((row) => {
            const owner = row[timelineData.ownerKey]

            // Skip if owner is empty or None
            if (!owner || owner === '' || owner.toLowerCase() === 'none') {
                return
            }

            timelineData.years.forEach((yearStr) => {
                const rawValue = row[yearStr]
                const count = parseInt(rawValue || '0')
                const year = parseInt(yearStr)

                if (count > 0 && year >= 2000 && year <= 2025) {
                    data.push({
                        owner: owner.replace(/"/g, '').trim(),
                        year,
                        count,
                    })
                }
            })
        })

        console.log('Long format data points:', data.length)
        return data
    }, [timelineData])

    // Helper to truncate company names to 2 words
    const truncateName = (name: string) => {
        const words = name.split(' ')
        if (words.length <= 2) return name
        return words.slice(0, 2).join(' ') + '...'
    }

    // 1. Overall timeline - total patents per year
    const overallTimelineData = useMemo(() => {
        if (longData.length === 0) return []

        const yearTotals = new Map<number, number>()

        longData.forEach((item) => {
            const current = yearTotals.get(item.year) || 0
            yearTotals.set(item.year, current + item.count)
        })

        const sortedYears = Array.from(yearTotals.entries()).sort((a, b) => a[0] - b[0])

        return [
            {
                type: 'scatter' as const,
                mode: 'lines+markers' as const,
                x: sortedYears.map(([year]) => year),
                y: sortedYears.map(([, count]) => count),
                line: { color: '#10b981', width: 3 },
                marker: { size: 8, color: '#10b981' },
                name: 'Total Applications',
            },
        ]
    }, [longData])

    // 2. Timeline by top 8 owners - Bubble chart with years on X-axis and owners on Y-axis
    const topOwnersTimelineData = useMemo(() => {
        if (longData.length === 0) return []

        const ownerTotals = new Map<string, number>()
        longData.forEach((item) => {
            const current = ownerTotals.get(item.owner) || 0
            ownerTotals.set(item.owner, current + item.count)
        })

        // Sort owners by total count (descending) so top owner is at the top of the chart
        const topOwners = Array.from(ownerTotals.entries())
            .sort((a, b) => a[1] - b[1])
            .slice(-8) // Take last 8 (which are the top 8)
            .map(([owner]) => owner)

        console.log('Top 8 owners:', topOwners)

        // Create a single trace with all data points
        const xData: number[] = []
        const yData: string[] = [] // Use string for categorical axis
        const sizeData: number[] = []
        const colorData: number[] = []
        const hoverText: string[] = []

        topOwners.forEach((owner) => {
            const ownerData = longData
                .filter((item) => item.owner === owner)
                .sort((a, b) => a.year - b.year)

            ownerData.forEach((d) => {
                xData.push(d.year)
                yData.push(truncateName(owner)) // Truncate name for Y-axis
                // Scale bubble size: min size 8, then proportional to sqrt of count
                sizeData.push(Math.max(8, Math.sqrt(d.count) * 8))
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
                    colorscale: 'Viridis', // More distinct colors
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
    }, [longData])

    // 3. Prepare heatmap data
    const heatmapData = useMemo(() => {
        if (longData.length === 0) return null

        const ownerTotals = new Map<string, number>()
        longData.forEach((item) => {
            const current = ownerTotals.get(item.owner) || 0
            ownerTotals.set(item.owner, current + item.count)
        })

        const topOwners = Array.from(ownerTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([owner]) => owner)

        const allYears = Array.from(new Set(longData.map((d) => d.year))).sort((a, b) => a - b)

        const matrix: number[][] = []
        const yLabels: string[] = []

        topOwners.forEach((owner) => {
            const row: number[] = []
            allYears.forEach((year) => {
                const item = longData.find((d) => d.owner === owner && d.year === year)
                row.push(item ? item.count : 0)
            })
            matrix.push(row)
            yLabels.push(truncateName(owner)) // Truncate name for heatmap Y-axis
        })

        return {
            z: matrix,
            x: allYears,
            y: yLabels,
            type: 'heatmap' as const,
            colorscale: [[0, '#ffffff'], [1, '#0c4a6e']],
            hoverongaps: false,
        }
    }, [longData])

    // Prepare display table (first 10 rows, cleaned)
    const displayData = useMemo(() => {
        if (!timelineData) return []
        return timelineData.timelineData.slice(0, 10).map((row) => {
            const cleanRow: any = {}
            Object.keys(row).forEach((key) => {
                const value = row[key]
                cleanRow[key] =
                    value === null || value === 'None' || value === 'none' || value === '' ? '—' : value
            })
            return cleanRow
        })
    }, [timelineData])

    // Memoize layouts and configs
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
            side: 'bottom' as const, // Standard position
        },
        yaxis: {
            title: 'Current Owner',
            automargin: true, // Automatically adjust margin for long names
            side: 'left' as const,
        },
        autosize: true,
        height: 600,
        plot_bgcolor: '#f9fafb',
        paper_bgcolor: '#ffffff',
        margin: { t: 80, b: 80, r: 20, l: 150 }, // Minimized margins, fixed left for names
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-8">
                <h3 className="text-lg font-semibold text-red-700 mb-2">⚠️ Error Loading Data</h3>
                <p className="text-red-600">{error || 'No data available'}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="text-4xl">📈</span>
                    Timeline Analysis - Current Owner
                </h1>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-900">
                        <strong>Understanding Timeline Analysis:</strong> This section shows patent filing
                        trends over time by current patent owners. Track how innovation activity has evolved
                        and identify key periods of patent activity for different organizations.
                    </p>
                </div>
            </div>

            {/* Retrieved Data Table */}
            <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Retrieved Data for Timeline Analysis</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                                    Current Owner
                                </th>
                                {timelineData.years.map((year, idx) => (
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
                            {displayData.map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-left sticky left-0 bg-white z-10">
                                        {row[timelineData.ownerKey] || ''}
                                    </td>
                                    {timelineData.years.map((year, colIdx) => (
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

            {/* 1. Overall Timeline */}
            {overallTimelineData.length > 0 && overallTimelineData[0]?.x?.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Patent Applications Over Time</h2>
                    <p className="text-gray-600 mb-6 italic">
                        This chart shows the total number of patent applications across all current owners in
                        the dataset by year.
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

            {/* 2. Timeline by Top Owners */}
            {topOwnersTimelineData.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Timeline by Top Current Owners</h2>
                    <p className="text-gray-600 mb-6 italic">Bubble size and color represents patent count</p>

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

            {/* 3. Heatmap */}
            {heatmapData && heatmapData.z.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Patent Activity Heatmap</h2>

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
            <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Patent Data</h2>
                <p className="text-gray-700">
                    This timeline analysis shows patent application trends by current patent owners over
                    time. The data represents the innovation activity and patent filing strategies of
                    different organizations.
                </p>
            </div>
        </div>
    )
}