// components/admin/BulkTranscriptGenerator.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  Zap, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Info
} from 'lucide-react'

export default function BulkTranscriptGenerator() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const startBulkGeneration = async () => {
    if (!confirm('This will generate transcripts for ALL videos without transcripts. This may take a long time. Continue?')) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/videos/bulk-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'openai' })
      })

      const data = await response.json()

      if (response.ok) {
        setResult('Bulk transcript generation started successfully! Check the server logs for progress.')
      } else {
        setResult(`Error: ${data.error}`)
      }
    } catch (error) {
      setResult('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Bulk Transcript Generation
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Bulk Transcript Generation</p>
            <p>This will automatically generate transcripts for all videos that don't have them yet. The process runs in the background and may take several hours depending on the number of videos.</p>
          </div>
        </div>

        {result && (
          <div className={`flex items-center p-3 rounded-lg border ${
            result.includes('Error') 
              ? 'bg-red-50 border-red-200 text-red-700' 
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            {result.includes('Error') ? (
              <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            )}
            <span className="text-sm">{result}</span>
          </div>
        )}

        <div className="flex justify-center">
          <Button
            onClick={startBulkGeneration}
            disabled={loading}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Start Bulk Generation
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
