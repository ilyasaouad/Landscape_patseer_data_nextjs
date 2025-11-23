// app/api/geographic/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

// Constants
const CSV_COLUMNS = {
  FAMILY_COUNTRY: 'All Family Country',
  PRIORITY_COUNTRY: 'Priority Country',
  TOTAL: 'Total'
} as const

// Country Information Structure
interface CountryInfo {
  iso2: string
  iso3: string
  name: string
}

// Complete country mapping with ISO-2, ISO-3, and full names
const COUNTRY_DATA: { [key: string]: CountryInfo } = {
  'US': { iso2: 'US', iso3: 'USA', name: 'United States' },
  'GB': { iso2: 'GB', iso3: 'GBR', name: 'United Kingdom' },
  'FR': { iso2: 'FR', iso3: 'FRA', name: 'France' },
  'DE': { iso2: 'DE', iso3: 'DEU', name: 'Germany' },
  'JP': { iso2: 'JP', iso3: 'JPN', name: 'Japan' },
  'CN': { iso2: 'CN', iso3: 'CHN', name: 'China' },
  'IN': { iso2: 'IN', iso3: 'IND', name: 'India' },
  'CA': { iso2: 'CA', iso3: 'CAN', name: 'Canada' },
  'AU': { iso2: 'AU', iso3: 'AUS', name: 'Australia' },
  'NO': { iso2: 'NO', iso3: 'NOR', name: 'Norway' },
  'SE': { iso2: 'SE', iso3: 'SWE', name: 'Sweden' },
  'CH': { iso2: 'CH', iso3: 'CHE', name: 'Switzerland' },
  'NL': { iso2: 'NL', iso3: 'NLD', name: 'Netherlands' },
  'KR': { iso2: 'KR', iso3: 'KOR', name: 'South Korea' },
  'BR': { iso2: 'BR', iso3: 'BRA', name: 'Brazil' },
  'MX': { iso2: 'MX', iso3: 'MEX', name: 'Mexico' },
  'RU': { iso2: 'RU', iso3: 'RUS', name: 'Russia' },
  'ES': { iso2: 'ES', iso3: 'ESP', name: 'Spain' },
  'IT': { iso2: 'IT', iso3: 'ITA', name: 'Italy' },
  'BE': { iso2: 'BE', iso3: 'BEL', name: 'Belgium' },
  'SG': { iso2: 'SG', iso3: 'SGP', name: 'Singapore' },
  'HK': { iso2: 'HK', iso3: 'HKG', name: 'Hong Kong' },
  'TW': { iso2: 'TW', iso3: 'TWN', name: 'Taiwan' },
  'IL': { iso2: 'IL', iso3: 'ISR', name: 'Israel' },
  'IE': { iso2: 'IE', iso3: 'IRL', name: 'Ireland' },
  'DK': { iso2: 'DK', iso3: 'DNK', name: 'Denmark' },
  'FI': { iso2: 'FI', iso3: 'FIN', name: 'Finland' },
  'IS': { iso2: 'IS', iso3: 'ISL', name: 'Iceland' },
  'PL': { iso2: 'PL', iso3: 'POL', name: 'Poland' },
  'TH': { iso2: 'TH', iso3: 'THA', name: 'Thailand' },
  'MY': { iso2: 'MY', iso3: 'MYS', name: 'Malaysia' },
  'PH': { iso2: 'PH', iso3: 'PHL', name: 'Philippines' },
  'ID': { iso2: 'ID', iso3: 'IDN', name: 'Indonesia' },
  'VN': { iso2: 'VN', iso3: 'VNM', name: 'Vietnam' },
  'NZ': { iso2: 'NZ', iso3: 'NZL', name: 'New Zealand' },
  'ZA': { iso2: 'ZA', iso3: 'ZAF', name: 'South Africa' },
  'TR': { iso2: 'TR', iso3: 'TUR', name: 'Turkey' },
  'GR': { iso2: 'GR', iso3: 'GRC', name: 'Greece' },
  'PT': { iso2: 'PT', iso3: 'PRT', name: 'Portugal' },
  'CZ': { iso2: 'CZ', iso3: 'CZE', name: 'Czechia' },
  'HU': { iso2: 'HU', iso3: 'HUN', name: 'Hungary' },
  'RO': { iso2: 'RO', iso3: 'ROU', name: 'Romania' },
  'BG': { iso2: 'BG', iso3: 'BGR', name: 'Bulgaria' },
  'UA': { iso2: 'UA', iso3: 'UKR', name: 'Ukraine' },
  'AE': { iso2: 'AE', iso3: 'ARE', name: 'United Arab Emirates' },
  'SA': { iso2: 'SA', iso3: 'SAU', name: 'Saudi Arabia' },
  // Special patent office codes (not ISO standard)
  'EP': { iso2: 'EP', iso3: 'EPO', name: 'European Patent Office' },
  'WO': { iso2: 'WO', iso3: 'WO', name: 'International (PCT)' },
}

