// components/admin/QuizManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Brain, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Target, 
  Clock,
  TrendingUp,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react'

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  order: number
}

interface QuizManagerProps {
  videoId: string
  videoTitle: string
  hasTranscript: boolean
  transcriptStatus?: string
  onQuizGenerated?: () => void
}

export default function QuizManager({ 
  videoId, 
  videoTitle, 
  hasTranscript, 
  transcriptStatus,
  onQuizGenerated 
}: QuizManagerProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showQuestions, setShowQuestions] = useState(false)
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)

  useEffect(() => {
    fetchQuestions()
  }, [videoId])

  const fetchQuestions = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/videos/${videoId}/quiz`)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions || [])
      }
    } catch (error) {
      console.error('Error fetching questions:', error)
      setError('Failed to load quiz questions')
    } finally {
      setLoading(false)
    }
  }

  const generateQuiz = async (regenerate = false) => {
    setGenerating(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/videos/${videoId}/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate })
      })

      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions)
        setSuccess(`Successfully ${regenerate ? 'regenerated' : 'generated'} ${data.count} quiz questions`)
        onQuizGenerated?.()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to generate quiz')
      }
    } catch (error) {
      setError('Network error while generating quiz')
    } finally {
      setGenerating(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'hard': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getQuizStatus = () => {
    if (questions.length === 0) return 'No quiz generated'
    if (hasTranscript && transcriptStatus === 'COMPLETED') return 'Generated from transcript'
    return 'Generated from video topic'
  }

  const getQuizStatusColor = () => {
    if (questions.length === 0) return 'text-gray-500'
    if (hasTranscript && transcriptStatus === 'COMPLETED') return 'text-green-600'
    return 'text-blue-600'
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-600" />
            Quiz Management
          </div>
          <Badge variant="outline" className={getQuizStatusColor()}>
            {getQuizStatus()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Quiz Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {questions.length}
            </div>
            <div className="text-sm text-blue-800">Questions</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {questions.filter(q => q.difficulty === 'easy').length}
            </div>
            <div className="text-sm text-green-800">Easy</div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600 mb-1">
              {questions.filter(q => q.difficulty === 'medium').length}
            </div>
            <div className="text-sm text-yellow-800">Medium</div>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600 mb-1">
              {questions.filter(q => q.difficulty === 'hard').length}
            </div>
            <div className="text-sm text-red-800">Hard</div>
          </div>
        </div>

        {/* Generation Info */}
        <div className="p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            AI Quiz Generation
          </h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Video:</span>
              <span className="font-medium">{videoTitle}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Transcript Available:</span>
              <div className="flex items-center">
                {hasTranscript ? (
                  <>
                    <FileText className="w-4 h-4 mr-1 text-green-600" />
                    <span className="text-green-600">Yes</span>
                    {transcriptStatus && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {transcriptStatus}
                      </Badge>
                    )}
                  </>
                ) : (
                  <span className="text-gray-500">No</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Generation Method:</span>
              <span className="font-medium">
                {hasTranscript && transcriptStatus === 'COMPLETED' 
                  ? 'Transcript-based (Preferred)' 
                  : 'Topic-based (Fallback)'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => generateQuiz(false)}
            disabled={generating || loading}
            className="flex items-center"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                {questions.length > 0 ? 'Regenerate Quiz' : 'Generate Quiz'}
              </>
            )}
          </Button>

          {questions.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowQuestions(!showQuestions)}
                disabled={loading}
              >
                {showQuestions ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Questions
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Questions
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={fetchQuestions}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </>
          )}
        </div>

        {/* Questions Preview */}
        {showQuestions && questions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Quiz Questions Preview</h4>
              <Badge variant="secondary">
                {questions.length} Questions
              </Badge>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {questions
                .sort((a, b) => a.order - b.order)
                .map((question, index) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-sm font-medium text-gray-500 mr-2">
                          Q{index + 1}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getDifficultyColor(question.difficulty)}`}
                        >
                          {question.difficulty}
                        </Badge>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {question.points} pts
                        </Badge>
                      </div>
                      <h5 className="font-medium text-gray-900 mb-2">
                        {question.question}
                      </h5>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedQuestion(
                        expandedQuestion === question.id ? null : question.id
                      )}
                    >
                      {expandedQuestion === question.id ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {expandedQuestion === question.id && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-gray-100">
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div 
                            key={optionIndex}
                            className={`p-2 rounded text-sm ${
                              optionIndex === question.correct
                                ? 'bg-green-50 border border-green-200 text-green-800'
                                : 'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            <div className="flex items-center">
                              <span className="font-medium mr-2">
                                {String.fromCharCode(65 + optionIndex)}.
                              </span>
                              <span>{option}</span>
                              {optionIndex === question.correct && (
                                <CheckCircle className="w-4 h-4 ml-2 text-green-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {question.explanation && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <div className="flex items-start">
                            <TrendingUp className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-medium text-blue-900 text-sm mb-1">
                                Explanation:
                              </div>
                              <div className="text-blue-800 text-sm">
                                {question.explanation}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Questions State */}
        {!loading && questions.length === 0 && (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Quiz Yet</h3>
            <p className="text-gray-600 mb-4">
              Generate an AI-powered quiz for this video. Questions will be based on{' '}
              {hasTranscript && transcriptStatus === 'COMPLETED' 
                ? 'the video transcript for maximum accuracy'
                : 'the video topic and description'
              }.
            </p>
            <Button onClick={() => generateQuiz(false)} disabled={generating}>
              <Brain className="w-4 h-4 mr-2" />
              Generate Quiz
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}