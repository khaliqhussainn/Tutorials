// components/test/TestInterface.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'

interface Test {
  id: string
  question: string
  options: string[]
  correct: number
}

interface TestInterfaceProps {
  tests: Test[]
  onComplete: (passed: boolean, score: number) => void
}

export default function TestInterface({ tests, onComplete }: TestInterfaceProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestion] = answerIndex
    setSelectedAnswers(newAnswers)
  }

  const handleNext = () => {
    if (currentQuestion < tests.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      calculateResults()
    }
  }

  const calculateResults = () => {
    let correctCount = 0
    selectedAnswers.forEach((answer, index) => {
      if (answer === tests[index].correct) {
        correctCount++
      }
    })
    
    const finalScore = Math.round((correctCount / tests.length) * 100)
    setScore(finalScore)
    setShowResults(true)
    
    // Pass if score >= 70%
    const passed = finalScore >= 70
    onComplete(passed, finalScore)
  }

  const currentTest = tests[currentQuestion]
  const isLastQuestion = currentQuestion === tests.length - 1
  const hasSelectedAnswer = selectedAnswers[currentQuestion] !== undefined

  if (showResults) {
    const passed = score >= 70
    
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {passed ? (
              <CheckCircle className="w-16 h-16 text-green-500" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
          </div>
          <CardTitle className={`text-2xl ${passed ? 'text-green-700' : 'text-red-700'}`}>
            {passed ? 'Congratulations!' : 'Try Again'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center">
          <p className="text-lg mb-4">
            You scored {score}% ({selectedAnswers.filter((answer, index) => answer === tests[index].correct).length} out of {tests.length} correct)
          </p>
          
          {passed ? (
            <p className="text-dark-600 mb-6">
              Great job! You can now proceed to the next video.
            </p>
          ) : (
            <p className="text-dark-600 mb-6">
              You need at least 70% to pass. Review the video and try again.
            </p>
          )}
          
          <div className="space-y-4">
            {tests.map((test, index) => {
              const userAnswer = selectedAnswers[index]
              const isCorrect = userAnswer === test.correct
              
              return (
                <div key={test.id} className="text-left p-4 bg-dark-50 rounded-lg">
                  <p className="font-medium mb-2">{index + 1}. {test.question}</p>
                  <div className="space-y-1">
                    {test.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`p-2 rounded text-sm ${
                          optionIndex === test.correct
                            ? 'bg-green-100 text-green-800'
                            : optionIndex === userAnswer && !isCorrect
                            ? 'bg-red-100 text-red-800'
                            : 'text-dark-600'
                        }`}
                      >
                        {option}
                        {optionIndex === test.correct && ' ✓'}
                        {optionIndex === userAnswer && !isCorrect && ' ✗'}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Question {currentQuestion + 1} of {tests.length}</CardTitle>
          <div className="text-sm text-dark-500">
            Progress: {Math.round(((currentQuestion + 1) / tests.length) * 100)}%
          </div>
        </div>
        <div className="w-full bg-dark-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / tests.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <h3 className="text-lg font-semibold mb-6">{currentTest.question}</h3>
        
        <div className="space-y-3 mb-6">
          {currentTest.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                selectedAnswers[currentQuestion] === index
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-dark-200 hover:border-primary-300'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  selectedAnswers[currentQuestion] === index
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-dark-300'
                }`}>
                  {selectedAnswers[currentQuestion] === index && (
                    <div className="w-full h-full rounded-full bg-white scale-50" />
                  )}
                </div>
                {option}
              </div>
            </button>
          ))}
        </div>
        
        <div className="flex justify-end">
          <Button
            onClick={handleNext}
            disabled={!hasSelectedAnswer}
            className="min-w-32"
          >
            {isLastQuestion ? 'Finish Test' : 'Next Question'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
   