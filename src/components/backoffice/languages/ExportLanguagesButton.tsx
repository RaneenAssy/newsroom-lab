'use client'
import React, { useState } from 'react'

type LanguageRow = { name: string; code: string; appLangCode: string; rtl: string; status: string }

const csvCell = (value: string): string => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

/** Production's "Export" button (CustomMaterialTable → handleExportRows): downloads every language as CSV. */
export const ExportLanguagesButton: React.FC = () => {
  const [busy, setBusy] = useState(false)
  const exportRows = async () => {
    setBusy(true)
    try {
      const response = await fetch('/api/languages?limit=0&depth=0&sort=name', { credentials: 'include' })
      const { docs } = (await response.json()) as { docs: LanguageRow[] }
      const lines = [['Name', 'Code', 'Language Code', 'RTL', 'Status'], ...docs.map((d) => [d.name, d.code, d.appLangCode, d.rtl, d.status === 'active' ? 'Active' : 'Inactive'])]
      const blob = new Blob([lines.map((line) => line.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = Object.assign(document.createElement('a'), { href: url, download: 'languages.csv' })
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="uaf-list-toolbar">
      <button className="uaf-outline-button" disabled={busy} onClick={() => void exportRows()} type="button">
        Export
      </button>
    </div>
  )
}
