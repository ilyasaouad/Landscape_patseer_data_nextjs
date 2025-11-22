import './globals.css'

export const metadata = {
  title: 'PatentLab - Patent Landscape Analysis Dashboard',
  description: 'Advanced patent analytics and visualization platform for analyzing patent filings, geographic distributions, and technology trends in quantum computing (G06N10)',
  keywords: 'patent analysis, patent landscape, quantum computing, G06N10, patent visualization, patent analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-inter antialiased">{children}</body>
    </html>
  )
}
