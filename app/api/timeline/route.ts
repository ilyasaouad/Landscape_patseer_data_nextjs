export const runtime = "nodejs";

// app/api/timeline/route.ts
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

// Constants
const YEAR_RANGE = {
    MIN: 2000,
    MAX: 2030
} as const

const TOP_OWNERS_LIMIT = 8
const DISPLAY_ROWS_LIMIT = 10

const DATA_DIRS = {
    RAW: 'raw',
    PROCESSED: 'processed'
} as const

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

type TimelineResponse =
    | {
        success: true
        data: ProcessedTimelineData
    }
    | {
        success: false
        error: string
    }

// Utility Functions
function removeBOM(content: string): string {
    return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content
}

function isValidOwnerName(owner: string | null | undefined): boolean {
    if (!owner) return false
    const normalized = owner.trim().toLowerCase()
    return normalized !== '' && normalized !== 'none' && normalized !== 'null' && normalized !== 'unknown'
}

function truncateOwnerName(name: string): string {
    const words = name.split(' ')
    if (words.length <= 2) return name
    return words.slice(0, 2).join(' ') + '...'
}

function loadCsvData(filename: string, dir: string = DATA_DIRS.RAW): any[] {
    try {
        const filePath = path.join(process.cwd(), 'data', dir, filename)
        console.log(`Loading CSV: ${filePath}`)

        if (!fs.existsSync(filePath)) {
            throw new Error(`Required file not found: ${filename}`)
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const content = removeBOM(fileContent)

        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        })

        console.log(`✓ Loaded ${records.length} records from ${filename}`)
        return records
    } catch (error) {
        console.error(`Error loading ${filename}:`, error)
        throw error
    }
}

function extractYearsAndOwnerKey(firstRow: any): { years: string[], ownerKey: string } {
    const allKeys = Object.keys(firstRow)

    // Get year columns (numeric columns within valid range)
    const yearKeys = allKeys.filter(k => {
        const year = parseInt(k.trim(), 10)
        return !isNaN(year) && year >= YEAR_RANGE.MIN && year <= YEAR_RANGE.MAX
    }).sort((a, b) => parseInt(a) - parseInt(b))

    if (yearKeys.length === 0) {
        throw new Error('No valid year columns found in timeline data')
    }

    // Find owner key - should be the first non-year column
    const nonYearKeys = allKeys.filter(k => !yearKeys.includes(k))

    if (nonYearKeys.length === 0) {
        throw new Error('No owner column found in timeline data')
    }

    // Prefer columns with 'owner' in the name, otherwise use first non-year column
    const ownerKey = nonYearKeys.find(k => k.toLowerCase().includes('owner')) || nonYearKeys[0]

    console.log(`✓ Extracted ${yearKeys.length} year columns (${yearKeys[0]} - ${yearKeys[yearKeys.length - 1]})`)
    console.log(`✓ Detected owner key: "${ownerKey}"`)

    return { years: yearKeys, ownerKey }
}

function convertToLongFormat(
    records: any[],
    years: string[],
    ownerKey: string
): LongFormatData[] {
    const longData: LongFormatData[] = []

    for (const row of records) {
        const owner = row[ownerKey]?.toString().replace(/"/g, '').trim()

        if (!isValidOwnerName(owner)) {
            continue
        }

        for (const yearStr of years) {
            const count = parseInt(row[yearStr] || '0', 10)
            const year = parseInt(yearStr, 10)

            if (!isNaN(count) && count > 0 && !isNaN(year)) {
                longData.push({ owner, year, count })
            }
        }
    }

    console.log(`✓ Converted to ${longData.length} long-format data points`)
    return longData
}

function calculateYearTotals(longData: LongFormatData[]): YearTotal[] {
    const yearMap = new Map<number, number>()

    for (const item of longData) {
        yearMap.set(item.year, (yearMap.get(item.year) || 0) + item.count)
    }

    return Array.from(yearMap.entries())
        .map(([year, total]) => ({ year, total }))
        .sort((a, b) => a.year - b.year)
}

function calculateTopOwners(longData: LongFormatData[], limit: number = TOP_OWNERS_LIMIT): OwnerTotal[] {
    const ownerMap = new Map<string, number>()

    for (const item of longData) {
        ownerMap.set(item.owner, (ownerMap.get(item.owner) || 0) + item.count)
    }

    return Array.from(ownerMap.entries())
        .map(([owner, total]) => ({ owner, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit)
}

function calculateSummaryStats(longData: LongFormatData[]): SummaryStats {
    const totalPatents = longData.reduce((sum, item) => sum + item.count, 0)
    const uniqueOwners = new Set(longData.map(d => d.owner)).size

    const years = longData.map(d => d.year)
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)

    // Find peak year
    const yearCounts = new Map<number, number>()
    for (const item of longData) {
        yearCounts.set(item.year, (yearCounts.get(item.year) || 0) + item.count)
    }

    let peakYear = minYear
    let peakCount = 0
    yearCounts.forEach((count, year) => {
        if (count > peakCount) {
            peakCount = count
            peakYear = year
        }
    })

    return {
        totalPatents,
        uniqueOwners,
        dateRange: `${minYear} - ${maxYear}`,
        peakYear: `${peakYear}`,
        peakCount
    }
}

function prepareDisplayData(records: any[], ownerKey: string): any[] {
    return records.slice(0, DISPLAY_ROWS_LIMIT).map(row => {
        const cleanRow: any = {}
        for (const key in row) {
            const value = row[key]
            cleanRow[key] = (value === null || value === 'None' || value === 'none' || value === '')
                ? '—'
                : value
        }
        return cleanRow
    })
}

async function getTimelineData(): Promise<TimelineResponse> {
    try {
        console.log('=== Timeline Data Processing Started ===')

        // Load the main timeline data
        const records = loadCsvData('Timeline_Current_Owner_Count.csv', DATA_DIRS.RAW)

        if (records.length === 0) {
            throw new Error('No data found in Timeline_Current_Owner_Count.csv')
        }

        // Extract structure
        const { years, ownerKey } = extractYearsAndOwnerKey(records[0])

        // Convert to long format for easier processing
        const longFormatData = convertToLongFormat(records, years, ownerKey)

        if (longFormatData.length === 0) {
            throw new Error('No valid data points found after processing')
        }

        // Calculate aggregates
        const yearTotals = calculateYearTotals(longFormatData)
        const topOwners = calculateTopOwners(longFormatData)
        const summaryStats = calculateSummaryStats(longFormatData)

        // Prepare display data
        const displayData = prepareDisplayData(records, ownerKey)

        const data: ProcessedTimelineData = {
            rawData: {
                data: records,
                years,
                ownerKey,
                displayData
            },
            longFormatData,
            yearTotals,
            topOwners,
            summaryStats
        }

        console.log('=== Timeline Data Processing Completed ===')
        console.log(`✓ Total patents: ${summaryStats.totalPatents}`)
        console.log(`✓ Unique owners: ${summaryStats.uniqueOwners}`)
        console.log(`✓ Peak year: ${summaryStats.peakYear} (${summaryStats.peakCount} patents)`)

        return {
            success: true,
            data,
        }
    } catch (error) {
        console.error('Error getting timeline data:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        }
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const result = await getTimelineData()

        if (result.success) {
            return NextResponse.json(result, {
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
                }
            })
        } else {
            return NextResponse.json(result, { status: 500 })
        }
    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        )
    }
}