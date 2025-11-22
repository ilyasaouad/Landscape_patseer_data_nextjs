'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import DataTable from './DataTable'

const BarChart = dynamic(
    () => import('./BarChart'),
    { ssr: false }
)

interface EntityData {
    assigneeCount: any[]
    assigneeCountry: any[]
    inventorCount: any[]
    inventorCountry: any[]
    assigneeCountryProcessed: any[]
}

export default function EntityAnalysis() {
    const [activeTab, setActiveTab] = useState<'assignee' | 'inventor'>('assignee')
    const [entityData, setEntityData] = useState<EntityData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const response = await fetch('/api/entity')
                const result = await response.json()

                if (result.success) {
                    setEntityData(result.data)
                } else {
                    setError(result.error || 'Failed to load entity data')
                }
            } catch (err) {
                setError('Failed to fetch entity data')
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
                    <p className="text-gray-600 font-medium">Loading entity data...</p>
                </div>
            </div>
        )
    }

    if (error || !entityData) {
        return (
            <div className="card border-l-4 border-red-500 bg-red-50">
                <h3 className="text-xl font-bold text-red-700 mb-2">⚠️ Error Loading Data</h3>
                <p className="text-red-600">{error || 'No data available'}</p>
            </div>
        )
    }

    // Prepare assignee data - CSV columns: Country, Assignee, Count
    // Don't add country prefix since it's already in the Country column
    const assigneeTableData = entityData.assigneeCountryProcessed?.map(item => ({
        'Country': item.Country || item.country || '',
        'Assignee': item.Assignee || item.assignee || 'Unknown',
        'Patent Count': parseInt(item.Count || item.count || '0')
    })).filter(item => item['Patent Count'] > 0) || []

    const assigneeChartData = assigneeTableData.slice(0, 20)

    // Prepare inventor data - CSV columns: Inventor, Country
    // Group by inventor and count occurrences
    const inventorMap = new Map<string, { country: string, count: number }>()

    entityData.inventorCountry?.forEach(item => {
        const inventor = item.Inventor || item.inventor || ''
        const country = (item.Country || item.country || '').trim()

        if (inventor) {
            if (inventorMap.has(inventor)) {
                const existing = inventorMap.get(inventor)!
                existing.count += 1
            } else {
                inventorMap.set(inventor, { country, count: 1 })
            }
        }
    })

    const inventorTableData = Array.from(inventorMap.entries())
        .map(([name, data]) => ({
            'Country': data.country,
            'Inventor': name,
            'Patent Count': data.count
        }))
        .sort((a, b) => b['Patent Count'] - a['Patent Count'])

    const inventorChartData = inventorTableData.slice(0, 20)

    return (
        <div className="space-y-6">
            <div className="card">
                <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="text-4xl">👥</span>
                    Entity Analysis
                </h1>

                <div className="info-box mb-6">
                    <p className="text-blue-900">
                        <strong>Understanding Entity Analysis:</strong> This section analyzes patent assignees
                        (organizations that own patents) and inventors (individuals who created the inventions).
                        The data shows the most active entities in the quantum computing patent landscape.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
                    <button
                        onClick={() => setActiveTab('assignee')}
                        className={`tab-button ${activeTab === 'assignee' ? 'active' : ''}`}
                    >
                        <span className="text-lg mr-2">🏢</span>
                        Assignees (Organizations)
                    </button>
                    <button
                        onClick={() => setActiveTab('inventor')}
                        className={`tab-button ${activeTab === 'inventor' ? 'active' : ''}`}
                    >
                        <span className="text-lg mr-2">👨‍🔬</span>
                        Inventors (Individuals)
                    </button>
                </div>
            </div>

            {/* Assignee Tab Content */}
            {activeTab === 'assignee' && (
                <div className="space-y-8 fade-in">
                    <div className="card">
                        <h2 className="card-header">Assignee Country Distribution</h2>

                        {/* Assignee Table */}
                        <div className="mb-8">
                            <DataTable
                                data={assigneeTableData}
                                title="📊 All Assignees by Country"
                                filename="Assignee_Country_Count_Updated.xlsx"
                                maxRows={20}
                            />
                        </div>

                        {/* Assignee Bar Chart */}
                        {assigneeChartData.length > 0 && (
                            <div className="chart-container">
                                <h3 className="chart-title">📊 Top 20 Assignees - Patent Portfolio</h3>
                                <BarChart
                                    data={assigneeChartData}
                                    xField="Assignee"
                                    yField="Patent Count"
                                    title="Top Patent Assignees by Country"
                                    orientation="horizontal"
                                    limit={20}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Inventor Tab Content */}
            {activeTab === 'inventor' && (
                <div className="space-y-8 fade-in">
                    <div className="card">
                        <h2 className="card-header">Inventor Country Distribution</h2>

                        {/* Inventor Table */}
                        <div className="mb-8">
                            <DataTable
                                data={inventorTableData}
                                title="📊 All Inventors by Country"
                                filename="Inventor_Country_Count.xlsx"
                                maxRows={20}
                            />
                        </div>

                        {/* Inventor Bar Chart */}
                        {inventorChartData.length > 0 && (
                            <div className="chart-container">
                                <h3 className="chart-title">📊 Top 20 Inventors - Patent Portfolio</h3>
                                <BarChart
                                    data={inventorChartData}
                                    xField="Inventor"
                                    yField="Patent Count"
                                    title="Top Patent Inventors by Country"
                                    orientation="horizontal"
                                    limit={20}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
