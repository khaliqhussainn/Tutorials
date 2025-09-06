// app/auth/signin/page.tsx - REDIRECT LOOP FIX
'use client'

import { useState, Suspense, useEffect } from 'react'
import { signIn, getSession, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [redirectAttempts, setRedirectAttempts] = useState(0)
  
  const router = useRouter()
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  // FIXED: Prevent redirect loops
  useEffect(() => {
    // Don't redirect if we're already redirecting or have tried too many times
    if (redirecting || redirectAttempts >= 3) {
      console.log('Skipping redirect due to loop prevention')
      return
    }

    console.log('SignIn Page - Session Check:', {
      status,
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      callbackUrl,
      redirectAttempts
    })

    if (status === 'authenticated' && session?.user?.id) {
      console.log('User is authenticated, setting up redirect...')
      setRedirecting(true)
      setRedirectAttempts(prev => prev + 1)
      
      // Add a delay to prevent immediate redirect loops
      setTimeout(() => {
        console.log('Executing redirect after delay')
        
        // Decode the callback URL properly
        const decodedUrl = decodeURIComponent(callbackUrl)
        console.log('Decoded callback URL:', decodedUrl)
        
        // Use router.push instead of window.location for better control
        router.push(decodedUrl)
        
        // If it doesn't work after 2 seconds, try a different approach
        setTimeout(() => {
          if (window.location.pathname === '/auth/signin') {
            console.log('Still on signin page, trying alternative redirect')
            
            // Try just the path without query params
            const urlPath = decodedUrl.split('?')[0]
            router.push(urlPath)
          }
        }, 2000)
        
      }, 500) // 500ms delay
    }
  }, [status, session, callbackUrl, redirecting, redirectAttempts, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

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
        return
      }

      if (result?.ok) {
        console.log('Sign in successful, will redirect via useEffect')
        // Let the useEffect handle the redirect
        setLoading(false)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Show different states
  if (status === 'loading') {
    return <LoadingState message="Checking authentication..." />
  }

  if (redirecting) {
    return (
      <LoadingState 
        message={`Redirecting to ${decodeURIComponent(callbackUrl)}...`} 
        showRetry={redirectAttempts >= 2}
        onRetry={() => {
          setRedirecting(false)
          setRedirectAttempts(0)
        }}
      />
    )
  }

  // Emergency escape for infinite loops
  if (redirectAttempts >= 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Redirect Issue Detected</h2>
            <p className="text-gray-600 mb-4">
              You're authenticated but there's a redirect loop. Try these options:
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => router.push('/admin')}
                className="w-full"
              >
                Go to Admin Panel
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="w-full"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={() => {
                  setRedirecting(false)
                  setRedirectAttempts(0)
                }}
                variant="ghost"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display font-bold text-dark-900">
            Welcome Back
          </CardTitle>
          <p className="text-dark-600">Sign in to continue your learning journey</p>
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

          {/* Debug section */}
          <div className="mt-4 p-2 bg-gray-50 rounded text-xs text-gray-600">
            <p>Status: {status}</p>
            <p>Authenticated: {!!session}</p>
            <p>Redirect attempts: {redirectAttempts}</p>
            <p>Callback: {decodeURIComponent(callbackUrl)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingState({ 
  message, 
  showRetry = false, 
  onRetry 
}: { 
  message: string
  showRetry?: boolean
  onRetry?: () => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
          <p className="mt-4 text-dark-600">{message}</p>
          {showRetry && onRetry && (
            <Button 
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Cancel Redirect
            </Button>
          )}
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