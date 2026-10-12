/* eslint-disable @next/next/no-img-element */
import React from 'react'

/** Full logo (production's logo.png at its 140px size) — Payload's own auth screens (create first user, forgot password). */
export const Logo: React.FC = () => (
  <img alt="UA Finance" className="uaf-logo" src="/backoffice/logo.png" style={{ width: 140, maxWidth: '100%', height: 'auto' }} />
)
