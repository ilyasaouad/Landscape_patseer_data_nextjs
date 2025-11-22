'use client'

import React from 'react'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'

interface DataTableProps {
    data: Array<{ [key: string]: any }>
    title: string
    filename?: string
    maxRows?: number
}

export default function DataTable({ data, title, filename, maxRows = 10 }: DataTableProps) {
    const handleDownload = () => {
        if (!data || data.length === 0) return

        // Create worksheet from data
        const worksheet = XLSX.utils.json_to_sheet(data)

        // Create workbook
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

        // Generate filename
        const downloadFilename = filename || `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`

        // Download file
        XLSX.writeFile(workbook, downloadFilename)
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
                <p>No data available</p>
            </div>
        )
    }

    const headers = Object.keys(data[0])
    const displayData = data.slice(0, maxRows)

    return (
        <div className="space-y-3">
            {/* Header with download button */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                    title="Download as Excel"
                >
                    <Download size={18} />
                    <span className="text-sm font-medium">Download Excel</span>
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100">
                        <tr>
                            {headers.map((header) => (
                                <th
                                    key={header}
                                    className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200"
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {displayData.map((row, i) => (
                            <tr key={i} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                {headers.map((header, j) => (
                                    <td key={j} className="px-4 py-3 text-gray-700">
                                        {typeof row[header] === 'number'
                                            ? row[header].toLocaleString()
                                            : String(row[header] || '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Show count info */}
            <div className="text-sm text-gray-500 text-right">
                Showing {displayData.length} of {data.length} rows
                {data.length > maxRows && ' (download Excel for full data)'}
            </div>
        </div>
    )
}
