export const runtime = "nodejs";

// app/api/classification/route.ts
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

// Constants
const DATA_DIRS = {
    RAW: 'raw',
    PROCESSED: 'processed'
} as const

const LIMITS = {
    FULL_RECORDS: 10,
    TOP_CLASSIFICATIONS: 5,
    TOP_OWNERS: 15,
    MIN_YEAR: 2010,
    MAX_YEAR: 2025
} as const

// Interfaces
interface ClassificationItem {
    classification: string
    total: number
}

interface OwnerClassification extends Record<string, any> {
    currentOwner: string
    total: number
}

interface YearClassification extends Record<string, any> {
    year: number
}

interface ClassificationData {
    ipcFull: ClassificationItem[]
    cpcFull: ClassificationItem[]
    ipcByOwner: OwnerClassification[]
    cpcByOwner: OwnerClassification[]
    cpcByYear: YearClassification[]
    ipcByYear: YearClassification[]
}

type ClassificationResponse =
    | {
        success: true
        data: ClassificationData
    }
    | {
        success: false
        error: string
    }

// Utility Functions
function removeBOM(content: string): string {
    return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content
}

function cleanOwnerName(name: string | null | undefined): string {
    if (!name) return ''
    return String(name).replace(/^["']|["']$/g, '').trim()
}

function cleanClassificationName(name: string | null | undefined): string {
    if (!name) return ''
    const nameStr = typeof name === 'string' ? name : String(name)
    const cleaned = nameStr.replace(/^["']|["']$/g, '').trim()

    // Remove description after colon (e.g., "G06N10/40: Description" -> "G06N10/40")
    if (cleaned.includes(':')) {
        return cleaned.split(':')[0].trim()
    }

    return cleaned
}

function parseNumber(value: any): number {
    if (typeof value === 'number') return value
    if (!value) return 0
    const str = String(value).replace(/[,"']/g, '').trim()
    const num = parseInt(str, 10)
    return isNaN(num) ? 0 : num
}

function findCsvFile(filename: string, dir: string, alternates: string[] = []): string | null {
    const baseDir = path.join(process.cwd(), 'data', dir)

    if (!fs.existsSync(baseDir)) {
        console.warn(`Directory does not exist: ${baseDir}`)
        return null
    }

    // Try main filename
    let fullPath = path.join(baseDir, filename)
    if (fs.existsSync(fullPath)) {
        return fullPath
    }

    // Try alternates
    for (const altName of alternates) {
        fullPath = path.join(baseDir, altName)
        if (fs.existsSync(fullPath)) {
            return fullPath
        }
    }

    return null
}

async function loadCsvData(filename: string): Promise<any[]> {
    try {
        const fileContent = fs.readFileSync(filename, 'utf-8')
        const content = removeBOM(fileContent)

        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        })

        console.log(`✓ Loaded ${records.length} records from ${path.basename(filename)}`)
        return records
    } catch (error) {
        console.error(`Error loading CSV ${filename}:`, error)
        throw error
    }
}

function processFullClassification(records: any[], limit: number = LIMITS.FULL_RECORDS): ClassificationItem[] {
    if (records.length === 0) return []

    return records.slice(0, limit).map((row: any) => {
        const keys = Object.keys(row)
        return {
            classification: cleanClassificationName(row[keys[0]]),
            total: parseNumber(row[keys[1]])
        }
    }).filter(item => item.classification && item.total > 0)
}

function processOwnerClassification(
    records: any[],
    ownerLimit: number = LIMITS.TOP_OWNERS,
    classLimit: number = LIMITS.TOP_CLASSIFICATIONS
): OwnerClassification[] {
    if (records.length === 0) return []

    // Filter valid records
    const validRecords = records.filter((row: any) => {
        const firstValue = Object.values(row)[0]
        return firstValue &&
            !String(firstValue).includes('---') &&
            !String(firstValue).includes('Current Owner')
    })

    if (validRecords.length === 0) return []

    const keys = Object.keys(validRecords[0])

    // Calculate totals for each classification (skip first 2 columns: owner and total)
    const classificationTotals: { [key: string]: number } = {}
    for (let i = 2; i < keys.length; i++) {
        const classKey = keys[i]
        let total = 0
        validRecords.forEach((row: any) => {
            total += parseNumber(row[classKey])
        })
        classificationTotals[classKey] = total
    }

    // Get top N classifications
    const topClassifications = Object.entries(classificationTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, classLimit)
        .map(([key]) => key)

    console.log(`Top ${classLimit} classifications: ${topClassifications.map(k => cleanClassificationName(k)).join(', ')}`)

    // Process owner records
    return validRecords.slice(0, ownerLimit).map((row: any) => {
        const cleaned: OwnerClassification = {
            currentOwner: cleanOwnerName(row[keys[0]]),
            total: parseNumber(row[keys[1]])
        }

        topClassifications.forEach((classKey) => {
            const cleanKey = cleanClassificationName(classKey)
            if (cleanKey) {
                cleaned[cleanKey] = parseNumber(row[classKey])
            }
        })

        return cleaned
    }).filter((item: OwnerClassification) => item.currentOwner && item.total > 0)
}

function processYearClassification(records: any[]): YearClassification[] {
    if (records.length === 0) return []

    return records
        .map((row: any) => {
            const keys = Object.keys(row)
            const year = parseNumber(row[keys[0]])

            // Filter by year range
            if (year < LIMITS.MIN_YEAR || year > LIMITS.MAX_YEAR) return null

            const cleaned: YearClassification = { year }

            // Add classification data
            for (let i = 1; i < keys.length; i++) {
                const classKey = cleanClassificationName(keys[i])
                if (classKey) {
                    cleaned[classKey] = parseNumber(row[keys[i]])
                }
            }

            return cleaned
        })
        .filter((item): item is YearClassification => item !== null)
        .sort((a, b) => a.year - b.year)
}

async function getClassificationData(): Promise<ClassificationResponse> {
    try {
        console.log('=== Classification Data Processing Started ===')

        const data: ClassificationData = {
            ipcFull: [],
            cpcFull: [],
            ipcByOwner: [],
            cpcByOwner: [],
            cpcByYear: [],
            ipcByYear: [],
        }

        // === Load IPC Full data ===
        const ipcFullFile = findCsvFile('IPC_Full.csv', DATA_DIRS.RAW, ['ipc_full.csv', 'IPC_full.csv'])
        if (ipcFullFile) {
            try {
                const records = await loadCsvData(ipcFullFile)
                data.ipcFull = processFullClassification(records)
                console.log(`✓ Processed ${data.ipcFull.length} IPC full records`)
            } catch (err) {
                console.error('Error processing IPC_Full.csv:', err)
            }
        }

        // === Load CPC Full data ===
        const cpcFullFile = findCsvFile('CPC_Full.csv', DATA_DIRS.RAW, ['cpc_full.csv', 'CPC_full.csv'])
        if (cpcFullFile) {
            try {
                const records = await loadCsvData(cpcFullFile)
                data.cpcFull = processFullClassification(records)
                console.log(`✓ Processed ${data.cpcFull.length} CPC full records`)
            } catch (err) {
                console.error('Error processing CPC_Full.csv:', err)
            }
        }

        // === Load IPC by Owner data ===
        const ipcOwnerFile = findCsvFile('Current-Owner_IPC-Full.csv', DATA_DIRS.RAW, [
            'current_owner_ipc_full.csv',
            'Current-Owner_IPC_Full.csv',
            'IPC_Assignee.csv',
        ])
        if (ipcOwnerFile) {
            try {
                const records = await loadCsvData(ipcOwnerFile)
                data.ipcByOwner = processOwnerClassification(records)
                console.log(`✓ Processed ${data.ipcByOwner.length} IPC by owner records`)
            } catch (err) {
                console.error('Error processing Current-Owner_IPC-Full.csv:', err)
            }
        }

        // === Load CPC by Owner data ===
        const cpcOwnerFile = findCsvFile('Current-Owner_CPC-Full.csv', DATA_DIRS.RAW, [
            'current_owner_cpc_full.csv',
            'Current-Owner_CPC_Full.csv',
            'CPC_Assignee.csv',
        ])
        if (cpcOwnerFile) {
            try {
                const records = await loadCsvData(cpcOwnerFile)
                data.cpcByOwner = processOwnerClassification(records)
                console.log(`✓ Processed ${data.cpcByOwner.length} CPC by owner records`)
            } catch (err) {
                console.error('Error processing Current-Owner_CPC-Full.csv:', err)
            }
        }

        // === Load CPC by Year data ===
        const cpcYearFile = findCsvFile('CPC_Classifications_vs_Year.csv', DATA_DIRS.PROCESSED, [
            'application_year_cpc_full.csv',
            'Application-Year_CPC-Full.csv',
            'Application-Year _CPC-Full.csv',
        ])
        if (cpcYearFile) {
            try {
                const records = await loadCsvData(cpcYearFile)
                data.cpcByYear = processYearClassification(records)
                console.log(`✓ Processed ${data.cpcByYear.length} CPC by year records`)
            } catch (err) {
                console.error('Error processing CPC_Classifications_vs_Year.csv:', err)
            }
        }

        // === Load IPC by Year data ===
        const ipcYearFile = findCsvFile('IPC_Classifications_vs_Year.csv', DATA_DIRS.PROCESSED, [
            'application_year_ipc_full.csv',
            'Application-Year_IPC-Full.csv',
            'Application-Year _IPC-Full.csv',
        ])
        if (ipcYearFile) {
            try {
                const records = await loadCsvData(ipcYearFile)
                data.ipcByYear = processYearClassification(records)
                console.log(`✓ Processed ${data.ipcByYear.length} IPC by year records`)
            } catch (err) {
                console.error('Error processing IPC_Classifications_vs_Year.csv:', err)
            }
        }

        console.log('=== Classification Data Processing Completed ===')
        console.log(`Summary: IPC Full: ${data.ipcFull.length}, CPC Full: ${data.cpcFull.length}, ` +
            `IPC Owner: ${data.ipcByOwner.length}, CPC Owner: ${data.cpcByOwner.length}, ` +
            `IPC Year: ${data.ipcByYear.length}, CPC Year: ${data.cpcByYear.length}`)

        // Validate we have at least some data
        const hasData = Object.values(data).some(arr => arr.length > 0)
        if (!hasData) {
            throw new Error('No classification data files found or all files are empty')
        }

        return {
            success: true,
            data,
        }
    } catch (error) {
        console.error('Error getting classification data:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        }
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const result = await getClassificationData()

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