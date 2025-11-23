'use client'

import React, { useEffect, useState, useMemo, memo } from 'react'
import dynamic from 'next/dynamic'
import { Data } from 'plotly.js'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface CountryData {
  countryCode: string
  countryName: string
  iso3: string | null
  total: number
}

interface GeographicChartProps {
  data: CountryData[]
  title: string
  colorscale?: 'OrRd' | 'Purples' | 'Blues' | 'Viridis'
  scope?: 'world' | 'europe'
}

interface GeoLayout {
  title: {
    text: string
    font: { size: number; family: string }
  }
  geo: {
    showframe: boolean
    showcoastlines: boolean
    projection: { type: string }
    scope?: string
  }
  margin: { l: number; r: number; t: number; b: number }
  height: number
  responsive: boolean
}

const COLORSCALES: { [key: string]: string } = {
  OrRd: 'Reds',
  Purples: 'Purples',
  Blues: 'Blues',
  Viridis: 'Viridis',
}

const GeographicChartComponent = memo(function GeographicChart({
  data,
  title,
  colorscale = 'OrRd',
  scope = 'world',
}: GeographicChartProps) {
  const [plotData, setPlotData] = useState<Data[]>([])
  const [layout, setLayout] = useState<GeoLayout | {}>({})
  const [error, setError] = useState<string | null>(null)

  const processedGeoData = useMemo(() => {
    if (!data || data.length === 0) return null

    try {
      const validData = data.filter(
        (item) => item.iso3 && item.total !== undefined
      )

      if (validData.length === 0) {
        throw new Error('No valid geographic data with ISO-3 codes')
      }

      const locations = validData.map((item) => item.iso3)
      const values = validData.map((item) => item.total)
      const text = validData.map(
        (item) => `${item.countryName} (${item.countryCode})<br>Patents: ${item.total}`
      )

      return { locations, values, text }
    } catch (err) {
      setError(
        `Error processing data: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
      return null
    }
  }, [data])

  useEffect(() => {
    if (!processedGeoData) {
      setPlotData([])
      return
    }

    try {
      const { locations, values, text } = processedGeoData

      const choroplethData: Partial<Data> = {
        type: 'choropleth',
        locationmode: 'ISO-3',
        locations: locations as string[],
        z: values as number[],
        text: text as string[],
        hovertemplate: '%{text}<extra></extra>',
        colorscale: COLORSCALES[colorscale] || 'Reds',
        showscale: true,
        colorbar: {
          title: { text: 'Patent Count', side: 'right' },
        },
      }

      const mapLayout: GeoLayout = {
        title: {
          text: title,
          font: { size: 16, family: 'Arial, sans-serif' },
        },
        geo: {
          showframe: false,
          showcoastlines: true,
          projection: { type: 'natural earth' },
          ...(scope === 'europe' && { scope: 'europe' }),
        },
        margin: { l: 0, r: 0, t: 50, b: 0 },
        height: scope === 'europe' ? 600 : 500,
        responsive: true,
      }

      setPlotData([choroplethData as Data])
      setLayout(mapLayout)
      setError(null)
    } catch (err) {
      setError(
        `Error rendering chart: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
      setPlotData([])
    }
  }, [processedGeoData, title, colorscale, scope])

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200 p-4"
        role="alert"
      >
        <p className="text-red-600 font-medium mb-2">Error Loading Map</p>
        <p className="text-red-500 text-sm text-center">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200"
        role="status"
      >
        <p className="text-gray-500">No geographic data available</p>
      </div>
    )
  }

  return (
    <div
      className="w-full rounded-lg border border-gray-200 bg-white overflow-hidden"
      role="region"
      aria-label={`${title} geographic map`}
    >
      <Plot
        data={plotData}
        layout={layout}
        config={{
          displayModeBar: true,
          displaylogo: false,
          responsive: true,
          modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
        }}
        style={{
          width: '100%',
          height: `${(layout as any)?.height || 500}px`,
        }}
      />
    </div>
  )
})

export default GeographicChartComponent