'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import DataTable from './DataTable'

const BarChart = dynamic(
    () => import('./BarChart'),
    { ssr: false }
)

// Constants
const CHART_LIMIT = 20
const TABLE_MAX_ROWS = 20

// Interfaces
interface AssigneeData {
    country: string
    assignee: string
    count: number
}

interface InventorData {
    country: string
    inventor: string
    count: number
}

interface ProcessedEntityData {
    assigneeData: AssigneeData[]
    inventorData: InventorData[]
}

interface EntityResponse {
    success: boolean
    data?: ProcessedEntityData
    error?: string
    fileInfo?: {
        assigneeCountFile: string | null
        assigneeCountryFile: string | null
        inventorCountFile: string | null
        inventorCountryFile: string | null
        assigneeCountryProcessedFile: string | null
    }
}

export default function EntityAnalysis() {
    const [activeTab, setActiveTab] = useState<'assignee' | 'inventor'>('assignee')
    const [entityData, setEntityData] = useState<ProcessedEntityData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const response = await fetch('/api/entity')
                const result: EntityResponse = await response.json()

                if (result.success && result.data) {
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

    // Prepare assignee data for display
    const assigneeTableData = entityData.assigneeData.map(item => ({
        'Country': item.country || 'Unknown',
        'Assignee': item.assignee,
        'Patent Count': item.count
    }))

    const assigneeChartData = assigneeTableData.slice(0, CHART_LIMIT)
    const hasAssigneeData = assigneeTableData.length > 0

    // Prepare inventor data for display
    const inventorTableData = entityData.inventorData.map(item => ({
        'Country': item.country || 'Unknown',
        'Inventor': item.inventor,
        'Patent Count': item.count
    }))

    const inventorChartData = inventorTableData.slice(0, CHART_LIMIT)
    const hasInventorData = inventorTableData.length > 0

    // Empty state component
    const EmptyState = ({ type }: { type: 'assignee' | 'inventor' }) => (
        <div className="card border-2 border-dashed border-gray-300 bg-gray-50">
            <div className="text-center py-12">
                <span className="text-6xl mb-4 block opacity-50">
                    {type === 'assignee' ? '🏢' : '👨‍🔬'}
                </span>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No {type === 'assignee' ? 'Assignee' : 'Inventor'} Data Available
                </h3>
                <p className="text-gray-500">
                    {type === 'assignee'
                        ? 'No assignee data found in the dataset.'
                        : 'No inventor data found in the dataset.'}
                </p>
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="card">
                <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="text-4xl">👥</span>
                    Entity Analysis
                </h1>

                <div className="info-box mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-blue-900 font-medium mb-2">
                        Understanding Entity Analysis:
                    </p>
                    <p className="text-blue-800 text-sm">
                        This section analyzes patent <strong>assignees</strong> (organizations that own patents)
                        and <strong>inventors</strong> (individuals who created the inventions). The data shows
                        the most active entities in the quantum computing patent landscape.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
                    <button
                        onClick={() => setActiveTab('assignee')}
                        className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'assignee'
                                ? 'text-blue-600 border-b-2 border-blue-600 -mb-0.5'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        aria-current={activeTab === 'assignee' ? 'page' : undefined}
                    >
                        <span className="text-lg mr-2">🏢</span>
                        Assignees (Organizations)
                    </button>
                    <button
                        onClick={() => setActiveTab('inventor')}
                        className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'inventor'
                                ? 'text-blue-600 border-b-2 border-blue-600 -mb-0.5'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        aria-current={activeTab === 'inventor' ? 'page' : undefined}
                    >
                        <span className="text-lg mr-2">👨‍🔬</span>
                        Inventors (Individuals)
                    </button>
                </div>
            </div>

            {/* Assignee Tab Content */}
            {activeTab === 'assignee' && (
                <div className="space-y-8 fade-in">
                    {hasAssigneeData ? (
                        <div className="card">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">
                                Assignee Country Distribution
                            </h2>

                            {/* Assignee Table */}
                            <div className="mb-8">
                                <DataTable
                                    data={assigneeTableData}
                                    title="📊 All Assignees by Country"
                                    filename="Assignee_Country_Count.xlsx"
                                    maxRows={TABLE_MAX_ROWS}
                                />
                            </div>

                            {/* Assignee Bar Chart */}
                            <div className="chart-container">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                                    📊 Top {CHART_LIMIT} Assignees - Patent Portfolio
                                </h3>
                                <BarChart
                                    data={assigneeChartData}
                                    xField="Assignee"
                                    yField="Patent Count"
                                    title="Top Patent Assignees by Country"
                                    orientation="horizontal"
                                    limit={CHART_LIMIT}
                                />
                            </div>
                        </div>
                    ) : (
                        <EmptyState type="assignee" />
                    )}
                </div>
            )}

            {/* Inventor Tab Content */}
            {activeTab === 'inventor' && (
                <div className="space-y-8 fade-in">
                    {hasInventorData ? (
                        <div className="card">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">
                                Inventor Country Distribution
                            </h2>

                            {/* Inventor Table */}
                            <div className="mb-8">
                                <DataTable
                                    data={inventorTableData}
                                    title="📊 All Inventors by Country"
                                    filename="Inventor_Country_Count.xlsx"
                                    maxRows={TABLE_MAX_ROWS}
                                />
                            </div>

                            {/* Inventor Bar Chart */}
                            <div className="chart-container">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                                    📊 Top {CHART_LIMIT} Inventors - Patent Portfolio
                                </h3>
                                <BarChart
                                    data={inventorChartData}
                                    xField="Inventor"
                                    yField="Patent Count"
                                    title="Top Patent Inventors by Country"
                                    orientation="horizontal"
                                    limit={CHART_LIMIT}
                                />
                            </div>
                        </div>
                    ) : (
                        <EmptyState type="inventor" />
                    )}
                </div>
            )}
        </div>
    )
}