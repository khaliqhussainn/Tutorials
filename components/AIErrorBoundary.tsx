// components/AIErrorBoundary.tsx
import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface AIErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class AIErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AIErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): AIErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AI Features Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            AI Features Temporarily Unavailable
          </h3>
          <p className="text-red-700 text-center mb-4">
            We're experiencing technical difficulties with AI features. 
            Please try refreshing or continue with other learning tools.
          </p>
          <Button
            onClick={() => this.setState({ hasError: false })}
            variant="outline"
            className="text-red-700 border-red-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}