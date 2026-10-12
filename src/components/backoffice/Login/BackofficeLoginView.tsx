/* eslint-disable @next/next/no-img-element */
import type { AdminViewServerProps } from 'payload'
import { redirect } from 'next/navigation'
import React from 'react'

import { BackofficeLoginForm } from './BackofficeLoginForm'

/**
 * Replaces Payload's login screen (`admin.components.views.login`) with production's: grey page, centred white card, logo, gold
 * greeting, outlined Email/Password, "Keep me logged in", full-width gold "Sign In". Login itself is still Payload's own
 * `POST /api/staff/login` (password login on the `staff` collection; no SSO in this project).
 * The greeting texts are CMS-driven in production (auth pages); these are the values on the live screen.
 */
export const BackofficeLoginView = ({ initPageResult, searchParams }: AdminViewServerProps) => {
  const redirectTo = typeof searchParams?.redirect === 'string' && searchParams.redirect.startsWith('/') ? searchParams.redirect : '/admin'
  if (initPageResult.req.user) redirect(redirectTo)
  return (
    <div className="uaf-login">
      <div className="uaf-login__card">
        <img alt="UA Finance" className="uaf-login__logo" src="/backoffice/logo.png" width={140} />
        <h1 className="uaf-login__title">Hi, Welcome Back!</h1>
        <p className="uaf-login__subtitle">Please enter your credentials!</p>
        <BackofficeLoginForm redirectTo={redirectTo} />
      </div>
    </div>
  )
}
