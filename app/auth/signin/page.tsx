// app/auth/signin/page.tsx - DIRECT REDIRECT FIX
'use client'

import { useState, Suspense, useEffect, useRef } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Eye, EyeOff, AlertCircle, Loader2, ExternalLink } from 'lucide-react'

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const hasAttemptedRedirect = useRef(false)

  // IMMEDIATE redirect for authenticated users - use window.location for reliability
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !hasAttemptedRedirect.current) {
      hasAttemptedRedirect.current = true
      
      const targetUrl = decodeURIComponent(callbackUrl)
      console.log('Force redirecting authenticated user to:', targetUrl)
      
      // Use window.location.replace for most reliable redirect
      setTimeout(() => {
        window.location.replace(targetUrl)
      }, 100)
    }
  }, [status, session, callbackUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    hasAttemptedRedirect.current = false

    // If trying to sign in with different email, sign out first
    if (session?.user?.email && session.user.email !== email) {
      console.log('Different user detected, signing out first')
      await signOut({ redirect: false })
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    try {
      console.log('Attempting sign in for:', email)
      
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      console.log('Sign in result:', result)

      if (result?.error) {
        setError('Invalid email or password')
        setLoading(false)
      } else if (result?.ok) {
        console.log('Sign in successful - forcing immediate redirect')
        
        // Don't wait for useEffect, redirect immediately
        const targetUrl = decodeURIComponent(callbackUrl)
        setTimeout(() => {
          window.location.replace(targetUrl)
        }, 500)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleManualRedirect = () => {
    const targetUrl = decodeURIComponent(callbackUrl)
    console.log('Manual redirect to:', targetUrl)
    window.location.href = targetUrl
  }

  // If user is already authenticated, show redirect interface
  if (status === 'authenticated' && session?.user?.id) {
    const targetUrl = decodeURIComponent(callbackUrl)
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-xl font-bold text-dark-900">
              Already Signed In
            </CardTitle>
            <p className="text-dark-600">
              You're signed in as <strong>{session.user.name || session.user.email}</strong>
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium text-blue-900">Redirect Target:</p>
              <p className="text-blue-700 break-all">{targetUrl}</p>
            </div>
            
            <Button
              onClick={handleManualRedirect}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Go to Destination
            </Button>
            
            <Button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              variant="outline"
              className="w-full"
            >
              Sign Out & Use Different Account
            </Button>
            
            <div className="text-center pt-2">
              <Button
                onClick={() => window.location.reload()}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading while checking auth status
  if (status === 'loading') {
    return <LoadingState message="Checking authentication..." />
  }

  // Show normal signin form
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display font-bold text-dark-900">
            Welcome Back
          </CardTitle>
          <p className="text-dark-600">Sign in to continue your learning journey</p>
          {callbackUrl !== '/' && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
              Redirecting to: {decodeURIComponent(callbackUrl)}
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-dark-700">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-dark-700">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-500 hover:text-dark-700"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-dark-600">
              Don't have an account?{' '}
              <Link 
                href="/auth/signup" 
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link 
              href="/" 
              className="text-sm text-dark-500 hover:text-dark-700"
            >
              Continue as guest
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
          <p className="mt-4 text-dark-600">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading..." />}>
      <SignInForm />
    </Suspense>
  )
}