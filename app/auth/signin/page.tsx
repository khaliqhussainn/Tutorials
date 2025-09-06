// app/auth/signin/page.tsx - Course Website
'use client'

import { useState, Suspense, useEffect, useRef } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eye, EyeOff, AlertCircle, ExternalLink, ArrowLeft, Home } from 'lucide-react'
import LoaderComponent, { PageLoader } from '@/components/layout/Loader'

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

  // IMMEDIATE redirect for authenticated users
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !hasAttemptedRedirect.current) {
      hasAttemptedRedirect.current = true
      
      const targetUrl = decodeURIComponent(callbackUrl)
      console.log('Force redirecting authenticated user to:', targetUrl)
      
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Back to Home Button */}
        <div className="absolute top-6 left-6 z-50">
          <Link href="/">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">Welcome Back!</h1>
                <p className="text-white/70">You're successfully signed in</p>
                
                <div className="mt-6 p-4 bg-white/10 rounded-xl border border-white/20">
                  <p className="text-sm text-white/80 mb-2">Redirecting to:</p>
                  <p className="text-white font-medium text-sm break-all">{targetUrl}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <Button
                  onClick={handleManualRedirect}
                  className="w-full bg-gradient-to-r from-[#001e62] to-purple-600 hover:from-[#001e62]/80 hover:to-purple-700 text-white border-0 h-12 rounded-xl font-medium"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Go to Destination
                </Button>
                
                <Button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10 h-12 rounded-xl"
                >
                  Sign Out & Use Different Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show loading while checking auth status
  if (status === 'loading') {
    return <PageLoader message="Checking authentication..." />
  }

  // Main signin interface
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Back to Home Button */}
      <div className="absolute top-6 left-6 z-50">
        <Link href="/">
          <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:flex w-full">
        {/* Left Side - Astronaut Illustration */}
        <div className="w-1/2 relative flex items-center justify-center p-8">
          <div className="relative z-10 text-center text-white max-w-md">
            {/* Astronaut Illustration Placeholder */}
            <div className="w-80 h-80 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-purple-400/20 to-pink-400/20 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-300/30 to-pink-300/30 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-2xl">🚀</span>
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2">Exploring new frontiers,</h2>
                <h3 className="text-xl font-medium text-purple-200">one step at a Time.</h3>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <p className="text-sm text-white/80">Beyond Earths grasp</p>
            </div>
          </div>

          {/* Background decorative elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
        </div>

        {/* Right Side - Sign In Form */}
        <div className="w-1/2 bg-white flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
              <p className="text-gray-600">Welcome back! Please sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {callbackUrl !== '/' && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">Redirecting to: {decodeURIComponent(callbackUrl)}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email or Phone no.
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-12 text-base border-gray-300 focus:border-[#001e62] focus:ring-[#001e62] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full h-12 text-base border-gray-300 focus:border-[#001e62] focus:ring-[#001e62] rounded-lg pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-[#001e62] focus:ring-[#001e62]" />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <Link href="/auth/forgot-password" className="text-sm text-[#001e62] hover:text-[#001e62]/80">
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#001e62] hover:bg-[#001e62]/90 text-white border-0 h-12 rounded-lg font-medium text-base"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <LoaderComponent size="sm" variant="minimal" color="secondary" className="mr-3" />
                    Signing In...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="text-center">
                <span className="text-sm text-gray-600">Or sign in using</span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                onClick={() => signIn('google')}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link href="/auth/signup" className="text-[#001e62] hover:text-[#001e62]/80 font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden w-full min-h-screen flex flex-col">
        {/* Mobile Hero Section */}
        <div className="flex-1 flex items-center justify-center p-6 text-white">
          <div className="text-center max-w-sm">
            {/* Mobile Astronaut Illustration */}
            <div className="w-64 h-64 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-400/20 to-pink-400/20 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-300/30 to-pink-300/30 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-xl">🚀</span>
                  </div>
                </div>
                <h2 className="text-lg font-bold mb-1">Exploring new frontiers,</h2>
                <h3 className="text-base font-medium text-purple-200">one step at a Time.</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Form Section */}
        <div className="bg-white rounded-t-3xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign In</h1>
            <p className="text-gray-600 text-sm">Welcome back! Please sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-xs">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email or Phone no.
              </label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full h-11 text-sm border-gray-300 focus:border-[#001e62] focus:ring-[#001e62] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-11 text-sm border-gray-300 focus:border-[#001e62] focus:ring-[#001e62] rounded-lg pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-[#001e62] focus:ring-[#001e62]" />
                <span className="ml-2 text-gray-600">Remember me</span>
              </label>
              <Link href="/auth/forgot-password" className="text-[#001e62] hover:text-[#001e62]/80">
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#001e62] hover:bg-[#001e62]/90 text-white border-0 h-11 rounded-lg font-medium"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoaderComponent size="sm" variant="minimal" color="secondary" className="mr-2" />
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center">
              <span className="text-sm text-gray-600">Or sign in using</span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm"
              onClick={() => signIn('google')}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-[#001e62] hover:text-[#001e62]/80 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading signin page..." />}>
      <SignInForm />
    </Suspense>
  )
}