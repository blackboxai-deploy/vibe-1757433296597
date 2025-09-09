import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Praktikant Kanban Board - Lightning Web Component Preview',
  description: 'Preview of the Salesforce Lightning Web Component for Praktikant attendance management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  )
}