// Special patent office/regional codes (not country-specific)
const SPECIAL_REGIONS = ['EP', 'WO', 'PCT']

function isSpecialRegion(code: string): boolean {
  return SPECIAL_REGIONS.includes(code.toUpperCase())
}

function getCountryInfo(code: string): CountryInfo {
  const upperCode = code.toUpperCase()
  return COUNTRY_DATA[upperCode] || {
    iso2: upperCode,
    iso3: upperCode,
    name: upperCode
  }
}

function parseTotal(value: string | undefined): number {
  const parsed = parseInt(value || '0', 10)
  return isNaN(parsed) ? 0 : parsed
}

function removeBOM(content: string): string {
  return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content
}

interface CountryData {
  country: string
  total: number
}

interface WorldMapData {
  country: string
  code: string
  total: number
}

interface Dataset {
  map: WorldMapData[]
  list: CountryData[]
}

interface SpecialRegionData {
  code: string
  name: string
  total: number
}

interface GeographicData {
  familyData: Dataset
  priorityData: Dataset
  // Special regions (non-country codes like EPO, WO, etc.)
  familySpecialRegions: SpecialRegionData[]
  prioritySpecialRegions: SpecialRegionData[]
  // Legacy fields for backward compatibility
  countries: CountryData[]
  worldMap: WorldMapData[]
  filingTrends: any[]
}

type GeographicResponse =
  | { success: true; data: GeographicData }
  | { success: false; error: string }

function loadCsvData(filename: string, dir: string = 'raw'): any[] {
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

interface ProcessedData {
  dataset: Dataset
  specialRegions: SpecialRegionData[]
}

function processCountryData(records: any[], codeKey: string, totalKey: string): ProcessedData {
  const validRecords: Array<{ countryInfo: CountryInfo; total: number }> = []
  const specialRegions: SpecialRegionData[] = []

  for (const row of records) {
    const code = row[codeKey]?.trim()
    const total = parseTotal(row[totalKey])

    if (!code) {
      console.warn(`Skipping row with missing country code`)
      continue
    }

    const countryInfo = getCountryInfo(code)

    // Separate special regions from countries
    if (isSpecialRegion(code)) {
      specialRegions.push({
        code: countryInfo.iso2,
        name: countryInfo.name,
        total
      })
    } else {
      validRecords.push({ countryInfo, total })
    }
  }

  const mapData: WorldMapData[] = validRecords.map(({ countryInfo, total }) => ({
    country: countryInfo.name,
    code: countryInfo.iso3,
    total
  }))

  const listData: CountryData[] = validRecords
    .map(({ countryInfo, total }) => ({
      country: countryInfo.name,
      total
    }))
    .sort((a, b) => b.total - a.total)

  // Sort special regions by total
  specialRegions.sort((a, b) => b.total - a.total)

  console.log(`✓ Processed ${mapData.length} country records and ${specialRegions.length} special regions`)

  return {
    dataset: { map: mapData, list: listData },
    specialRegions
  }
}

async function getGeographicData(): Promise<GeographicResponse> {
  try {
    console.log('=== Geographic Data Processing Started ===')

    // Load and process Family Data
    const familyRecords = loadCsvData('All_Family_Country_Map.csv', 'raw')
    const familyProcessed = processCountryData(familyRecords, CSV_COLUMNS.FAMILY_COUNTRY, CSV_COLUMNS.TOTAL)

    // Load and process Priority Data
    const priorityRecords = loadCsvData('Priority_Country_Map.csv', 'raw')
    const priorityProcessed = processCountryData(priorityRecords, CSV_COLUMNS.PRIORITY_COUNTRY, CSV_COLUMNS.TOTAL)

    // Load Filing Trends (Optional - returns empty array if missing)
    let trendRecords: any[] = []
    try {
      trendRecords = loadCsvData('Patenting_Trends.csv', 'raw')
    } catch (error) {
      console.warn('Filing trends data not available:', error)
    }

    const data: GeographicData = {
      familyData: familyProcessed.dataset,
      priorityData: priorityProcessed.dataset,
      familySpecialRegions: familyProcessed.specialRegions,
      prioritySpecialRegions: priorityProcessed.specialRegions,
      // Legacy fields for backward compatibility - to be deprecated
      countries: familyProcessed.dataset.list,
      worldMap: familyProcessed.dataset.map,
      filingTrends: trendRecords
    }

    console.log('=== Geographic Data Processing Completed ===')

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Error getting geographic data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const result = await getGeographicData()

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