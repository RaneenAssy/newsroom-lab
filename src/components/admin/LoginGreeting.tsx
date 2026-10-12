import React from 'react'

/** `admin.components.beforeLogin`: production's greeting above Payload's own login form. */
export const LoginGreeting: React.FC = () => (
  <div className="uaf-login-greeting">
    <h1 className="uaf-login-greeting__title">Hi, Welcome Back!</h1>
    <p className="uaf-login-greeting__subtitle">Please enter your credentials!</p>
  </div>
)
