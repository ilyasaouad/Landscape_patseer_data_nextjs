'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface BarChartProps {
    data: Array<{ [key: string]: any }>
    xField: string
    yField: string
    title: string
    orientation?: 'horizontal' | 'vertical'
    limit?: number
}

export default function BarChart({
    data,
    xField,
    yField,
    title,
    orientation = 'vertical',
    limit = 20,
}: BarChartProps) {
    // Sort and limit data
    const sortedData = [...data]
        .sort((a, b) => b[yField] - a[yField])
        .slice(0, limit)

    // For horizontal charts, reverse the order so largest is at the top
    const displayData = orientation === 'horizontal' ? [...sortedData].reverse() : sortedData

    const plotData = [
        {
            type: 'bar' as const,
            x: orientation === 'horizontal' ? displayData.map(d => d[yField]) : displayData.map(d => d[xField]),
            y: orientation === 'horizontal' ? displayData.map(d => d[xField]) : displayData.map(d => d[yField]),
            orientation: orientation === 'horizontal' ? 'h' : 'v',
            marker: {
                color: '#3b82f6',
                line: {
                    color: '#1e40af',
                    width: 1,
                },
            },
        },
    ]

    const layout = {
        title: {
            text: title,
            font: { size: 16, color: '#1f2937' },
        },
        xaxis: {
            title: orientation === 'horizontal' ? yField : xField,
            tickangle: orientation === 'vertical' ? -45 : 0,
            automargin: true,
            rangemode: orientation === 'horizontal' ? 'tozero' : undefined,
        },
        yaxis: {
            title: orientation === 'horizontal' ? xField : yField,
            automargin: true,
            ticksuffix: orientation === 'horizontal' ? '       ' : '',  // Add spaces after labels for padding
        },
        margin: {
            l: orientation === 'horizontal' ? 300 : 150,  // Extra space for horizontal chart labels
            r: 50,
            t: 80,
            b: orientation === 'vertical' ? 150 : 80
        },
        height: orientation === 'horizontal' ? Math.max(400, displayData.length * 30) : 500,
        plot_bgcolor: '#f9fafb',
        paper_bgcolor: '#ffffff',
        bargap: 0.3,  // Gap between bars
    }

    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    }

    return (
        <div className="w-full">
            <Plot data={plotData} layout={layout} config={config} className="w-full" />
        </div>
    )
}
