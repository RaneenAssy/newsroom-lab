'use client'
import { toast } from '@payloadcms/ui'
import type { DefaultCellComponentProps, SelectFieldClient } from 'payload'
import React, { useState } from 'react'

/** Status column: production's on/off switch (CustomSwitch), saving immediately like production's toggle. */
export const StatusSwitchCell: React.FC<DefaultCellComponentProps<SelectFieldClient>> = ({ cellData, rowData, collectionSlug }) => {
  const [active, setActive] = useState(cellData === 'active')
  const [saving, setSaving] = useState(false)
  const toggle = async () => {
    const next = !active
    setSaving(true)
    setActive(next)
    const response = await fetch(`/api/${collectionSlug}/${String(rowData.id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next ? 'active' : 'inactive' }),
    })
    setSaving(false)
    if (response.ok) toast.success(`Language ${next ? 'activated' : 'deactivated'}`)
    else {
      setActive(!next)
      toast.error('Could not change the status')
    }
  }
  return (
    <button aria-checked={active} aria-label={active ? 'Active' : 'Inactive'} className="uaf-switch" disabled={saving} onClick={(event) => { event.stopPropagation(); void toggle() }} role="switch" type="button">
      <span className="uaf-switch__thumb" />
    </button>
  )
}
