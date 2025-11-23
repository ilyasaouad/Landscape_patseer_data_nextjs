'use client'

import React, { useEffect, useState } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
} from 'recharts'

interface ClassificationData {
    ipcFull: Array<{ classification: string; total: number }>
    cpcFull: Array<{ classification: string; total: number }>
    ipcByOwner: Array<Record<string, any>>
    cpcByOwner: Array<Record<string, any>>
    cpcByYear: Array<Record<string, any>>
    ipcByYear: Array<Record<string, any>>
}

export default function ClassificationAnalysis() {
    const [data, setData] = useState<ClassificationData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'ipc' | 'cpc'>('ipc')

    useEffect(() => {
        fetchClassificationData()
    }, [])

    const fetchClassificationData = async () => {
        try {
            setLoading(true)
            setError(null)

            console.log('Fetching classification data...')
            const response = await fetch('/api/classification')
            console.log('Response status:', response.status)

            const result = await response.json()
            console.log('API Response:', result)

            if (result.success && result.data) {
                console.log('Data loaded successfully:', {
                    ipcFull: result.data.ipcFull?.length,
                    cpcFull: result.data.cpcFull?.length,
                    ipcByOwner: result.data.ipcByOwner?.length,
                    cpcByOwner: result.data.cpcByOwner?.length,
                    ipcByYear: result.data.ipcByYear?.length,
                    cpcByYear: result.data.cpcByYear?.length,
                })

                if (result.debug) {
                    console.log('Debug Info:', result.debug)
                }

                setData(result.data)
            } else {
                let errorMsg = result.error || 'Failed to load classification data'

                if (result.debug) {
                    console.log('Debug Info:', result.debug)
                    errorMsg += '\n\nFiles found: ' + (result.debug.filesFound?.join(', ') || 'none')
                    errorMsg += '\nFiles not found: ' + (result.debug.filesNotFound?.join(', ') || 'none')
                }

                console.error('API Error:', errorMsg)
                setError(errorMsg)
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'An error occurred'
            console.error('Fetch Error:', err)
            setError(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading classification data...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-red-800 font-semibold">Error Loading Data</h3>
                    <p className="text-red-600 mt-2">{error}</p>
                    <button
                        onClick={fetchClassificationData}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">No classification data available.</p>
                    <button
                        onClick={fetchClassificationData}
                        className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    const hasIpcData = (data.ipcFull && data.ipcFull.length > 0) || (data.ipcByOwner && data.ipcByOwner.length > 0)
    const hasCpcData = (data.cpcFull && data.cpcFull.length > 0) || (data.cpcByOwner && data.cpcByOwner.length > 0)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">IPC and CPC Classification Analysis</h1>
                <p className="mt-2 text-gray-600">
                    Analyze patent classification data for current owners
                </p>
            </div>

            {/* Educational Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-blue-900 font-semibold mb-2">💡 Why Patents Have Multiple Classifications</h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                    A single patent application often covers multiple classification codes because modern inventions
                    typically involve several related technologies or technical areas. For example:
                </p>
                <ul className="mt-2 text-blue-800 text-sm space-y-1 list-disc list-inside">
                    <li>A <strong>quantum computer patent</strong> might include classifications for: quantum computing (G06N),
                        semiconductor devices (H01L), and data processing (G06F)</li>
                    <li>A <strong>medical device patent</strong> might span: diagnostic equipment (A61B),
                        data analysis (G06F), and wireless communication (H04L)</li>
                </ul>
                <p className="mt-2 text-blue-800 text-sm">
                    This multi-classification approach ensures patents are discoverable by researchers working in any
                    of the related technical fields and reflects the interdisciplinary nature of modern innovation.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('ipc')}
                    className={`px-6 py-3 font-bold text-sm transition-all rounded-t-lg ${activeTab === 'ipc'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                        }`}
                >
                    IPC Analysis
                </button>
                <button
                    onClick={() => setActiveTab('cpc')}
                    className={`px-6 py-3 font-bold text-sm transition-all rounded-t-lg ${activeTab === 'cpc'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                        }`}
                >
                    CPC Analysis
                </button>
            </div>

            {activeTab === 'ipc' && (
                <div className="space-y-8">
                    {!hasIpcData && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-yellow-800">No IPC data available. Please check if the CSV files exist.</p>
                        </div>
                    )}

                    {/* Top 10 IPC Classifications */}
                    {data.ipcFull && data.ipcFull.length > 0 && (
                        <section className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Top 10 IPC Classifications</h2>

                            {/* Data Table */}
                            <div className="overflow-x-auto mb-6">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Classification
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total Records
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {data.ipcFull.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm text-gray-900">{item.classification}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{item.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bar Chart */}
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[...data.ipcFull].sort((a, b) => b.total - a.total)}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis
                                            dataKey="classification"
                                            type="category"
                                            width={180}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <Tooltip />
                                        <Bar dataKey="total" fill="#8884d8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </section>
                    )}

                    {/* Top 15 Owners - IPC */}
                    {data.ipcByOwner && data.ipcByOwner.length > 0 && (
                        <section className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Top 15 Current Owners - Top 5 IPC Classifications
                            </h2>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                                <h3 className="text-gray-900 font-semibold mb-2">IPC Classification Descriptions:</h3>
                                <ul className="space-y-2 text-sm text-gray-700">
                                    <li><strong>G06N10/40:</strong> Physical realisations or architectures of quantum processors or components for manipulating qubits, e.g. qubit coupling or qubit control</li>
                                    <li><strong>G06N10/00:</strong> Quantum computing, i.e. information processing based on quantum-mechanical phenomena</li>
                                    <li><strong>H10N69/00:</strong> Integrated devices, or assemblies of multiple devices, comprising at least one superconducting element covered by group</li>
                                    <li><strong>G06N10/20:</strong> Models of quantum computing, e.g. quantum circuits or universal quantum computers</li>
                                    <li><strong>B82Y10/00:</strong> Nanotechnology for information processing, storage or transmission, e.g. quantum computing or single electron logic</li>
                                </ul>
                            </div>

                            <OwnerClassificationTable data={data.ipcByOwner} type="IPC" />

                            {data.ipcByOwner.length >= 8 && (
                                <div className="mt-8">
                                    <GroupedBarChart data={data.ipcByOwner.slice(0, 8)} type="IPC" />
                                </div>
                            )}

                            <div className="mt-8">
                                <Heatmap data={data.ipcByOwner} type="IPC" />
                            </div>
                        </section>
                    )}

                    {/* Temporal Analysis - IPC */}
                    {data.ipcByYear && data.ipcByYear.length > 0 && (
                        <section className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Temporal Analysis - IPC Classifications Over Time
                            </h2>

                            <TemporalChart data={data.ipcByYear} />

                            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    📝 <strong>Note:</strong> The apparent decline in patent applications towards the end of 2025
                                    is likely due to incomplete data, as not all patent applications for that year have been
                                    published yet. Patent publication typically occurs 18 months after the filing date.
                                </p>
                            </div>
                        </section>
                    )}
                </div>
            )}

            {/* CPC Tab Content */}
            {activeTab === 'cpc' && (
                <div className="space-y-8">
                    {!hasCpcData && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-yellow-800">No CPC data available. Please check if the CSV files exist.</p>
                        </div>
                    )}

                    {/* Top 10 CPC Classifications */}
                    {data.cpcFull && data.cpcFull.length > 0 && (
                        <section className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">🏷️ Top 10 CPC Classifications</h2>

                            {/* Data Table */}
                            <div className="overflow-x-auto mb-6">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Classification
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total Records
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {data.cpcFull.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm text-gray-900">{item.classification}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{item.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bar Chart */}
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[...data.cpcFull].sort((a, b) => b.total - a.total)}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis
                                            dataKey="classification"
                                            type="category"
                                            width={180}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <Tooltip />
                                        <Bar dataKey="total" fill="#ff6b6b" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </section>
                    )}

                    {/* Top 15 Owners - CPC */}
                    {data.cpcByOwner && data.cpcByOwner.length > 0 && (
                        <section className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Top 15 Current Owners - Top 5 CPC Classifications
                            </h2>

                            <OwnerClassificationTable data={data.cpcByOwner} type="CPC" />

                            {data.cpcByOwner.length >= 8 && (
                                <div className="mt-8">
                                    <GroupedBarChart data={data.cpcByOwner.slice(0, 8)} type="CPC" />
                                </div>
                            )}

                            <div className="mt-8">
                                <Heatmap data={data.cpcByOwner} type="CPC" />
                            </div>
                        </section>
                    )}

                    {/* Example Analysis - Top Company */}
                    <section className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-green-900 mb-4">4. Example Analysis - Top Company</h3>
                        <h4 className="font-semibold text-green-800 mb-2">📋 Example Analysis (Not Deep Analysis)</h4>

                        <div className="mb-4">
                            <p className="text-green-800"><strong>Company:</strong> IQM FINLAND OY</p>
                            <p className="text-green-800"><strong>Total Patents:</strong> 92</p>
                        </div>

                        <div className="mb-4">
                            <p className="font-semibold text-green-800 mb-2">Top Classification Areas:</p>
                            <p className="text-green-800 text-sm mb-2">IQM FINLAND OY shows patent activity across 5 different CPC classifications:</p>
                            <ol className="list-decimal list-inside text-green-800 text-sm space-y-1 ml-2">
                                <li><strong>G06N10/40:</strong> 56 patents (60.9% of portfolio)</li>
                                <li><strong>H10N69/00:</strong> 25 patents (27.2% of portfolio)</li>
                                <li><strong>G06N10/20:</strong> 20 patents (21.7% of portfolio)</li>
                                <li><strong>G06N10/00:</strong> 17 patents (18.5% of portfolio)</li>
                                <li><strong>B82Y10/00:</strong> 6 patents (6.5% of portfolio)</li>
                            </ol>
                        </div>

                        <div className="mb-4">
                            <p className="font-semibold text-green-800 mb-1">📊 Simple Interpretation:</p>
                            <p className="text-green-800 text-sm">
                                IQM FINLAND OY has a highly concentrated patent portfolio with 60.9% of patents in G06N10/40.
                            </p>
                            <p className="text-green-800 text-sm mt-1">
                                <strong>Pattern:</strong> The company shows strong specialization across 5 classification areas.
                            </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-green-200">
                            <p className="text-green-800 text-xs italic">
                                ⚠️ <strong>Note:</strong> This is a basic example analysis showing how to interpret classification connections. A NOT comprehensive analysis.
                            </p>
                        </div>
                    </section>

                    {/* Temporal Analysis */}
                    {data.cpcByYear && data.cpcByYear.length > 0 && (
                        <section className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Temporal Analysis - CPC Classifications Over Time
                            </h2>

                            <TemporalChart data={data.cpcByYear} />

                            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    📝 <strong>Note:</strong> The apparent decline in patent applications towards the end of 2025
                                    is likely due to incomplete data, as not all patent applications for that year have been
                                    published yet. Patent publication typically occurs 18 months after the filing date.
                                </p>
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    )
}

// Owner Classification Table Component
function OwnerClassificationTable({ data, type }: { data: Array<Record<string, any>>, type: string }) {
    if (!data || data.length === 0) return null

    const classificationKeys = Object.keys(data[0] || {}).filter(
        key => key !== 'currentOwner' && key !== 'total'
    )

    if (classificationKeys.length === 0) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">No classification data available for owners.</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Current Owner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                        </th>
                        {classificationKeys.map((key) => (
                            <th
                                key={key}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                {key}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.currentOwner}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{row.total?.toLocaleString() || 0}</td>
                            {classificationKeys.map((key) => (
                                <td key={key} className="px-6 py-4 text-sm text-gray-900">
                                    {row[key]?.toLocaleString() || 0}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// Grouped Bar Chart Component
function GroupedBarChart({ data, type }: { data: Array<Record<string, any>>, type: string }) {
    if (!data || data.length === 0) return null

    const classificationKeys = Object.keys(data[0] || {}).filter(
        key => key !== 'currentOwner' && key !== 'total'
    )

    const chartData = data.map(row => {
        const newRow: any = { name: row.currentOwner }
        classificationKeys.forEach(key => {
            newRow[key] = row[key] || 0
        })
        return newRow
    })

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042']

    return (
        <div className="h-96">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribution by Owner</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {classificationKeys.map((key, index) => (
                        <Bar key={key} dataKey={key} fill={colors[index % colors.length]} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

// Heatmap Component
function Heatmap({ data, type }: { data: Array<Record<string, any>>, type: string }) {
    if (!data || data.length === 0) return null

    const classificationKeys = Object.keys(data[0] || {}).filter(
        key => key !== 'currentOwner' && key !== 'total'
    )

    // Calculate max value for color scaling
    let maxValue = 0
    data.forEach(row => {
        classificationKeys.forEach(key => {
            if (row[key] > maxValue) maxValue = row[key]
        })
    })

    const getColor = (value: number) => {
        if (value === 0) return '#f3f4f6' // gray-100
        const intensity = Math.min(value / maxValue, 1)
        // Blue scale
        const r = Math.round(255 - (255 - 37) * intensity) // 37 is blue-600 r
        const g = Math.round(255 - (255 - 99) * intensity) // 99 is blue-600 g
        const b = Math.round(255 - (255 - 235) * intensity) // 235 is blue-600 b
        return `rgb(${r}, ${g}, ${b})`
    }

    return (
        <div className="overflow-x-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Concentration Heatmap</h3>
            <div className="min-w-full">
                <div className="grid" style={{ gridTemplateColumns: `auto repeat(${classificationKeys.length}, 1fr)` }}>
                    {/* Header Row */}
                    <div className="p-2 font-medium text-gray-500 text-xs">Owner</div>
                    {classificationKeys.map(key => (
                        <div key={key} className="p-2 font-medium text-gray-500 text-xs text-center break-all">
                            {key}
                        </div>
                    ))}

                    {/* Data Rows */}
                    {data.map((row, idx) => (
                        <React.Fragment key={idx}>
                            <div className="p-2 text-sm font-medium text-gray-900 border-t border-gray-100">
                                {row.currentOwner}
                            </div>
                            {classificationKeys.map(key => (
                                <div
                                    key={key}
                                    className="p-2 text-xs text-center border-t border-gray-100 flex items-center justify-center"
                                    style={{ backgroundColor: getColor(row[key] || 0), color: (row[key] || 0) > maxValue / 2 ? 'white' : 'black' }}
                                    title={`${row.currentOwner} - ${key}: ${row[key] || 0}`}
                                >
                                    {row[key] || 0}
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Temporal Chart Component
function TemporalChart({ data }: { data: Array<Record<string, any>> }) {
    if (!data || data.length === 0) return null

    const classificationKeys = Object.keys(data[0] || {}).filter(
        key => key !== 'year' && key !== 'total'
    )

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042']

    return (
        <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {classificationKeys.map((key, index) => (
                        <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={colors[index % colors.length]}
                            activeDot={{ r: 8 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}