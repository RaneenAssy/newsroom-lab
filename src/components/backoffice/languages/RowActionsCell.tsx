'use client'
import { ConfirmationModal, toast, useModal } from '@payloadcms/ui'
import type { DefaultCellComponentProps, UIFieldClient } from 'payload'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import { MaterialIcon } from '../icons/MenuIcon'

/** Actions column: production's ⋮ menu with Edit and Delete (Delete asks for confirmation first). */
export const RowActionsCell: React.FC<DefaultCellComponentProps<UIFieldClient>> = ({ rowData, collectionSlug }) => {
  const id = String(rowData.id)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const { openModal } = useModal()
  const router = useRouter()
  const modalSlug = `delete-${collectionSlug}-${id}`

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const remove = async () => {
    const response = await fetch(`/api/${collectionSlug}/${id}`, { method: 'DELETE', credentials: 'include' })
    if (response.ok) {
      toast.success('Deleted')
      router.refresh()
    } else toast.error('Could not delete')
  }

  return (
    <div className="uaf-row-actions" ref={root}>
      <button aria-expanded={open} aria-label="Row actions" className="uaf-icon-button" onClick={(event) => { event.stopPropagation(); setOpen(!open) }} type="button">
        <MaterialIcon name="MoreVert" />
      </button>
      {open && (
        <div className="uaf-popover uaf-popover--menu" role="menu">
          <Link className="uaf-popover__item" href={`/admin/collections/${collectionSlug}/${id}`} prefetch={false} role="menuitem">
            Edit
          </Link>
          <button className="uaf-popover__item uaf-popover__item--danger" onClick={() => { setOpen(false); openModal(modalSlug) }} role="menuitem" type="button">
            Delete
          </button>
        </div>
      )}
      <ConfirmationModal body={`Are you sure you want to delete "${String(rowData.name ?? id)}"?`} confirmLabel="Delete" heading="Delete language" modalSlug={modalSlug} onConfirm={remove} />
    </div>
  )
}
