'use client'
import React, { useState } from 'react'

import { MaterialIcon } from '../icons/MenuIcon'

type LoginError = { errors?: { message?: string }[]; message?: string }

/**
 * The login form. "Keep me logged in" is shown for parity but not wired in this spike: production implements it by storing the
 * email and password in a cookie, which is not carried over. Session length is the `staff` collection's token expiration.
 */
export const BackofficeLoginForm: React.FC<{ redirectTo: string }> = ({ redirectTo }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keepLoggedIn, setKeepLoggedIn] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/staff/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as LoginError
        setError(body.errors?.[0]?.message ?? body.message ?? 'Login failed')
        return
      }
      window.location.assign(redirectTo) // full load, so the admin starts with the new session
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="uaf-login__form" noValidate onSubmit={submit}>
      <label className={['uaf-outlined', email && 'uaf-outlined--filled'].filter(Boolean).join(' ')}>
        <input autoComplete="email" name="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        <span className="uaf-outlined__label">Email Address</span>
      </label>
      <label className="uaf-outlined uaf-outlined--filled uaf-outlined--with-button">
        <input autoComplete="current-password" name="password" onChange={(event) => setPassword(event.target.value)} required type={showPassword ? 'text' : 'password'} value={password} />
        <span className="uaf-outlined__label">Password</span>
        <button aria-label="toggle password visibility" className="uaf-outlined__button" onClick={() => setShowPassword(!showPassword)} type="button">
          <MaterialIcon name={showPassword ? 'Visibility' : 'VisibilityOff'} />
        </button>
      </label>
      <label className="uaf-checkbox">
        <input checked={keepLoggedIn} onChange={(event) => setKeepLoggedIn(event.target.checked)} type="checkbox" />
        <span>Keep me logged in</span>
      </label>
      {error && (
        <p className="uaf-login__error" role="alert">
          {error}
        </p>
      )}
      <button className="uaf-gold-button" disabled={submitting} type="submit">
        Sign In
      </button>
    </form>
  )
}
