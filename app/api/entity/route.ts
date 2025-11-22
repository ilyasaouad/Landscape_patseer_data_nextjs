// app/api/entity/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import pino from 'pino'

const logger = pino()

interface AssigneeData {
    assignee: string
    count: number
    country?: string
}

interface InventorData {
    inventor: string
    count: number
    country?: string
}

interface EntityResponse {
    success: boolean
    data?: {
        assigneeCount: AssigneeData[]
        assigneeCountry: any[]
        inventorCount: InventorData[]
        inventorCountry: any[]
        assigneeCountryProcessed: any[]
    }
    fileInfo?: {
        assigneeCountFile: string | null
        assigneeCountryFile: string | null
        inventorCountFile: string | null
        inventorCountryFile: string | null
        assigneeCountryProcessedFile: string | null
    }
    error?: string
}

async function loadCsvData(filename: string): Promise<any[]> {
    try {
        const fileContent = fs.readFileSync(filename, 'utf-8')
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        })
        return records
    } catch (error) {
        logger.error({ error, filename }, `Error loading CSV ${filename}`)
        throw error
    }
}

function findCsvFile(filename: string, directory: 'raw' | 'processed', alternates: string[] = []): string | null {
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

async function getEntityData(): Promise<EntityResponse> {
    try {
        // Find CSV files
        const assigneeCountFile = findCsvFile('Assignee_Count.csv', 'raw')
        const assigneeCountryFile = findCsvFile('Assignee_Country.csv', 'raw')
        const inventorCountFile = findCsvFile('Inventor_Count.csv', 'raw')
        const inventorCountryFile = findCsvFile('Inventor_Country.csv', 'raw')
        const assigneeCountryProcessedFile = findCsvFile('Assignee_Country_Count_Updated.csv', 'processed', [
            'Assignee_Country_Count.csv'
        ])

        let assigneeCountData: any[] = []
        let assigneeCountryData: any[] = []
        let inventorCountData: any[] = []
        let inventorCountryData: any[] = []
        let assigneeCountryProcessedData: any[] = []

        // Load Assignee Count
        if (assigneeCountFile) {
            try {
                assigneeCountData = await loadCsvData(assigneeCountFile)
                logger.info(`Loaded assignee count data from: ${assigneeCountFile}`)
            } catch (error) {
                logger.error({ error }, 'Error loading assignee count data')
            }
        }

        // Load Assignee Country
        if (assigneeCountryFile) {
            try {
                assigneeCountryData = await loadCsvData(assigneeCountryFile)
                logger.info(`Loaded assignee country data from: ${assigneeCountryFile}`)
            } catch (error) {
                logger.error({ error }, 'Error loading assignee country data')
            }
        }

        // Load Inventor Count
        if (inventorCountFile) {
            try {
                inventorCountData = await loadCsvData(inventorCountFile)
                logger.info(`Loaded inventor count data from: ${inventorCountFile}`)
            } catch (error) {
                logger.error({ error }, 'Error loading inventor count data')
            }
        }

        // Load Inventor Country
        if (inventorCountryFile) {
            try {
                inventorCountryData = await loadCsvData(inventorCountryFile)
                logger.info(`Loaded inventor country data from: ${inventorCountryFile}`)
            } catch (error) {
                logger.error({ error }, 'Error loading inventor country data')
            }
        }

        // Load Assignee Country Processed
        if (assigneeCountryProcessedFile) {
            try {
                assigneeCountryProcessedData = await loadCsvData(assigneeCountryProcessedFile)
                logger.info(`Loaded assignee country processed data from: ${assigneeCountryProcessedFile}`)
            } catch (error) {
                logger.error({ error }, 'Error loading assignee country processed data')
            }
        }

        if (assigneeCountData.length === 0 && inventorCountData.length === 0) {
            throw new Error(
                'No entity data files found. Please place CSV files in data/raw/ directory:\n' +
                '- Assignee_Count.csv\n' +
                '- Assignee_Country.csv\n' +
                '- Inventor_Count.csv\n' +
                '- Inventor_Country.csv'
            )
        }

        return {
            success: true,
            data: {
                assigneeCount: assigneeCountData,
                assigneeCountry: assigneeCountryData,
                inventorCount: inventorCountData,
                inventorCountry: inventorCountryData,
                assigneeCountryProcessed: assigneeCountryProcessedData,
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
        logger.error({ error }, 'Error getting entity data')
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const data = await getEntityData()
        return NextResponse.json(data)
    } catch (error) {
        logger.error({ error }, 'API error')
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        )
    }
}
