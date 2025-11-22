'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import components to avoid SSR issues
const GeographicAnalysis = dynamic(() => import('./components/GeographicAnalysis'), { ssr: false })
const EntityAnalysis = dynamic(() => import('./components/EntityAnalysis'), { ssr: false })
const TimelineAnalysis = dynamic(() => import('./components/TimelineAnalysis'), { ssr: false })

const menuItems = [
  { id: 'geographic', label: 'Geographic Analysis', icon: '📍', color: 'blue' },
  { id: 'entity', label: 'Entity Analysis', icon: '👥', color: 'purple' },
  { id: 'timeline', label: 'Timeline Analysis', icon: '📈', color: 'green' },
  { id: 'classification', label: 'Classification: IPC/CPC Codes', icon: '🏷️', color: 'yellow' },
  { id: 'norway', label: 'Norway', icon: '🇳🇴', color: 'red' },
  { id: 'methods23', label: 'Methods 2/3 Analysis', icon: '🔬', color: 'orange' },
]

type MenuItem = typeof menuItems[0]

export default function Home() {
  const [currentPage, setCurrentPage] = useState<string>('geographic')

  const renderContent = () => {
    if (currentPage === 'geographic') {
      return (
        <div className="fade-in">
          <GeographicAnalysis />
        </div>
      )
    }

    if (currentPage === 'entity') {
      return (
        <div className="fade-in">
          <EntityAnalysis />
        </div>
      )
    }

    if (currentPage === 'timeline') {
      return (
        <div className="fade-in">
          <TimelineAnalysis />
        </div>
      )
    }

    const contentMap: { [key: string]: JSX.Element } = {
      classification: (
        <div className="fade-in">
          <div className="card">
            <h2 className="card-header">🏷️ Classification: IPC/CPC Codes</h2>
            <p className="text-gray-600 mb-6">Patents classified by IPC and CPC standards</p>
            <div className="info-box-warning">
              <p className="text-orange-900 font-medium">Classification analysis coming soon...</p>
            </div>
          </div>
        </div>
      ),

      norway: (
        <div className="fade-in">
          <div className="card">
            <h2 className="card-header">🇳🇴 Norway</h2>
            <p className="text-gray-600 mb-6">Deep dive into Norwegian patent filings</p>
            <div className="info-box-warning">
              <p className="text-orange-900 font-medium">Norway analysis coming soon...</p>
            </div>
          </div>
        </div>
      ),

      methods23: (
        <div className="fade-in">
          <div className="card border-2 border-orange-500">
            <h2 className="card-header">🔬 Methods 2/3 Analysis</h2>
            <p className="text-gray-600 mb-6">Advanced analysis of patent methodologies</p>
            <div className="info-box-warning">
              <p className="text-orange-900 font-medium">Methods analysis coming soon...</p>
            </div>
          </div>
        </div>
      ),
    }

    return contentMap[currentPage] || <div className="card">Page not found</div>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="sidebar w-72 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            📊 PatentLab
          </h1>
          <p className="text-xs text-gray-500 mt-1">Patent Analytics Platform</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase px-3 mb-4 tracking-wider">
            Analysis Modules
          </h2>

          {menuItems.map((item: MenuItem) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`sidebar-nav-item w-full text-left ${currentPage === item.id ? 'active' : ''
                } ${item.id === 'methods23' && currentPage !== 'methods23'
                  ? 'border-2 border-orange-400'
                  : ''
                }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p className="font-semibold">Patent Dashboard v1.0</p>
            <p>Quantum Computing (G06N10)</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Patent Landscape Analysis</h1>
          <p className="text-gray-600 mt-2 text-base">
            Explore patent filing trends across regions, assignees, and jurisdictions
          </p>

          <div className="info-box mt-4">
            <p className="text-blue-900 text-sm">
              <strong>About This Analysis:</strong> This patent landscape analysis provides
              insights and analytical approaches specifically for Class G06N10 (quantum computing
              technologies). Data visualization includes geographic distributions, entity analysis,
              and temporal trends.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="p-8 max-w-[1600px] mx-auto">{renderContent()}</div>
        </div>
      </main>
    </div>
  )
}