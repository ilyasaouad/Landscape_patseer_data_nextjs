// app/api/timeline/route.ts
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import pino from 'pino'

const logger = pino()

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const baseDir = path.join(process.cwd(), 'data', 'raw')
        const filename = 'Timeline_Current_Owner_Count.csv'
        const filePath = path.join(baseDir, filename)

        logger.info({ filePath }, 'Loading timeline data')

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({
                success: false,
                error: `File not found: ${filename}`
            }, { status: 404 })
        }

        let fileContent = fs.readFileSync(filePath, 'utf-8')

        // Remove BOM if present (Byte Order Mark)
        if (fileContent.charCodeAt(0) === 0xFEFF) {
            fileContent = fileContent.slice(1)
        }

        // Parse CSV
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true
        })

        logger.info({ recordCount: records.length }, 'Loaded timeline records')

        // Extract years from column headers
        if (records.length > 0) {
            const firstRow = records[0]
            const allKeys = Object.keys(firstRow)

            logger.info({ allKeys, firstRowSample: firstRow }, 'DEBUG: All column names and first row sample')

            // Find the owner key: it's the first key that is NOT a year number
            let ownerKey = allKeys[0]

            // Try to find a better key if the first one looks like a year
            for (const key of allKeys) {
                const yearVal = parseInt(key)
                const isYear = !isNaN(yearVal) && yearVal >= 2000 && yearVal <= 2030

                // Also check if the key is empty or just whitespace
                if (!isYear && key.trim() !== '') {
                    ownerKey = key
                    break
                }
            }

            // Get year columns (numeric columns between 2000-2030)
            const yearKeys = allKeys.filter(k => {
                const year = parseInt(k)
                return !isNaN(year) && year >= 2000 && year <= 2025
            }).sort()

            logger.info({ ownerKey, yearCount: yearKeys.length, years: yearKeys }, 'Extracted columns')

            return NextResponse.json({
                success: true,
                data: {
                    timelineData: records,
                    years: yearKeys,
                    ownerKey: ownerKey,
                    allKeys: allKeys
                }
            })
        }

        return NextResponse.json({
            success: false,
            error: 'No data found in file'
        }, { status: 404 })

    } catch (error) {
        logger.error({ error }, 'API error')
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 })
    }
}