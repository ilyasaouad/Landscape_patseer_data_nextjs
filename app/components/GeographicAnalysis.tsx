'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import DataTable from './DataTable'

const GeographicChart = dynamic(
  () => import('./GeographicChart'),
  { ssr: false }
)
const BarChart = dynamic(
  () => import('./BarChart'),
  { ssr: false }
)

interface CountryData {
  country: string
  total: number
}

interface WorldMapData {
  country: string
  code: string
  total: number
}

interface Dataset {
  map: WorldMapData[]
  list: CountryData[]
}

interface SpecialRegionData {
  code: string
  name: string
  total: number
}

interface GeographicData {
  familyData: Dataset
  priorityData: Dataset
  familySpecialRegions: SpecialRegionData[]
  prioritySpecialRegions: SpecialRegionData[]
  // Legacy
  countries: CountryData[]
  worldMap: WorldMapData[]
  filingTrends: any[]
}

export default function GeographicAnalysis() {
  const [geoData, setGeoData] = useState<GeographicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'family' | 'priority'>('family')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/geographic')
        const result = await response.json()

        if (result.success) {
          setGeoData(result.data)
        } else {
          setError(result.error || 'Failed to load geographic data')
        }
      } catch (err) {
        setError('Failed to fetch geographic data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block spinner rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading geographic data...</p>
        </div>
      </div>
    )
  }

  if (error || !geoData) {
    return (
      <div className="card border-l-4 border-red-500 bg-red-50">
        <h3 className="text-xl font-bold text-red-700 mb-2">⚠️ Error Loading Data</h3>
        <p className="text-red-600">{error || 'No data available'}</p>
      </div>
    )
  }

  const currentData = activeTab === 'family' ? geoData.familyData : geoData.priorityData
  const currentSpecialRegions = activeTab === 'family' ? geoData.familySpecialRegions : geoData.prioritySpecialRegions

  // Transform map data
  const mapData = currentData.map.map(item => ({
    countryCode: item.code,
    countryName: item.country,
    iso3: item.code,
    total: item.total
  }))

  // Filter for Nordic Map
  const nordicCodes = ['FIN', 'SWE', 'NOR', 'DNK', 'ISL', 'FI', 'SE', 'NO', 'DK', 'IS']
  const nordicMapData = mapData.filter(item => nordicCodes.includes(item.iso3) || nordicCodes.includes(item.countryCode))

  // Prepare table data
  const countryTableData = currentData.list.map(item => ({
    'Country': item.country,
    'Patents': item.total
  }))

  // Prepare Nordic Table Data (including 0 counts)
  const nordicList = [
    { name: 'Finland', codes: ['FI', 'FIN'] },
    { name: 'Sweden', codes: ['SE', 'SWE'] },
    { name: 'Norway', codes: ['NO', 'NOR'] },
    { name: 'Denmark', codes: ['DK', 'DNK'] },
    { name: 'Iceland', codes: ['IS', 'ISL'] },
  ]

  const nordicTableData = nordicList.map(n => {
    const found = currentData.list.find(c =>
      c.country === n.name ||
      currentData.map.find(m => m.country === c.country && n.codes.includes(m.code))
    )
    return {
      'Country': n.name,
      'Patents': found ? found.total : 0
    }
  }).sort((a, b) => b.Patents - a.Patents)

  return (
    <div className="space-y-6 fade-in">
      <div className="card">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <span className="text-4xl">📍</span>
          Patent Landscape Analysis
        </h1>
        <p className="text-gray-600 text-lg mb-4">
          Explore patent filing trends across regions, assignees, and jurisdictions.
        </p>

        <div className="info-box mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-blue-900 font-medium mb-2">About This Analysis:</p>
          <p className="text-blue-800 text-sm">
            This patent landscape analysis is designed to provide insights and examples of analytical approaches specifically for Class G06N10 (quantum computing technologies). This is just a draft before final analysis.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Geographic Patent Analysis</h2>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Understanding Priority vs Family Countries:</h3>
            <p className="text-gray-700 mb-4 text-sm leading-relaxed">
              The priority country table shows where each invention was first filed. The patent family table shows where the same inventions were later filed internationally. The priority filing itself is not counted again in the family table.
            </p>
            <p className="text-gray-700 mb-4 text-sm leading-relaxed">
              That is why some countries have many priority filings but fewer family filings - most applications start in the priority country, but they are not filed again in that same country when the applicant expands internationally.
            </p>
            <div className="bg-white p-4 rounded border border-gray-200">
              <p className="text-gray-800 text-sm">
                <strong>Example:</strong> Finland (FI) has many priority filings because many inventions originate there, but FI appears less often in the family table since an invention that starts in FI is usually filed later in EP, US, or WO, and not again in FI. As a result, FI ranks high in the Priority Countries tab but low in the family table.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('family')}
            className={`px-6 py-3 font-bold text-sm transition-all rounded-t-lg ${activeTab === 'family'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }`}
          >
            Patent Families
          </button>
          <button
            onClick={() => setActiveTab('priority')}
            className={`px-6 py-3 font-bold text-sm transition-all rounded-t-lg ${activeTab === 'priority'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }`}
          >
            Priority Country
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-12">

          {/* 1. Data Table (Top) */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {activeTab === 'family' ? 'Patent Families Analysis' : 'Priority Country Analysis'}
            </h2>
            <DataTable
              data={countryTableData}
              title={`${activeTab === 'family' ? 'Patent Family' : 'Priority Country'} Filings by Country`}
              filename={`${activeTab}_country_data.xlsx`}
              maxRows={15}
            />
          </div>

          {/* 2. World Map with Special Regions Legend */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Global Distribution
            </h2>

            {/* Special Regions Legend */}
            {currentSpecialRegions && currentSpecialRegions.length > 0 && (
              <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl">🌍</span>
                  <div>
                    <h3 className="text-lg font-bold text-purple-900 mb-1">
                      Special Regions & International Filings
                    </h3>
                    <p className="text-sm text-purple-700">
                      Patent applications filed through regional or international systems (not country-specific)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentSpecialRegions.map((region) => (
                    <div
                      key={region.code}
                      className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          {region.code}
                        </span>
                        <span className="text-2xl font-bold text-purple-900">
                          {region.total.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        {region.name}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-purple-200">
                  <p className="text-xs text-purple-600">
                    💡 <strong>Note:</strong> These filings are not included in the country-specific map below, as they represent regional or international patent applications rather than national filings.
                  </p>
                </div>
              </div>
            )}

            <div className="chart-container">
              <GeographicChart
                key={`global-${activeTab}`}
                data={mapData}
                title={`Global Patent Filings (${activeTab === 'family' ? 'Families' : 'Priority'})`}
                colorscale="OrRd"
                scope="world"
              />
            </div>
          </div>

          {/* 3. Horizontal Bar Chart */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {activeTab === 'family' ? 'Patent Family' : 'Priority Country'} Filings by Country
            </h2>
            <div className="chart-container">
              <BarChart
                data={currentData.list.map(item => ({
                  Country: item.country,
                  Count: item.total
                }))}
                xField="Country"
                yField="Count"
                title={`Top Countries by ${activeTab === 'family' ? 'Family Size' : 'Priority Filings'}`}
                orientation="horizontal"
                limit={15}
              />
            </div>
          </div>

          {/* 4. Nordic Data Section */}
          <div className="space-y-12">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Nordic Data – {activeTab === 'family' ? 'Patent Family' : 'Priority Country'} Filings
            </h2>

            {/* Nordic Map */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Nordic Region Map</h3>
              <div className="chart-container">
                <GeographicChart
                  key={`nordic-${activeTab}`}
                  data={nordicMapData}
                  title={`Nordic Distribution (${activeTab === 'family' ? 'Families' : 'Priority'})`}
                  colorscale="Blues"
                  scope="europe"
                />
              </div>
            </div>

            {/* Nordic Table */}
            <div>
              <DataTable
                data={nordicTableData}
                title="Nordic Countries Data"
                filename={`${activeTab}_nordic_data.xlsx`}
                maxRows={10}
              />
            </div>

            {/* Nordic Bar Chart */}
            <div className="chart-container">
              <BarChart
                data={nordicTableData.map(item => ({
                  Country: item.Country,
                  Count: item.Patents
                }))}
                xField="Country"
                yField="Count"
                title="Nordic Countries Comparison"
                orientation="horizontal"
                limit={10}
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}