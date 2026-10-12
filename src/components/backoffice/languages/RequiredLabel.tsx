'use client'
import { FieldLabel } from '@payloadcms/ui'
import type { FieldLabelClientProps, UploadFieldClient } from 'payload'
import React from 'react'

/**
 * Shows the required marker on a field whose requirement is enforced by its own `validate` (production marks "Upload flag" as
 * required; here system seeding may create a language without a flag, so the field cannot be `required: true` in the schema).
 */
export const RequiredLabel: React.FC<FieldLabelClientProps<UploadFieldClient>> = ({ field, path }) => (
  <FieldLabel label={field?.label} path={path} required />
)
