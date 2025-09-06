// app/auth/signin/page.tsx - TARGETED FIX FOR CALLBACK ISSUES
'use client'

import { useState, Suspense, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
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
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  // Debug session data
  useEffect(() => {
    console.log('Signin Page Debug:', {
      status,
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      userEmail: session?.user?.email,
      callbackUrl: decodeURIComponent(callbackUrl)
    })
  }, [status, session, callbackUrl])

  // Handle redirect for authenticated users
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !isRedirecting) {
      console.log('User is authenticated, initiating redirect...')
      setIsRedirecting(true)
      
      const targetUrl = decodeURIComponent(callbackUrl)
      console.log('Redirecting to:', targetUrl)
      
      // Use timeout to ensure session is fully established
      setTimeout(() => {
        router.replace(targetUrl)
      }, 500)
    }
  }, [status, session, callbackUrl, router, isRedirecting])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Attempting sign in...')
      
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false, // Handle redirect manually
      })

      console.log('Sign in result:', result)

      if (result?.error) {
        setError('Invalid email or password')
        setLoading(false)
      } else if (result?.ok) {
        console.log('Sign in successful, waiting for session...')
        // Don't set loading to false, let redirect happen
        setIsRedirecting(true)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Show loading states
  if (status === 'loading') {
    return <LoadingState message="Checking authentication..." />
  }

  if (isRedirecting || (status === 'authenticated' && session?.user?.id)) {
    return <LoadingState message={`Redirecting to ${decodeURIComponent(callbackUrl)}...`} />
  }

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
                disabled={loading || isRedirecting}
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
                  disabled={loading || isRedirecting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-500 hover:text-dark-700"
                  disabled={loading || isRedirecting}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || isRedirecting}
            >
              {loading || isRedirecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {loading ? 'Signing In...' : 'Redirecting...'}
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

          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
              <p className="font-medium">Debug Info:</p>
              <p>Status: {status}</p>
              <p>Has Session: {!!session}</p>
              <p>User ID: {session?.user?.id}</p>
              <p>User Role: {session?.user?.role}</p>
              <p>Callback: {decodeURIComponent(callbackUrl)}</p>
              <p>Redirecting: {isRedirecting.toString()}</p>
            </div>
          )}
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