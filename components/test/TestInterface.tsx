// components/test/TestInterface.tsx - Simple test interface
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { CheckCircle, XCircle, Award } from 'lucide-react'

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
  const [currentTestIndex, setCurrentTestIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>(new Array(tests.length).fill(-1))
  const [showResults, setShowResults] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(-1)

  const currentTest = tests[currentTestIndex]
  const isLastTest = currentTestIndex === tests.length - 1

  const handleAnswerSelect = (optionIndex: number) => {
    setSelectedAnswer(optionIndex)
  }

  const handleNext = () => {
    const newAnswers = [...answers]
    newAnswers[currentTestIndex] = selectedAnswer
    setAnswers(newAnswers)

    if (isLastTest) {
      // Calculate results
      const correctAnswers = newAnswers.filter((answer, index) => 
        answer === tests[index].correct
      ).length
      
      const score = (correctAnswers / tests.length) * 100
      const passed = score >= 70 // 70% passing grade
      
      setShowResults(true)
      onComplete(passed, score)
    } else {
      setCurrentTestIndex(currentTestIndex + 1)
      setSelectedAnswer(-1)
    }
  }

  const calculateResults = () => {
    const correctAnswers = answers.filter((answer, index) => 
      answer === tests[index].correct
    ).length
    
    return {
      correct: correctAnswers,
      total: tests.length,
      score: (correctAnswers / tests.length) * 100,
      passed: (correctAnswers / tests.length) * 100 >= 70
    }
  }

  if (showResults) {
    const results = calculateResults()
    
    return (
      <Card className={`border-2 ${results.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
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
          
          <h3 className={`text-2xl font-bold mb-4 ${
            results.passed ? 'text-green-800' : 'text-red-800'
          }`}>
            {results.passed ? 'Congratulations!' : 'Keep Learning!'}
          </h3>
          
          <p className={`text-lg mb-6 ${
            results.passed ? 'text-green-700' : 'text-red-700'
          }`}>
            You scored {results.score.toFixed(0)}% ({results.correct}/{results.total} correct)
          </p>
          
          {results.passed ? (
            <p className="text-green-600">
              You've successfully completed this lesson and can move on to the next video!
            </p>
          ) : (
            <p className="text-red-600">
              You need at least 70% to pass. Review the video and try again.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Question {currentTestIndex + 1} of {tests.length}</span>
          <span className="text-sm text-gray-500">Knowledge Check</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">{currentTest.question}</h3>
          
          <div className="space-y-3">
            {currentTest.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                  selectedAnswer === index
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    selectedAnswer === index
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedAnswer === index && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Select an answer to continue
          </div>
          
          <Button
            onClick={handleNext}
            disabled={selectedAnswer === -1}
          >
            {isLastTest ? 'Submit Test' : 'Next Question'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
