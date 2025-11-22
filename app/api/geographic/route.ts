// app/api/geographic/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import pino from 'pino'

const logger = pino()

// ISO 2 to ISO 3 country code mapping
const ISO_2_TO_ISO_3: { [key: string]: string } = {
  'US': 'USA', 'GB': 'GBR', 'FR': 'FRA', 'DE': 'DEU', 'JP': 'JPN',
  'CN': 'CHN', 'IN': 'IND', 'CA': 'CAN', 'AU': 'AUS', 'NO': 'NOR',
  'SE': 'SWE', 'CH': 'CHE', 'NL': 'NLD', 'KR': 'KOR', 'BR': 'BRA',
  'MX': 'MEX', 'RU': 'RUS', 'ES': 'ESP', 'IT': 'ITA', 'BE': 'BEL',
  'SG': 'SGP', 'HK': 'HKG', 'TW': 'TWN', 'IL': 'ISR', 'IE': 'IRL',
  'DK': 'DNK', 'FI': 'FIN', 'PL': 'POL', 'TH': 'THA', 'MY': 'MYS',
  'PH': 'PHL', 'ID': 'IDN', 'VN': 'VNM', 'NZ': 'NZL', 'ZA': 'ZAF',
  'TR': 'TUR', 'GR': 'GRC', 'PT': 'PRT', 'CZ': 'CZE', 'HU': 'HUN',
  'RO': 'ROU', 'BG': 'BGR', 'UA': 'UKR', 'AE': 'ARE', 'SA': 'SAU',
}

const NORDIC_COUNTRY_CODES = ['DK', 'FI', 'IS', 'NO', 'SE']

interface CountryData {
  countryCode: string
  countryName: string
  iso3: string | null
  total: number
}

interface GeographicResponse {
  success: boolean
  data?: {
    familyData: CountryData[]
    priorityData: CountryData[]
    nordicFamilyData: CountryData[]
    nordicPriorityData: CountryData[]
  }
  fileInfo?: {
    familyFile: string | null
    priorityFile: string | null
  }
  error?: string
}

function iso2ToIso3(code: string): string | null {
  const cleaned = code.trim().toUpperCase()
  return ISO_2_TO_ISO_3[cleaned] || null
}

function getCountryName(code: string): string {
  const countryNames: { [key: string]: string } = {
    'EP': 'European Patent Office (No country)',
    'WO': 'International (PCT) (No country)',
    'US': 'United States', 'GB': 'United Kingdom', 'FR': 'France',
    'DE': 'Germany', 'JP': 'Japan', 'CN': 'China', 'IN': 'India',
    'CA': 'Canada', 'AU': 'Australia', 'NO': 'Norway', 'SE': 'Sweden',
    'CH': 'Switzerland', 'NL': 'Netherlands', 'KR': 'South Korea',
    'BR': 'Brazil', 'MX': 'Mexico', 'RU': 'Russia', 'ES': 'Spain',
    'IT': 'Italy', 'BE': 'Belgium', 'SG': 'Singapore', 'HK': 'Hong Kong',
    'TW': 'Taiwan', 'IL': 'Israel', 'IE': 'Ireland', 'DK': 'Denmark',
    'FI': 'Finland', 'IS': 'Iceland', 'PL': 'Poland', 'TH': 'Thailand',
    'MY': 'Malaysia', 'PH': 'Philippines', 'ID': 'Indonesia',
    'VN': 'Vietnam', 'NZ': 'New Zealand', 'ZA': 'South Africa',
    'TR': 'Turkey', 'GR': 'Greece', 'PT': 'Portugal', 'CZ': 'Czechia',
    'HU': 'Hungary', 'RO': 'Romania', 'BG': 'Bulgaria', 'UA': 'Ukraine',
    'AE': 'United Arab Emirates', 'SA': 'Saudi Arabia',
  }
  return countryNames[code.toUpperCase()] || code
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

function findCsvFile(filename: string, alternates: string[] = []): string | null {
  const baseDir = path.join(process.cwd(), 'data', 'raw')

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

function processCountryData(records: any[], countryField: string): CountryData[] {
  const processed: CountryData[] = records
    .map((row) => {
      const code = row[countryField]?.trim()
      const total = parseInt(row['Total'] || row['total'] || '0', 10)

      if (!code || isNaN(total)) {
        return null
      }

      return {
        countryCode: code,
        countryName: getCountryName(code),
        iso3: iso2ToIso3(code),
        total,
      }
    })
    .filter((item): item is CountryData => item !== null)

  return processed
}

function filterNordicData(data: CountryData[]): CountryData[] {
  return data.filter((item) => NORDIC_COUNTRY_CODES.includes(item.countryCode))
}

async function getGeographicData(): Promise<GeographicResponse> {
  try {
    // Find CSV files in data/raw directory
    const familyFile = findCsvFile('All_Family_Country_Map.csv', [
      'All_family_Country_Map.csv',
    ])
    const priorityFile = findCsvFile('Priority_Country_Map.csv', [
      'Priority_country_Map.csv',
    ])

    let familyRecords: any[] = []
    let priorityRecords: any[] = []

    if (!familyFile) {
      logger.warn('Family country data file not found in data/raw/')
    } else {
      try {
        familyRecords = await loadCsvData(familyFile)
        logger.info(`Loaded family data from: ${familyFile}`)
      } catch (error) {
        logger.error({ error }, 'Error loading family data')
      }
    }

    if (!priorityFile) {
      logger.warn('Priority country data file not found in data/raw/')
    } else {
      try {
        priorityRecords = await loadCsvData(priorityFile)
        logger.info(`Loaded priority data from: ${priorityFile}`)
      } catch (error) {
        logger.error({ error }, 'Error loading priority data')
      }
    }

    if (familyRecords.length === 0 && priorityRecords.length === 0) {
      throw new Error(
        'No country data files found. Please place CSV files in data/raw/ directory:\n' +
        '- All_Family_Country_Map.csv\n' +
        '- Priority_Country_Map.csv'
      )
    }

    // Process data
    const familyData = processCountryData(familyRecords, 'All Family Country')
    const priorityData = processCountryData(priorityRecords, 'Priority Country')
    const nordicFamilyData = filterNordicData(familyData)
    const nordicPriorityData = filterNordicData(priorityData)

    // Ensure all Nordic countries are represented
    for (const code of NORDIC_COUNTRY_CODES) {
      if (!nordicFamilyData.find((d) => d.countryCode === code)) {
        nordicFamilyData.push({
          countryCode: code,
          countryName: getCountryName(code),
          iso3: iso2ToIso3(code),
          total: 0,
        })
      }
      if (!nordicPriorityData.find((d) => d.countryCode === code)) {
        nordicPriorityData.push({
          countryCode: code,
          countryName: getCountryName(code),
          iso3: iso2ToIso3(code),
          total: 0,
        })
      }
    }

    return {
      success: true,
      data: {
        familyData,
        priorityData,
        nordicFamilyData,
        nordicPriorityData,
      },
      fileInfo: {
        familyFile,
        priorityFile,
      },
    }
  } catch (error) {
    logger.error({ error }, 'Error getting geographic data')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const data = await getGeographicData()
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