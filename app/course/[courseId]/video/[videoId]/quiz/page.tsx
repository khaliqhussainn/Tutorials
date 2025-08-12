// app/course/[courseId]/video/[videoId]/quiz/page.tsx - Separate Quiz Page
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Target, 
  Award,
  XCircle,
  AlertCircle,
  RefreshCw,
  PlayCircle,
  BookOpen,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  HelpCircle,
  Brain,
  Zap,
  RotateCcw
} from 'lucide-react'

interface Test {
  id: string
  question: string
  options: string[]
  correct: number
  explanation?: string
}

interface Video {
  id: string
  title: string
  description?: string
  duration?: number
  tests: Test[]
}

interface Course {
  id: string
  title: string
}

interface QuizAttempt {
  score: number
  passed: boolean
  answers: number[]
  attemptNumber: number
  timeSpent: number
  completedAt: string
}

export default function QuizPage({ 
  params 
}: { 
  params: { courseId: string; videoId: string } 
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [video, setVideo] = useState<Video | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<number>(-1)
  const [showResults, setShowResults] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [timeSpent, setTimeSpent] = useState(0)
  const [previousAttempts, setPreviousAttempts] = useState<QuizAttempt[]>([])
  const [showPreviousAttempts, setShowPreviousAttempts] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  useEffect(() => {
    if (session) {
      fetchQuizData()
      fetchPreviousAttempts()
    }
  }, [params.videoId, session])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (quizStarted && startTime && !showResults) {
      interval = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTime.getTime()) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [quizStarted, startTime, showResults])

  const fetchQuizData = async () => {
    try {
      const [videoResponse, courseResponse] = await Promise.all([
        fetch(`/api/videos/${params.videoId}`),
        fetch(`/api/courses/${params.courseId}`)
      ])

      if (videoResponse.ok && courseResponse.ok) {
        const videoData = await videoResponse.json()
        const courseData = await courseResponse.json()
        setVideo(videoData)
        setCourse(courseData)
        
        // Initialize answers array
        setAnswers(new Array(videoData.tests.length).fill(-1))
      }
    } catch (error) {
      console.error('Error fetching quiz data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPreviousAttempts = async () => {
    try {
      const response = await fetch(`/api/videos/${params.videoId}/quiz-attempts`)
      if (response.ok) {
        const attempts = await response.json()
        setPreviousAttempts(attempts)
      }
    } catch (error) {
      console.error('Error fetching previous attempts:', error)
    }
  }

  const startQuiz = () => {
    setQuizStarted(true)
    setStartTime(new Date())
    setCurrentQuestionIndex(0)
    setAnswers(new Array(video!.tests.length).fill(-1))
    setSelectedAnswer(-1)
    setShowResults(false)
    setShowExplanation(false)
  }

  const handleAnswerSelect = (optionIndex: number) => {
    setSelectedAnswer(optionIndex)
    
    // Update answers array
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = optionIndex
    setAnswers(newAnswers)
  }

  const handleNext = () => {
    if (currentQuestionIndex < video!.tests.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(answers[currentQuestionIndex + 1])
      setShowExplanation(false)
    } else {
      submitQuiz()
    }
  }

  const handlePrevious = () => {
    setCurrentQuestionIndex(currentQuestionIndex - 1)
    setSelectedAnswer(answers[currentQuestionIndex - 1])
    setShowExplanation(false)
  }

  const jumpToQuestion = (questionIndex: number) => {
    setCurrentQuestionIndex(questionIndex)
    setSelectedAnswer(answers[questionIndex])
    setShowExplanation(false)
  }

  const submitQuiz = async () => {
    setSubmitting(true)
    
    try {
      const correctAnswers = answers.filter((answer, index) => 
        answer === video!.tests[index].correct
      ).length
      
      const score = Math.round((correctAnswers / video!.tests.length) * 100)
      const passed = score >= 70
      const attemptNumber = previousAttempts.length + 1

      const response = await fetch(`/api/progress/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: params.videoId,
          answers: answers,
          score,
          passed,
          timeSpent,
          attemptNumber
        })
      })

      if (response.ok) {
        setShowResults(true)
        await fetchPreviousAttempts()
      }
    } catch (error) {
      console.error('Error submitting quiz:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const calculateResults = () => {
    const correctAnswers = answers.filter((answer, index) => 
      answer === video!.tests[index].correct
    ).length
    
    return {
      correct: correctAnswers,
      total: video!.tests.length,
      score: Math.round((correctAnswers / video!.tests.length) * 100),
      passed: (correctAnswers / video!.tests.length) * 100 >= 70
    }
  }

  const getQuestionStatus = (index: number) => {
    if (answers[index] === -1) return 'unanswered'
    if (showResults) {
      return answers[index] === video!.tests[index].correct ? 'correct' : 'incorrect'
    }
    return 'answered'
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getBestAttempt = () => {
    if (previousAttempts.length === 0) return null
    return previousAttempts.reduce((best, current) => 
      current.score > best.score ? current : best
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">
              You need to sign in to take quizzes and track your progress.
            </p>
            <Link href="/auth/signin">
              <Button size="lg">Sign In to Continue</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (!video || !course || !video.tests.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-8">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-4">No Quiz Available</h2>
            <p className="text-gray-600 mb-6">
              This video doesn't have a quiz associated with it.
            </p>
            <Link href={`/course/${params.courseId}/video/${params.videoId}`}>
              <Button>Back to Video</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const results = showResults ? calculateResults() : null
  const bestAttempt = getBestAttempt()
  const currentQuestion = video.tests[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === video.tests.length - 1
  const isFirstQuestion = currentQuestionIndex === 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header - Udemy Style */}
      <div className="bg-gray-900 text-white px-4 py-3 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <Link 
              href={`/course/${params.courseId}/video/${params.videoId}`}
              className="flex items-center text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-medium">Back to lecture</span>
            </Link>
            
            <div className="hidden md:block">
              <h1 className="font-semibold truncate max-w-md">Quiz: {video.title}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {quizStarted && !showResults && (
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeSpent)}</span>
              </div>
            )}
            <Badge variant="secondary">{course.title}</Badge>
          </div>
        </div>
      </div>

      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quiz Start Screen */}
          {!quizStarted && !showResults && (
            <div className="max-w-2xl mx-auto">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Brain className="w-10 h-10 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Ready to test your knowledge?
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                      This quiz contains {video.tests.length} questions and should take about {Math.ceil(video.tests.length * 1.5)} minutes to complete.
                      You need a score of 70% or higher to pass.
                    </p>
                  </div>

                  {/* Quiz Info Grid */}
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-2xl font-bold text-purple-600 mb-1">
                        {video.tests.length}
                      </div>
                      <div className="text-sm text-purple-800">Questions</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600 mb-1">70%</div>
                      <div className="text-sm text-green-800">Passing Score</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {previousAttempts.length}
                      </div>
                      <div className="text-sm text-blue-800">
                        Previous Attempt{previousAttempts.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Previous Attempts */}
                  {previousAttempts.length > 0 && (
                    <div className="mb-8">
                      <button
                        onClick={() => setShowPreviousAttempts(!showPreviousAttempts)}
                        className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-4"
                      >
                        {showPreviousAttempts ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                        {showPreviousAttempts ? 'Hide' : 'Show'} Previous Attempts
                      </button>

                      {showPreviousAttempts && (
                        <div className="space-y-3">
                          {previousAttempts.map((attempt, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                              <div className="flex items-center space-x-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                                  attempt.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  #{index + 1}
                                </div>
                                <div>
                                  <div className="font-medium flex items-center">
                                    Score: {attempt.score}% 
                                    {attempt.passed && <CheckCircle className="inline w-4 h-4 text-green-600 ml-2" />}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {formatTime(attempt.timeSpent)} • {new Date(attempt.completedAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <Badge variant={attempt.passed ? "default" : "secondary"} className={
                                attempt.passed ? 'bg-green-100 text-green-800' : ''
                              }>
                                {attempt.passed ? 'Passed' : 'Failed'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}

                      {bestAttempt && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center">
                            <Award className="w-5 h-5 text-blue-600 mr-2" />
                            <span className="font-medium text-blue-800">
                              Best Score: {bestAttempt.score}%
                              {bestAttempt.passed && ' (Passed)'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Start Button */}
                  <div className="text-center">
                    <Button
                      size="lg"
                      onClick={startQuiz}
                      className="min-w-48 bg-purple-600 hover:bg-purple-700"
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      {previousAttempts.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quiz Questions */}
          {quizStarted && !showResults && (
            <div className="max-w-3xl mx-auto">
              {/* Progress Header */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-600 mb-3">
                  <span>Question {currentQuestionIndex + 1} of {video.tests.length}</span>
                  <span>{Math.round(((currentQuestionIndex + 1) / video.tests.length) * 100)}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / video.tests.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Navigation Pills */}
              <div className="flex flex-wrap gap-2 mb-8 justify-center">
                {video.tests.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => jumpToQuestion(index)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                      index === currentQuestionIndex
                        ? 'bg-purple-600 text-white'
                        : getQuestionStatus(index) === 'answered'
                        ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {/* Current Question */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">
                    {currentQuestion.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                          selectedAnswer === index
                            ? 'border-purple-500 bg-purple-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center ${
                            selectedAnswer === index
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedAnswer === index && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>
                          <span className="text-gray-900">{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Show Explanation */}
                  {selectedAnswer !== -1 && currentQuestion.explanation && (
                    <div className="mt-4">
                      <button
                        onClick={() => setShowExplanation(!showExplanation)}
                        className="flex items-center text-purple-600 hover:text-purple-700 text-sm"
                      >
                        <HelpCircle className="w-4 h-4 mr-1" />
                        {showExplanation ? 'Hide' : 'Show'} explanation
                      </button>
                      
                      {showExplanation && (
                        <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-blue-800 text-sm">{currentQuestion.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between items-center pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={isFirstQuestion}
                      className="flex items-center"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>

                    <div className="text-center">
                      {selectedAnswer === -1 ? (
                        <p className="text-sm text-gray-500">Select an answer to continue</p>
                      ) : (
                        <div className="flex items-center justify-center text-purple-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span className="text-sm">Answer selected</span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleNext}
                      disabled={selectedAnswer === -1 || submitting}
                      className="flex items-center min-w-32 bg-purple-600 hover:bg-purple-700"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Submitting...
                        </>
                      ) : isLastQuestion ? (
                        <>
                          Submit Quiz
                          <Target className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quiz Tips */}
              <Card className="mt-6 border-purple-200 bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-start">
                    <HelpCircle className="w-5 h-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-purple-800">
                      <p className="font-medium mb-1">Quiz Tips:</p>
                      <ul className="space-y-1 text-purple-700">
                        <li>• You can navigate between questions using the numbered buttons above</li>
                        <li>• Take your time - there's no time limit for individual questions</li>
                        <li>• You need 70% or higher to pass this quiz</li>
                        <li>• You can retake this quiz if needed</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quiz Results */}
          {showResults && results && (
            <div className="max-w-2xl mx-auto">
              <Card className={`border-2 shadow-lg ${
                results.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <CardContent className="p-8 text-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                    results.passed ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {results.passed ? (
                      <Award className="w-10 h-10 text-green-600" />
                    ) : (
                      <XCircle className="w-10 h-10 text-red-600" />
                    )}
                  </div>
                  
                  <h2 className={`text-3xl font-bold mb-4 ${
                    results.passed ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {results.passed ? 'Congratulations!' : 'Keep Learning!'}
                  </h2>
                  
                  <div className="mb-6">
                    <div className={`text-4xl font-bold mb-2 ${
                      results.passed ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {results.score}%
                    </div>
                    <p className={`text-lg ${
                      results.passed ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {results.correct} out of {results.total} questions correct
                    </p>
                  </div>

                  {/* Performance Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {formatTime(timeSpent)}
                      </div>
                      <div className="text-sm text-gray-600">Time Taken</div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {previousAttempts.length + 1}
                      </div>
                      <div className="text-sm text-gray-600">
                        Attempt{previousAttempts.length > 0 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {results.passed ? (
                      <p className="text-green-600 text-lg">
                        Excellent work! You've successfully completed this quiz and can now continue to the next lecture.
                      </p>
                    ) : (
                      <p className="text-red-600 text-lg">
                        You need at least 70% to pass. Review the lecture content and try again when you're ready.
                      </p>
                    )}
                    
                    <div className="flex items-center justify-center space-x-4">
                      {results.passed ? (
                        <>
                          <Link href={`/course/${params.courseId}/video/${params.videoId}`}>
                            <Button size="lg" className="flex items-center">
                              <PlayCircle className="w-5 h-5 mr-2" />
                              Back to Lecture
                            </Button>
                          </Link>
                          <Link href={`/course/${params.courseId}`}>
                            <Button variant="outline" size="lg" className="flex items-center">
                              <BookOpen className="w-5 h-5 mr-2" />
                              Course Overview
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <>
                          <Button 
                            size="lg" 
                            onClick={startQuiz}
                            className="flex items-center bg-purple-600 hover:bg-purple-700"
                          >
                            <RefreshCw className="w-5 h-5 mr-2" />
                            Retake Quiz
                          </Button>
                          <Link href={`/course/${params.courseId}/video/${params.videoId}`}>
                            <Button variant="outline" size="lg" className="flex items-center">
                              <PlayCircle className="w-5 h-5 mr-2" />
                              Review Lecture
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Results */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Question Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {video.tests.map((question, index) => {
                      const userAnswer = answers[index]
                      const isCorrect = userAnswer === question.correct
                      
                      return (
                        <div key={index} className={`p-4 rounded-lg border-2 ${
                          isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                        }`}>
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium text-gray-900 flex-1 pr-4">
                              {index + 1}. {question.question}
                            </h4>
                            <div className={`flex items-center flex-shrink-0 ${
                              isCorrect ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {isCorrect ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <XCircle className="w-5 h-5" />
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className={`flex items-start ${
                              isCorrect ? 'text-green-700' : 'text-red-700'
                            }`}>
                              <strong className="mr-2 flex-shrink-0">Your Answer:</strong>
                              <span>
                                {userAnswer !== -1 ? question.options[userAnswer] : 'No answer selected'}
                              </span>
                            </div>
                            
                            {!isCorrect && (
                              <div className="flex items-start text-green-700">
                                <strong className="mr-2 flex-shrink-0">Correct Answer:</strong>
                                <span>{question.options[question.correct]}</span>
                              </div>
                            )}

                            {question.explanation && (
                              <div className="flex items-start text-blue-700 mt-3 pt-3 border-t border-blue-200">
                                <strong className="mr-2 flex-shrink-0">Explanation:</strong>
                                <span>{question.explanation}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}