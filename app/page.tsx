'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import components to avoid SSR issues
const GeographicAnalysis = dynamic(() => import('./components/GeographicAnalysis'), { ssr: false })
const EntityAnalysis = dynamic(() => import('./components/EntityAnalysis'), { ssr: false })
const TimelineAnalysis = dynamic(() => import('./components/TimelineAnalysis'), { ssr: false })
const ClassificationAnalysis = dynamic(() => import('./components/ClassificationAnalysis'), { ssr: false })

// Quantum category configurations
const quantumCategories = [
  { id: 'kvantedatamaskinvare', label: 'Kvantedatamaskinvare', class: 'G06N10/00', available: false },
  { id: 'kvantealgoritmer', label: 'Kvantealgoritmer', class: 'G06N10/20', available: true },
  { id: 'quantum-sensors', label: 'Quantum Sensors', class: 'G01N', available: false },
  { id: 'quantum-materials', label: 'Quantum Materials', class: 'C01B', available: false },
  { id: 'kvanteenheter', label: 'Kvanteenheter', class: 'G06N10/40', available: false },
  { id: 'optiske-kvanteteknologier', label: 'Optiske kvanteteknologier', class: 'G02F', available: false },
]

// Analysis menu items for each category
const analysisMenuItems = [
  { id: 'geographic', label: 'Geographic Analysis', icon: '📍' },
  { id: 'entity', label: 'Entity Analysis', icon: '👥' },
  { id: 'timeline', label: 'Timeline Analysis', icon: '📈' },
  { id: 'classification', label: 'Classification: IPC/CPC Codes', icon: '🏷️' },
  { id: 'norway', label: 'Norway Analysis', icon: '🇳🇴' },
]

type QuantumCategory = typeof quantumCategories[0]
type AnalysisMenuItem = typeof analysisMenuItems[0]

export default function Home() {
  const [currentCategory, setCurrentCategory] = useState<string>('kvantealgoritmer')
  const [currentAnalysis, setCurrentAnalysis] = useState<string>('geographic')

  // Get current category info
  const activeCategoryInfo = quantumCategories.find(cat => cat.id === currentCategory)

  const renderContent = () => {
    // Only render content for available categories
    if (!activeCategoryInfo?.available) {
      return (
        <div className="fade-in">
          <div className="card border-2 border-orange-500">
            <h2 className="card-header">🚧 Coming Soon</h2>
            <p className="text-gray-600 mb-6">
              Analysis for <strong>{activeCategoryInfo?.label}</strong> ({activeCategoryInfo?.class}) is currently under development.
            </p>
            <div className="info-box-warning">
              <p className="text-orange-900 font-medium">
                This quantum technology category will be available soon. Please check back later.
              </p>
            </div>
          </div>
        </div>
      )
    }

    // Render analysis content for Kvantealgoritmer
    if (currentAnalysis === 'geographic') {
      return (
        <div className="fade-in">
          <GeographicAnalysis />
        </div>
      )
    }

    if (currentAnalysis === 'entity') {
      return (
        <div className="fade-in">
          <EntityAnalysis />
        </div>
      )
    }

    if (currentAnalysis === 'timeline') {
      return (
        <div className="fade-in">
          <TimelineAnalysis />
        </div>
      )
    }

    if (currentAnalysis === 'classification') {
      return (
        <div className="fade-in">
          <ClassificationAnalysis />
        </div>
      )
    }

    // Coming soon pages
    const contentMap: { [key: string]: JSX.Element } = {
      norway: (
        <div className="fade-in">
          <div className="card">
            <h2 className="card-header">🇳🇴 Norway Analysis</h2>
            <p className="text-gray-600 mb-6">Deep dive into Norwegian patent filings</p>
            <div className="info-box-warning">
              <p className="text-orange-900 font-medium">Norway analysis coming soon...</p>
            </div>
          </div>
        </div>
      ),
    }

    return contentMap[currentAnalysis] || (
      <div className="card">
        <div className="info-box-warning">
          <p className="text-orange-900 font-medium">Page not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Horizontal Navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                📊 Patent Landscape Analyser
              </h1>
              <p className="text-xs text-gray-500 mt-1">Quantum Patent Analysis</p>
            </div>
          </div>

          {/* Horizontal Category Menu */}
          <nav className="flex space-x-2 overflow-x-auto">
            {quantumCategories.map((category: QuantumCategory) => (
              <button
                key={category.id}
                onClick={() => {
                  setCurrentCategory(category.id)
                  setCurrentAnalysis('geographic') // Reset to first analysis item
                }}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all
                  ${currentCategory === category.id
                    ? category.id === 'kvantealgoritmer'
                      ? 'bg-green-100 text-green-900 shadow-md border border-green-200'
                      : 'bg-blue-600 text-white shadow-md'
                    : category.available
                      ? 'bg-gray-100 text-gray-700 hover:bg-green-50'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }
                  ${!category.available && currentCategory !== category.id ? 'opacity-60' : ''}
                `}
                disabled={!category.available && currentCategory !== category.id}
              >
                <div className="flex flex-col items-start">
                  <span>{category.label}</span>
                  <span className="text-xs opacity-75">{category.class}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Analysis Types */}
        <div className="sidebar w-72 flex flex-col border-r border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-blue-50">
            <div className="text-sm font-semibold text-blue-900 mb-1">
              Current Category:
            </div>
            <div className="text-lg font-bold text-blue-700">
              {activeCategoryInfo?.label}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {activeCategoryInfo?.class}
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase px-3 mb-4 tracking-wider">
              Analysis Modules
            </h2>

            {analysisMenuItems.map((item: AnalysisMenuItem) => (
              <button
                key={item.id}
                onClick={() => setCurrentAnalysis(item.id)}
                disabled={!activeCategoryInfo?.available}
                className={`
                  sidebar-nav-item w-full text-left
                  ${currentAnalysis === item.id ? 'active' : ''}
                  ${!activeCategoryInfo?.available ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p className="font-semibold">Patent Dashboard v2.0</p>
              <p>Quantum Technologies Analysis</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Content Area */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="p-8 max-w-[1600px] mx-auto">{renderContent()}</div>
          </div>
        </main>
      </div>
    </div>
  )
}