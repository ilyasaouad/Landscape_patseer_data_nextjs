// app/api/classification/route.ts
export const runtime = "nodejs";


import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import pino from 'pino'



const logger = pino()

interface ClassificationData {
    ipcFull: any[]
    cpcFull: any[]
    ipcByOwner: any[]
    cpcByOwner: any[]
    cpcByYear: any[]
    ipcByYear: any[]
}

interface ClassificationResponse {
    success: boolean
    data?: ClassificationData
    error?: string
    debug?: any
}

function findCsvFile(filename: string, alternates: string[] = [], dir: string = 'raw'): string | null {
    const baseDir = path.join(process.cwd(), 'data', dir)

    // Check if directory exists
    if (!fs.existsSync(baseDir)) {
        logger.warn(`Directory does not exist: ${baseDir}`)
        return null
    }

    // Try main filename
    let fullPath = path.join(baseDir, filename)
    if (fs.existsSync(fullPath)) {
        logger.info(`Found file: ${fullPath}`)
        return fullPath
    }

    // Try alternates
    for (const altName of alternates) {
        fullPath = path.join(baseDir, altName)
        if (fs.existsSync(fullPath)) {
            logger.info(`Found alternate file: ${fullPath}`)
            return fullPath
        }
    }

    logger.warn(`File not found: ${filename} (tried ${alternates.length} alternates)`)
    return null
}

async function loadCsvData(filename: string): Promise<any[]> {
    try {
        logger.info(`Loading CSV: ${filename}`)
        const fileContent = fs.readFileSync(filename, 'utf-8')

        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relaxColumnCount: true,
            relaxQuotes: true,
            cast: false,
        })

        logger.info(`Loaded ${records.length} records from ${filename}`)
        return records
    } catch (error) {
        logger.error(`Error loading CSV ${filename}:`, error)
        throw error
    }
}

