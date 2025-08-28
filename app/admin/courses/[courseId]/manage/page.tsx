// app/admin/courses/[courseId]/manage/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Plus, 
  MessageSquare,
  Megaphone,
  CheckCircle,
  Clock,
  Pin,
  Users,
  Star,
  Edit,
  Trash2,
  Search,
  Filter,
  ArrowLeft,
  AlertCircle,
  X,
  Send,
  Loader2
} from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
}

interface Announcement {
  id: string
  title: string
  content: string
  isPinned: boolean
  createdAt: string
  author: {
    name: string
    role: string
  }
}

interface Question {
  id: string
  title: string
  content: string
  isAnswered: boolean
  isPinned: boolean
  upvotes: number
  createdAt: string
  user: {
    name: string
    email: string
  }
  answers: Answer[]
  _count: {
    answers: number
  }
}

interface Answer {
  id: string
  content: string
  isCorrect: boolean
  upvotes: number
  createdAt: string
  user: {
    name: string
    email: string
    role: string
  }
}

export default function AdminCourseManagePage({
  params,
}: {
  params: { courseId: string }
}) {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [course, setCourse] = useState<Course | null>(null)
  const [activeTab, setActiveTab] = useState<'announcements' | 'questions'>('announcements')
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [questionFilter, setQuestionFilter] = useState<'all' | 'answered' | 'unanswered'>('all')

  // New announcement form
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false)
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    isPinned: false
  })
  const [submitting, setSubmitting] = useState(false)

  // Answer form for questions
  const [answeringQuestion, setAnsweringQuestion] = useState<string | null>(null)
  const [answerContent, setAnswerContent] = useState('')

  useEffect(() => {
    if (session?.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchData()
  }, [session, router])

  const fetchData = async () => {
    try {
      const [courseRes, announcementsRes, questionsRes] = await Promise.all([
        fetch(`/api/admin/courses/${params.courseId}`),
        fetch(`/api/courses/${params.courseId}/announcements`),
        fetch(`/api/courses/${params.courseId}/questions`)
      ])

      if (courseRes.ok) {
        const courseData = await courseRes.json()
        setCourse(courseData)
      }

      if (announcementsRes.ok) {
        const announcementsData = await announcementsRes.json()
        setAnnouncements(announcementsData.announcements || [])
      }

      if (questionsRes.ok) {
        const questionsData = await questionsRes.json()
        setQuestions(questionsData.questions || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/courses/${params.courseId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementForm)
      })

      if (response.ok) {
        const data = await response.json()
        setAnnouncements(prev => [data.announcement, ...prev])
        setAnnouncementForm({ title: '', content: '', isPinned: false })
        setShowNewAnnouncement(false)
      }
    } catch (error) {
      console.error('Error creating announcement:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const answerQuestion = async (questionId: string) => {
    if (!answerContent.trim()) return

    try {
      const response = await fetch(`/api/courses/${params.courseId}/questions/${questionId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: answerContent })
      })

      if (response.ok) {
        const data = await response.json()
        setQuestions(prev =>
          prev.map(q =>
            q.id === questionId
              ? { ...q, answers: [...q.answers, data.answer], isAnswered: true }
              : q
          )
        )
        setAnswerContent('')
        setAnsweringQuestion(null)
      }
    } catch (error) {
      console.error('Error answering question:', error)
    }
  }

  const markAnswerAsCorrect = async (questionId: string, answerId: string, isCorrect: boolean) => {
    try {
      const response = await fetch(`/api/courses/${params.courseId}/questions/${questionId}/answers/${answerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCorrect })
      })

      if (response.ok) {
        setQuestions(prev =>
          prev.map(q =>
            q.id === questionId
              ? {
                  ...q,
                  answers: q.answers.map(a =>
                    a.id === answerId ? { ...a, isCorrect } : a
                  )
                }
              : q
          )
        )
      }
    } catch (error) {
      console.error('Error updating answer:', error)
    }
  }

  const filteredQuestions = questions
    .filter(q => {
      const matchesSearch = searchQuery === '' || 
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.content.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesFilter = questionFilter === 'all' ||
        (questionFilter === 'answered' && q.isAnswered) ||
        (questionFilter === 'unanswered' && !q.isAnswered)
      
      return matchesSearch && matchesFilter
    })

  if (session?.user.role !== 'ADMIN') return null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Course Content
              </h1>
              <p className="text-gray-600">{course?.title}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('announcements')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'announcements'
                    ? 'border-[#001e62] text-[#001e62]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Megaphone className="w-5 h-5 inline mr-2" />
                Announcements ({announcements.length})
              </button>
              <button
                onClick={() => setActiveTab('questions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'questions'
                    ? 'border-[#001e62] text-[#001e62]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MessageSquare className="w-5 h-5 inline mr-2" />
                Q&A ({questions.filter(q => !q.isAnswered).length} unanswered)
              </button>
            </nav>
          </div>
        </div>

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Course Announcements</h2>
              <Button
                onClick={() => setShowNewAnnouncement(true)}
                className="bg-[#001e62] hover:bg-[#001e62]/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            </div>

            {/* New Announcement Modal */}
            {showNewAnnouncement && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Create Announcement</h3>
                      <button
                        onClick={() => setShowNewAnnouncement(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title
                      </label>
                      <Input
                        value={announcementForm.title}
                        onChange={(e) => setAnnouncementForm(prev => ({
                          ...prev,
                          title: e.target.value
                        }))}
                        placeholder="Enter announcement title..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content
                      </label>
                      <textarea
                        value={announcementForm.content}
                        onChange={(e) => setAnnouncementForm(prev => ({
                          ...prev,
                          content: e.target.value
                        }))}
                        placeholder="Write your announcement content..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62] min-h-[120px]"
                        rows={6}
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isPinned"
                        checked={announcementForm.isPinned}
                        onChange={(e) => setAnnouncementForm(prev => ({
                          ...prev,
                          isPinned: e.target.checked
                        }))}
                        className="w-4 h-4 text-[#001e62] focus:ring-[#001e62] border-gray-300 rounded"
                      />
                      <label htmlFor="isPinned" className="ml-2 text-sm text-gray-700">
                        Pin this announcement
                      </label>
                    </div>
                  </div>
                  
                  <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewAnnouncement(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={createAnnouncement}
                      disabled={submitting || !announcementForm.title.trim() || !announcementForm.content.trim()}
                      className="bg-[#001e62] hover:bg-[#001e62]/90"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Create Announcement
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Announcements List */}
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <Card key={announcement.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-[#001e62] rounded-full flex items-center justify-center">
                            <Megaphone className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg flex items-center">
                            {announcement.title}
                            {announcement.isPinned && (
                              <Pin className="w-4 h-4 ml-2 text-yellow-500" />
                            )}
                          </h3>
                          <p className="text-sm text-gray-500">
                            By {announcement.author.name} • {new Date(announcement.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="prose max-w-none">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {announcements.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      No announcements yet
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Create your first announcement to keep students informed.
                    </p>
                    <Button
                      onClick={() => setShowNewAnnouncement(true)}
                      className="bg-[#001e62] hover:bg-[#001e62]/90"
                    >
                      Create First Announcement
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Student Questions</h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <select
                  value={questionFilter}
                  onChange={(e) => setQuestionFilter(e.target.value as typeof questionFilter)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Questions</option>
                  <option value="unanswered">Unanswered</option>
                  <option value="answered">Answered</option>
                </select>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {filteredQuestions.map((question) => (
                <Card key={question.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            question.isAnswered 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-orange-100 text-orange-600'
                          }`}>
                            {question.isAnswered ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <Clock className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg flex items-center">
                            {question.title}
                            {question.isPinned && (
                              <Pin className="w-4 h-4 ml-2 text-yellow-500" />
                            )}
                          </h3>
                          <p className="text-sm text-gray-500">
                            By {question.user.name} • {new Date(question.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {question.upvotes} votes
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {question.content}
                      </p>
                    </div>

                    {/* Answers */}
                    {question.answers.length > 0 && (
                      <div className="border-t pt-4 space-y-4">
                        <h4 className="font-medium text-gray-900">
                          Answers ({question.answers.length})
                        </h4>
                        {question.answers.map((answer) => (
                          <div
                            key={answer.id}
                            className={`p-4 rounded-lg border-l-4 ${
                              answer.isCorrect
                                ? 'bg-green-50 border-green-500'
                                : 'bg-gray-50 border-gray-300'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">
                                  {answer.user.name}
                                </span>
                                {answer.user.role === 'ADMIN' && (
                                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">
                                    Admin
                                  </span>
                                )}
                                {answer.isCorrect && (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markAnswerAsCorrect(question.id, answer.id, !answer.isCorrect)}
                                  className={answer.isCorrect ? 'text-green-600' : ''}
                                >
                                  {answer.isCorrect ? 'Unmark' : 'Mark Correct'}
                                </Button>
                                <span className="text-xs text-gray-500">
                                  {new Date(answer.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">
                              {answer.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Answer Form */}
                    <div className="border-t pt-4 mt-4">
                      {answeringQuestion === question.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={answerContent}
                            onChange={(e) => setAnswerContent(e.target.value)}
                            placeholder="Write your answer..."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62] min-h-[100px]"
                            rows={4}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAnsweringQuestion(null)
                                setAnswerContent('')
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => answerQuestion(question.id)}
                              disabled={!answerContent.trim()}
                              className="bg-[#001e62] hover:bg-[#001e62]/90"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Post Answer
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAnsweringQuestion(question.id)}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Answer Question
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredQuestions.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      {searchQuery || questionFilter !== 'all' 
                        ? 'No questions found' 
                        : 'No questions yet'
                      }
                    </h3>
                    <p className="text-gray-500">
                      {searchQuery || questionFilter !== 'all'
                        ? 'Try adjusting your search or filter criteria.'
                        : 'Students will be able to ask questions about this course.'
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}