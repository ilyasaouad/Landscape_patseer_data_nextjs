export const runtime = "nodejs";

// app/api/entity/route.ts
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

// Logger
const logger = {
    info: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
}

// Constants
const DATA_DIRS = {
    RAW: 'raw',
    PROCESSED: 'processed'
} as const

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

type EntityResponse =
    | {
        success: true
        data: ProcessedEntityData
        fileInfo: {
            assigneeCountFile: string | null
            assigneeCountryFile: string | null
            inventorCountFile: string | null
            inventorCountryFile: string | null
            assigneeCountryProcessedFile: string | null
        }
    }
    | {
        success: false
        error: string
    }

// Utility Functions
function removeBOM(content: string): string {
    return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content
}

function normalizeKey(key: string): string {
    return key.trim().toLowerCase()
}

function findCsvFile(filename: string, directory: string, alternates: string[] = []): string | null {
    const baseDir = path.join(process.cwd(), 'data', directory)

    // Try main filename
    let fullPath = path.join(baseDir, filename)
    if (fs.existsSync(fullPath)) {
        return fullPath
    }

    // Try alternate filenames
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

        return records
    } catch (error) {
        logger.error(`Error loading CSV ${filename}:`, error)
        throw error
    }
}

async function loadCsvDataSafe(filePath: string | null, dataName: string): Promise<any[]> {
    if (!filePath) {
        logger.warn(`No file found for ${dataName}`)
        return []
    }

    try {
        const data = await loadCsvData(filePath)
        logger.info(`✓ Loaded ${data.length} records from ${dataName}`)
        return data
    } catch (error) {
        logger.error(`Error loading ${dataName}:`, error)
        return []
    }
}

function normalizeAssigneeData(rawData: any[]): AssigneeData[] {
    const result: AssigneeData[] = []

    for (const item of rawData) {
        // Normalize keys (handle both uppercase and lowercase)
        const normalizedItem: any = {}
        for (const key in item) {
            normalizedItem[normalizeKey(key)] = item[key]
        }

        const country = normalizedItem.country?.trim() || ''
        const assignee = normalizedItem.assignee?.trim() || 'Unknown'
        const count = parseInt(normalizedItem.count || '0', 10)

        if (assignee && !isNaN(count) && count > 0) {
            result.push({ country, assignee, count })
        }
    }

    // Sort by count descending
    return result.sort((a, b) => b.count - a.count)
}

function processInventorData(rawData: any[]): InventorData[] {
    const inventorMap = new Map<string, { country: string, count: number }>()

    for (const item of rawData) {
        // Normalize keys
        const normalizedItem: any = {}
        for (const key in item) {
            normalizedItem[normalizeKey(key)] = item[key]
        }

        const inventor = normalizedItem.inventor?.trim() || ''
        const country = normalizedItem.country?.trim() || ''

        if (inventor) {
            const existing = inventorMap.get(inventor)
            if (existing) {
                existing.count += 1
            } else {
                inventorMap.set(inventor, { country, count: 1 })
            }
        }
    }

    // Convert to array and sort
    const result: InventorData[] = Array.from(inventorMap.entries())
        .map(([name, data]) => ({
            country: data.country,
            inventor: name,
            count: data.count
        }))
        .sort((a, b) => b.count - a.count)

    return result
}

async function getEntityData(): Promise<EntityResponse> {
    try {
        logger.info('=== Entity Data Processing Started ===')

        // Find CSV files
        const assigneeCountFile = findCsvFile('Assignee_Count.csv', DATA_DIRS.RAW)
        const assigneeCountryFile = findCsvFile('Assignee_Country.csv', DATA_DIRS.RAW)
        const inventorCountFile = findCsvFile('Inventor_Count.csv', DATA_DIRS.RAW)
        const inventorCountryFile = findCsvFile('Inventor_Country.csv', DATA_DIRS.RAW)
        const assigneeCountryProcessedFile = findCsvFile(
            'Assignee_Country_Count_Updated.csv',
            DATA_DIRS.PROCESSED,
            ['Assignee_Country_Count.csv']
        )

        // Load all data safely
        const [
            assigneeCountData,
            assigneeCountryData,
            inventorCountData,
            inventorCountryData,
            assigneeCountryProcessedData
        ] = await Promise.all([
            loadCsvDataSafe(assigneeCountFile, 'Assignee Count'),
            loadCsvDataSafe(assigneeCountryFile, 'Assignee Country'),
            loadCsvDataSafe(inventorCountFile, 'Inventor Count'),
            loadCsvDataSafe(inventorCountryFile, 'Inventor Country'),
            loadCsvDataSafe(assigneeCountryProcessedFile, 'Assignee Country Processed')
        ])

        // Validate that we have at least some data
        const hasAssigneeData = assigneeCountryProcessedData.length > 0 ||
            assigneeCountData.length > 0 ||
            assigneeCountryData.length > 0
        const hasInventorData = inventorCountData.length > 0 ||
            inventorCountryData.length > 0

        if (!hasAssigneeData && !hasInventorData) {
            throw new Error(
                'No entity data files found. Please place CSV files in data/raw/ or data/processed/ directory:\n' +
                '- Assignee_Count.csv\n' +
                '- Assignee_Country.csv\n' +
                '- Inventor_Count.csv\n' +
                '- Inventor_Country.csv\n' +
                '- Assignee_Country_Count_Updated.csv (processed)'
            )
        }

        // Process assignee data (prefer processed file)
        let assigneeData: AssigneeData[] = []
        if (assigneeCountryProcessedData.length > 0) {
            assigneeData = normalizeAssigneeData(assigneeCountryProcessedData)
            logger.info(`✓ Processed ${assigneeData.length} assignee records`)
        } else if (assigneeCountryData.length > 0) {
            assigneeData = normalizeAssigneeData(assigneeCountryData)
            logger.info(`✓ Processed ${assigneeData.length} assignee records from raw data`)
        }

        // Process inventor data
        let inventorData: InventorData[] = []
        if (inventorCountryData.length > 0) {
            inventorData = processInventorData(inventorCountryData)
            logger.info(`✓ Processed ${inventorData.length} unique inventors`)
        }

        logger.info('=== Entity Data Processing Completed ===')

        return {
            success: true,
            data: {
                assigneeData,
                inventorData
            },
            fileInfo: {
                assigneeCountFile,
                assigneeCountryFile,
                inventorCountFile,
                inventorCountryFile,
                assigneeCountryProcessedFile,
            },
        }
    } catch (error) {
        logger.error('Error getting entity data:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        }
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const result = await getEntityData()

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
        logger.error('API error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        )
    }
}