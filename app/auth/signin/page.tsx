// app/auth/signin/page.tsx - PRODUCTION ROBUST VERSION
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
  
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  // Enhanced redirect logic for authenticated users
  useEffect(() => {
    console.log('SignIn Page - Session Check:', {
      status,
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      callbackUrl
    })

    if (status === 'authenticated' && session?.user?.id) {
      console.log('User is authenticated, initiating redirect...')
      setRedirecting(true)
      
      // For admin routes, use window.location for hard redirect
      if (callbackUrl.includes('/admin')) {
        console.log('Admin route detected, using hard redirect')
        window.location.replace(callbackUrl)
      } else {
        console.log('Regular route, using router push')
        router.replace(callbackUrl)
      }
    }
  }, [status, session, callbackUrl, router])

  // Additional check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const existingSession = await getSession()
        console.log('Existing session check:', existingSession)
        
        if (existingSession?.user?.id) {
          console.log('Found existing session, redirecting...')
          setRedirecting(true)
          
          if (callbackUrl.includes('/admin')) {
            window.location.replace(callbackUrl)
          } else {
            router.replace(callbackUrl)
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error)
      }
    }

    if (status === 'unauthenticated') {
      checkExistingSession()
    }
  }, [status, callbackUrl, router])

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
        console.log('Sign in successful, establishing session...')
        setRedirecting(true)
        
        // Force session refresh
        await update()
        
        // Multiple attempts to establish session
        let sessionEstablished = false
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 300))
          
          const freshSession = await getSession()
          console.log(`Session establishment attempt ${i + 1}:`, {
            hasSession: !!freshSession,
            userId: freshSession?.user?.id,
            userRole: freshSession?.user?.role
          })
          
          if (freshSession?.user?.id) {
            sessionEstablished = true
            console.log('Session established successfully')
            
            // For admin routes or any issues, force hard redirect
            if (callbackUrl.includes('/admin') || i > 5) {
              console.log('Using hard redirect for reliability')
              window.location.replace(callbackUrl)
            } else {
              router.replace(callbackUrl)
            }
            return
          }
        }
        
        if (!sessionEstablished) {
          console.error('Failed to establish session, using fallback redirect')
          // Fallback to hard redirect
          window.location.replace(callbackUrl)
        }
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError('An error occurred. Please try again.')
      setLoading(false)
      setRedirecting(false)
    }
  }

  // Show loading states
  if (status === 'loading') {
    return <LoadingState message="Checking authentication..." />
  }

  if (redirecting) {
    return <LoadingState message="Redirecting..." />
  }

  // Show signin form only if definitely not authenticated
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

          {/* Emergency admin access button for production debugging */}
          {process.env.NODE_ENV === 'production' && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  console.log('Emergency redirect to admin')
                  window.location.replace('/admin')
                }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Emergency Admin Access
              </button>
            </div>
          )}

          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
              <p>Debug Info:</p>
              <p>Status: {status}</p>
              <p>Callback URL: {callbackUrl}</p>
              <p>Has Session: {!!session}</p>
              <p>User ID: {session?.user?.id}</p>
              <p>User Role: {session?.user?.role}</p>
              <p>Redirecting: {redirecting.toString()}</p>
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