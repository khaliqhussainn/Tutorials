// app/auth/signin/page.tsx - FIX FOR ACCOUNT SWITCHING ISSUES
'use client'

import { useState, Suspense, useEffect, useRef } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Eye, EyeOff, AlertCircle, Loader2, RefreshCw } from 'lucide-react'

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [sessionConflict, setSessionConflict] = useState(false)
  
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const redirectAttempted = useRef(false)
  const lastEmail = useRef<string>('')

  // Check for session conflicts when switching accounts
  useEffect(() => {
    if (session?.user?.email && lastEmail.current && 
        session.user.email !== lastEmail.current && 
        lastEmail.current !== '') {
      console.log('Session conflict detected - different user signed in')
      setSessionConflict(true)
      setError(`You're signed in as ${session.user.email}, but trying to access a different account.`)
    } else if (session?.user?.email) {
      lastEmail.current = session.user.email
      setSessionConflict(false)
    }
  }, [session])

  // Debug session data
  useEffect(() => {
    console.log('Signin Page Debug:', {
      status,
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      userEmail: session?.user?.email,
      callbackUrl: decodeURIComponent(callbackUrl),
      redirectAttempted: redirectAttempted.current,
      sessionConflict
    })
  }, [status, session, callbackUrl, sessionConflict])

  // Handle redirect for authenticated users
  useEffect(() => {
    if (status === 'authenticated' && 
        session?.user?.id && 
        !redirectAttempted.current && 
        !sessionConflict && 
        !loading) {
      
      console.log('Starting redirect process...')
      redirectAttempted.current = true
      setIsRedirecting(true)
      
      const targetUrl = decodeURIComponent(callbackUrl)
      console.log('Redirecting to:', targetUrl)
      
      // Force session refresh before redirect
      update().then(() => {
        setTimeout(() => {
          router.replace(targetUrl)
        }, 200)
      }).catch(() => {
        // If update fails, try redirect anyway
        setTimeout(() => {
          router.replace(targetUrl)
        }, 200)
      })
    }
  }, [status, session, callbackUrl, router, sessionConflict, loading, update])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setSessionConflict(false)
    redirectAttempted.current = false

    // Clear any existing session if email is different
    if (session?.user?.email && session.user.email !== email) {
      console.log('Signing out previous user before new signin')
      await signOut({ redirect: false })
      // Small delay to ensure signout completes
      await new Promise(resolve => setTimeout(resolve, 500))
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
        console.log('Sign in successful, waiting for session...')
        lastEmail.current = email
        // Don't set loading to false, let redirect happen
      } else {
        setError('Sign in failed. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleClearSession = async () => {
    console.log('Clearing session manually')
    setLoading(true)
    setSessionConflict(false)
    redirectAttempted.current = false
    lastEmail.current = ''
    
    await signOut({ redirect: false })
    
    // Clear browser cache/reload
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  const handleForceRedirect = () => {
    const targetUrl = decodeURIComponent(callbackUrl)
    console.log('Force redirecting to:', targetUrl)
    window.location.href = targetUrl
  }

  // Show loading states
  if (status === 'loading') {
    return <LoadingState message="Checking authentication..." />
  }

  if (isRedirecting && !sessionConflict) {
    return (
      <LoadingState 
        message={`Redirecting to ${decodeURIComponent(callbackUrl)}...`}
        showForceButton={true}
        onForceRedirect={handleForceRedirect}
      />
    )
  }

  // Show session conflict resolution
  if (sessionConflict) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <CardTitle className="text-xl font-bold text-dark-900">
              Account Conflict Detected
            </CardTitle>
            <p className="text-dark-600">
              You're currently signed in as a different user.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 p-3 rounded-lg text-sm">
              <p className="text-amber-800">
                Current session: <strong>{session?.user?.email}</strong>
              </p>
              <p className="text-amber-600 mt-1">
                Clear this session to sign in with a different account.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={handleForceRedirect}
                className="w-full"
              >
                Continue as {session?.user?.email}
              </Button>
              
              <Button
                onClick={handleClearSession}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sign Out & Try Again
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

          {/* Clear session option */}
          {session && (
            <div className="mt-4 text-center">
              <Button
                onClick={handleClearSession}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                Sign out current user ({session.user?.email})
              </Button>
            </div>
          )}

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

function LoadingState({ 
  message, 
  showForceButton = false, 
  onForceRedirect 
}: { 
  message: string
  showForceButton?: boolean
  onForceRedirect?: () => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
          <p className="mt-4 text-dark-600">{message}</p>
          {showForceButton && onForceRedirect && (
            <Button
              onClick={onForceRedirect}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Force Redirect
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