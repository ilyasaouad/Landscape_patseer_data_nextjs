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
  countryCode: string
  countryName: string
  iso3: string | null
  total: number
}

interface TabContentProps {
  title: string
  worldTitle: string
  countriesTitle: string
  nordicTitle: string
  nordicMapTitle: string
  nordicBarTitle: string
  data: CountryData[]
  nordicData: CountryData[]
  colorscale: 'OrRd' | 'Purples' | 'Blues'
  tabType: 'family' | 'priority'
}

function TabContent({
  title,
  worldTitle,
  countriesTitle,
  nordicTitle,
  nordicMapTitle,
  nordicBarTitle,
  data,
  nordicData,
  colorscale,
  tabType,
}: TabContentProps) {
  // Transform data for the main table
  const tableData = data.map(item => ({
    'Country Code': item.countryCode,
    'Country Name': item.countryName,
    'Patents': item.total,
  }))

  // Transform Nordic data for the Nordic table
  const nordicTableData = nordicData.map(item => ({
    'Country Code': item.countryCode,
    'Country Name': item.countryName,
    'Patents': item.total,
  }))

  return (
    <div className="space-y-8 fade-in">
      <div className="card">
        <h2 className="card-header">{title}</h2>

        {/* Data Table with Download */}
        <div className="mb-8">
          <DataTable
            data={tableData}
            title="📊 Country Data Overview"
            filename={`${tabType}_countries_data.xlsx`}
            maxRows={10}
          />
        </div>

        {/* World Map */}
        <div className="chart-container">
          <h3 className="chart-title">🗺️ {worldTitle}</h3>
          <GeographicChart
            data={data}
            title={worldTitle}
            colorscale={colorscale}
            scope="world"
          />
        </div>

        {/* Bar Chart - All Countries */}
        <div className="chart-container">
          <h3 className="chart-title">📊 {countriesTitle}</h3>
          <BarChart
            data={data.map((item) => ({
              Country: item.countryName,
              Count: item.total,
            }))}
            xField="Country"
            yField="Count"
            title={countriesTitle}
            orientation="horizontal"
            limit={20}
          />
        </div>

        {/* Nordic Section */}
        <div className="section-divider">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-3xl">🌟</span>
            {nordicTitle}
          </h2>

          {/* Nordic Data Table with Download */}
          <div className="mb-8">
            <DataTable
              data={nordicTableData}
              title="📊 Nordic Countries Data"
              filename={`${tabType}_nordic_countries_data.xlsx`}
              maxRows={10}
            />
          </div>

          {/* Nordic Map */}
          <div className="chart-container">
            <h3 className="chart-title">🗺️ {nordicMapTitle}</h3>
            <GeographicChart
              data={nordicData}
              title={nordicMapTitle}
              colorscale={colorscale}
              scope="europe"
            />
          </div>

          {/* Nordic Bar Chart */}
          <div className="chart-container">
            <h3 className="chart-title">📊 {nordicBarTitle}</h3>
            <BarChart
              data={nordicData.map((item) => ({
                Country: item.countryName,
                Count: item.total,
              }))}
              xField="Country"
              yField="Count"
              title={nordicBarTitle}
              orientation="horizontal"
              limit={10}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GeographicAnalysis() {
  const [activeTab, setActiveTab] = useState<'family' | 'priority'>('family')
  const [geoData, setGeoData] = useState<{
    familyData: CountryData[]
    priorityData: CountryData[]
    nordicFamilyData: CountryData[]
    nordicPriorityData: CountryData[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <span className="text-4xl">📍</span>
          Geographic Patent Analysis
        </h1>

        <div className="info-box mb-6">
          <p className="text-blue-900">
            <strong>Understanding Priority vs Family Countries:</strong> The priority country
            table shows where each invention was first filed. The patent family table shows
            where the same inventions were later filed internationally. The priority filing
            itself is not counted again in the family table.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
          <button
            onClick={() => setActiveTab('family')}
            className={`tab-button ${activeTab === 'family' ? 'active' : ''}`}
          >
            <span className="text-lg mr-2">📍</span>
            Patent Families
          </button>
          <button
            onClick={() => setActiveTab('priority')}
            className={`tab-button ${activeTab === 'priority' ? 'active' : ''}`}
          >
            <span className="text-lg mr-2">🌍</span>
            Priority Countries
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'family' && (
        <TabContent
          title="Patent Families Analysis"
          worldTitle="Global Map – Patent Family Filings"
          countriesTitle="Patent Family Filings by Country"
          nordicTitle="Nordic Data – Patent Family Filings"
          nordicMapTitle="Nordic Map – Patent Family Filings"
          nordicBarTitle="Patent Family Filings by Nordic Country"
          data={geoData.familyData}
          nordicData={geoData.nordicFamilyData}
          colorscale="OrRd"
          tabType="family"
        />
      )}

      {activeTab === 'priority' && (
        <TabContent
          title="Priority Countries Analysis"
          worldTitle="Global Map – Priority Countries"
          countriesTitle="Priority Filings by Country"
          nordicTitle="Nordic Data – Priority Countries"
          nordicMapTitle="Nordic Map – Priority Countries"
          nordicBarTitle="Priority Filings by Nordic Country"
          data={geoData.priorityData}
          nordicData={geoData.nordicPriorityData}
          colorscale="Purples"
          tabType="priority"
        />
      )}
    </div>
  )
}