function cleanOwnerName(name: string): string {
    if (!name) return ''
    return String(name).replace(/^["']|["']$/g, '').trim()
}

function cleanClassificationName(name: string): string {
    if (typeof name !== 'string') return String(name || '')
    const cleaned = name.replace(/^["']|["']$/g, '').trim()
    if (cleaned.includes(':')) {
        const parts = cleaned.split(':')
        return parts[0].trim()
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

async function getClassificationData(): Promise<ClassificationResponse> {
    const debugInfo: any = {
        filesChecked: [],
        filesFound: [],
        filesNotFound: [],
    }

    try {
        logger.info('=== Classification Data Processing Started ===')

        const data: ClassificationData = {
            ipcFull: [],
            cpcFull: [],
            ipcByOwner: [],
            cpcByOwner: [],
            cpcByYear: [],
            ipcByYear: [],
        }

        // === Load IPC Full data ===
        debugInfo.filesChecked.push('IPC_Full.csv')
        const ipcFullFile = findCsvFile('IPC_Full.csv', ['ipc_full.csv', 'IPC_full.csv'])

        if (ipcFullFile) {
            debugInfo.filesFound.push('IPC_Full.csv')
            try {
                const ipcRecords = await loadCsvData(ipcFullFile)
                logger.info(`IPC Full raw records: ${ipcRecords.length}`)

                // Process first 10 records
                data.ipcFull = ipcRecords.slice(0, 10).map((row: any) => {
                    const keys = Object.keys(row)
                    const classification = cleanClassificationName(row[keys[0]] || '')
                    const total = parseNumber(row[keys[1]] || 0)

                    return {
                        classification,
                        total,
                    }
                }).filter(item => item.classification && item.total > 0)

                logger.info(`✓ Processed ${data.ipcFull.length} IPC full records`)
            } catch (err) {
                logger.error('Error processing IPC_Full.csv:', err)
                debugInfo.errors = debugInfo.errors || []
                debugInfo.errors.push(`IPC_Full.csv: ${err}`)
            }
        } else {
            debugInfo.filesNotFound.push('IPC_Full.csv')
        }

        // === Load CPC Full data ===
        debugInfo.filesChecked.push('CPC_Full.csv')
        const cpcFullFile = findCsvFile('CPC_Full.csv', ['cpc_full.csv', 'CPC_full.csv'])

        if (cpcFullFile) {
            debugInfo.filesFound.push('CPC_Full.csv')
            try {
                const cpcRecords = await loadCsvData(cpcFullFile)
                logger.info(`CPC Full raw records: ${cpcRecords.length}`)

                data.cpcFull = cpcRecords.slice(0, 10).map((row: any) => {
                    const keys = Object.keys(row)
                    const classification = cleanClassificationName(row[keys[0]] || '')
                    const total = parseNumber(row[keys[1]] || 0)

                    return {
                        classification,
                        total,
                    }
                }).filter(item => item.classification && item.total > 0)

                logger.info(`✓ Processed ${data.cpcFull.length} CPC full records`)
            } catch (err) {
                logger.error('Error processing CPC_Full.csv:', err)
                debugInfo.errors = debugInfo.errors || []
                debugInfo.errors.push(`CPC_Full.csv: ${err}`)
            }
        } else {
            debugInfo.filesNotFound.push('CPC_Full.csv')
        }

        // === Load IPC by Owner data ===
        debugInfo.filesChecked.push('Current-Owner_IPC-Full.csv')
        const ipcOwnerFile = findCsvFile('Current-Owner_IPC-Full.csv', [
            'current_owner_ipc_full.csv',
            'Current-Owner_IPC_Full.csv',
            'IPC_Assignee.csv',
        ])

        if (ipcOwnerFile) {
            debugInfo.filesFound.push('Current-Owner_IPC-Full.csv')
            try {
                const ipcOwnerRecords = await loadCsvData(ipcOwnerFile)
                logger.info(`IPC Owner raw records: ${ipcOwnerRecords.length}`)

                // Skip first row if it's a header/separator
                const validRecords = ipcOwnerRecords.filter((row: any) => {
                    const firstValue = Object.values(row)[0]
                    return firstValue && !String(firstValue).includes('---') && !String(firstValue).includes('Current Owner')
                })

                if (validRecords.length > 0) {
                    const keys = Object.keys(validRecords[0])

                    // Calculate totals for each classification column (skip owner and total columns)
                    const classificationTotals: { [key: string]: number } = {}
                    for (let i = 2; i < keys.length; i++) {
                        const classKey = keys[i]
                        let total = 0
                        validRecords.forEach((row: any) => {
                            total += parseNumber(row[classKey] || 0)
                        })
                        classificationTotals[classKey] = total
                    }

                    // Get top 5 classifications by total
                    const top5Classifications = Object.entries(classificationTotals)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([key]) => key)

                    logger.info(`Top 5 IPC classifications: ${top5Classifications.map(k => cleanClassificationName(k)).join(', ')}`)

                    // Map records with only top 5 classifications
                    data.ipcByOwner = validRecords.slice(0, 15).map((row: any) => {
                        const cleaned: any = {
                            currentOwner: cleanOwnerName(row[keys[0]] || ''),
                            total: parseNumber(row[keys[1]] || 0),
                        }

                        // Add only top 5 classification columns
                        top5Classifications.forEach((classKey) => {
                            const cleanKey = cleanClassificationName(classKey)
                            if (cleanKey) {
                                cleaned[cleanKey] = parseNumber(row[classKey] || 0)
                            }
                        })

                        return cleaned
                    }).filter((item: any) => item.currentOwner && item.total > 0)

                    logger.info(`✓ Processed ${data.ipcByOwner.length} IPC by owner records`)
                }
            } catch (err) {
                logger.error('Error processing Current-Owner_IPC-Full.csv:', err)
                debugInfo.errors = debugInfo.errors || []
                debugInfo.errors.push(`Current-Owner_IPC-Full.csv: ${err}`)
            }
        } else {
            debugInfo.filesNotFound.push('Current-Owner_IPC-Full.csv')
        }

        // === Load CPC by Owner data ===
        debugInfo.filesChecked.push('Current-Owner_CPC-Full.csv')
        const cpcOwnerFile = findCsvFile('Current-Owner_CPC-Full.csv', [
            'current_owner_cpc_full.csv',
            'Current-Owner_CPC_Full.csv',
            'CPC_Assignee.csv',
        ])

        if (cpcOwnerFile) {
            debugInfo.filesFound.push('Current-Owner_CPC-Full.csv')
            try {
                const cpcOwnerRecords = await loadCsvData(cpcOwnerFile)
                logger.info(`CPC Owner raw records: ${cpcOwnerRecords.length}`)

                if (cpcOwnerRecords.length > 0) {
                    logger.info(`First CPC record keys: ${Object.keys(cpcOwnerRecords[0]).join(', ')}`)
                    logger.info(`First CPC record values: ${Object.values(cpcOwnerRecords[0]).slice(0, 3).join(', ')}`)
                }

                // Skip first row if it's a header/separator
                const validRecords = cpcOwnerRecords.filter((row: any) => {
                    const firstValue = Object.values(row)[0]
                    return firstValue && !String(firstValue).includes('---') && !String(firstValue).includes('Current Owner')
                })

                logger.info(`CPC Owner valid records after filtering: ${validRecords.length}`)

                if (validRecords.length > 0) {
                    const keys = Object.keys(validRecords[0])

                    // Calculate totals for each classification column (skip owner and total columns)
                    const classificationTotals: { [key: string]: number } = {}
                    for (let i = 2; i < keys.length; i++) {
                        const classKey = keys[i]
                        let total = 0
                        validRecords.forEach((row: any) => {
                            total += parseNumber(row[classKey] || 0)
                        })
                        classificationTotals[classKey] = total
                    }

                    // Get top 5 classifications by total
                    const top5Classifications = Object.entries(classificationTotals)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([key]) => key)

                    logger.info(`Top 5 CPC classifications: ${top5Classifications.map(k => cleanClassificationName(k)).join(', ')}`)

                    // Map records with only top 5 classifications
                    data.cpcByOwner = validRecords.slice(0, 15).map((row: any) => {
                        const cleaned: any = {
                            currentOwner: cleanOwnerName(row[keys[0]] || ''),
                            total: parseNumber(row[keys[1]] || 0),
                        }

                        // Add only top 5 classification columns
                        top5Classifications.forEach((classKey) => {
                            const cleanKey = cleanClassificationName(classKey)
                            if (cleanKey) {
                                cleaned[cleanKey] = parseNumber(row[classKey] || 0)
                            }
                        })

                        return cleaned
                    }).filter((item: any) => item.currentOwner && item.total > 0)

                    logger.info(`✓ Processed ${data.cpcByOwner.length} CPC by owner records`)
                } else {
                    logger.warn('No valid CPC owner records after filtering')
                }
            } catch (err) {
                logger.error('Error processing Current-Owner_CPC-Full.csv:', err)
                debugInfo.errors = debugInfo.errors || []
                debugInfo.errors.push(`Current-Owner_CPC-Full.csv: ${err}`)
            }
        } else {
            debugInfo.filesNotFound.push('Current-Owner_CPC-Full.csv')
        }

        // === Load CPC by Year data ===
        debugInfo.filesChecked.push('CPC_Classifications_vs_Year.csv')
        const cpcYearFile = findCsvFile('CPC_Classifications_vs_Year.csv', [
            'application_year_cpc_full.csv',
            'Application-Year_CPC-Full.csv',
            'Application-Year _CPC-Full.csv',
        ], 'processed')

        if (cpcYearFile) {
            debugInfo.filesFound.push('CPC_Classifications_vs_Year.csv')
            try {
                const cpcYearRecords = await loadCsvData(cpcYearFile)
                logger.info(`CPC Year raw records: ${cpcYearRecords.length}`)

                data.cpcByYear = cpcYearRecords
                    .map((row: any) => {
                        const keys = Object.keys(row)
                        const year = parseNumber(row[keys[0]] || 0)

                        if (year < 2010 || year > 2025) return null

                        const cleaned: any = { year }

                        for (let i = 1; i < keys.length; i++) {
                            const classKey = cleanClassificationName(keys[i])
                            if (classKey) {
                                cleaned[classKey] = parseNumber(row[keys[i]] || 0)
                            }
                        }

                        return cleaned
                    })
                    .filter((item: any) => item !== null)
                    .sort((a: any, b: any) => a.year - b.year)

                logger.info(`✓ Processed ${data.cpcByYear.length} CPC by year records`)
            } catch (err) {
                logger.error('Error processing CPC_Classifications_vs_Year.csv:', err)
                debugInfo.errors = debugInfo.errors || []
                debugInfo.errors.push(`CPC_Classifications_vs_Year.csv: ${err}`)
            }
        } else {
            debugInfo.filesNotFound.push('CPC_Classifications_vs_Year.csv')
        }

        // === Load IPC by Year data ===
        debugInfo.filesChecked.push('IPC_Classifications_vs_Year.csv')
        const ipcYearFile = findCsvFile('IPC_Classifications_vs_Year.csv', [
            'application_year_ipc_full.csv',
            'Application-Year_IPC-Full.csv',
            'Application-Year _IPC-Full.csv',
        ], 'processed')

        if (ipcYearFile) {
            debugInfo.filesFound.push('IPC_Classifications_vs_Year.csv')
            try {
                const ipcYearRecords = await loadCsvData(ipcYearFile)
                logger.info(`IPC Year raw records: ${ipcYearRecords.length}`)

                data.ipcByYear = ipcYearRecords
                    .map((row: any) => {
                        const keys = Object.keys(row)
                        const year = parseNumber(row[keys[0]] || 0)

                        if (year < 2010 || year > 2025) return null

                        const cleaned: any = { year }

                        for (let i = 1; i < keys.length; i++) {
                            const classKey = cleanClassificationName(keys[i])
                            if (classKey) {
                                cleaned[classKey] = parseNumber(row[keys[i]] || 0)
                            }
                        }

                        return cleaned
                    })
                    .filter((item: any) => item !== null)
                    .sort((a: any, b: any) => a.year - b.year)

                logger.info(`✓ Processed ${data.ipcByYear.length} IPC by year records`)
            } catch (err) {
                logger.error('Error processing IPC_Classifications_vs_Year.csv:', err)
                debugInfo.errors = debugInfo.errors || []
                debugInfo.errors.push(`IPC_Classifications_vs_Year.csv: ${err}`)
            }
        } else {
            debugInfo.filesNotFound.push('IPC_Classifications_vs_Year.csv')
        }

        logger.info('=== Classification Data Processing Completed ===')
        logger.info(`Summary: IPC Full: ${data.ipcFull.length}, CPC Full: ${data.cpcFull.length}, IPC Owner: ${data.ipcByOwner.length}, CPC Owner: ${data.cpcByOwner.length}, IPC Year: ${data.ipcByYear.length}, CPC Year: ${data.cpcByYear.length}`)

        return {
            success: true,
            data,
            debug: debugInfo,
        }
    } catch (error) {
        logger.error('Error getting classification data:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            debug: debugInfo,
        }
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const result = await getClassificationData()

        // Log summary for debugging
        if (result.success && result.data) {
            console.log('API Response Summary:', {
                ipcFull: result.data.ipcFull.length,
                cpcFull: result.data.cpcFull.length,
                ipcByOwner: result.data.ipcByOwner.length,
                cpcByOwner: result.data.cpcByOwner.length,
                ipcByYear: result.data.ipcByYear.length,
                cpcByYear: result.data.cpcByYear.length,
            })
        }

        return NextResponse.json(result)
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