import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  MessageSquare,
  Search,
  X,
  Send,
  Loader2,
  CheckCircle,
  Users,
  MessageCircle,
  Reply,
} from "lucide-react";

interface CourseQuestion {
  id: string;
  title: string;
  content: string;
  isAnswered: boolean;
  upvotes: number;
  createdAt: string;
  user: {
    name: string;
    image?: string;
  };
  answers: CourseAnswer[];
  _count: {
    answers: number;
  };
}

interface CourseAnswer {
  id: string;
  content: string;
  isCorrect: boolean;
  upvotes: number;
  createdAt: string;
  user: {
    name: string;
    image?: string;
    role: string;
  };
}

interface QATabProps {
  courseId: string;
  questions: CourseQuestion[];
  setQuestions: React.Dispatch<React.SetStateAction<CourseQuestion[]>>;
}

export function QATab({ courseId, questions, setQuestions }: QATabProps) {
  const [newQuestion, setNewQuestion] = useState({ title: "", content: "" });
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [answeringQuestion, setAnsweringQuestion] = useState<string | null>(null);
  const [answerContent, setAnswerContent] = useState("");
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});

  const submitQuestion = async () => {
    if (!newQuestion.title.trim() || !newQuestion.content.trim()) return;

    try {
      setSubmittingQuestion(true);
      const response = await fetch(`/api/courses/${courseId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuestion),
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions((prev) => [data.question, ...prev]);
        setNewQuestion({ title: "", content: "" });
        setShowNewQuestion(false);
      }
    } catch (error) {
      console.error("Error submitting question:", error);
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const submitAnswer = async (questionId: string) => {
    if (!answerContent.trim()) return;

    try {
      const response = await fetch(
        `/api/courses/${courseId}/questions/${questionId}/answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: answerContent }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? { 
                  ...q, 
                  answers: [...(q.answers || []), data.answer],
                  _count: { 
                    ...q._count, 
                    answers: (q._count?.answers || 0) + 1 
                  }
                }
              : q
          )
        );
        setAnswerContent("");
        setAnsweringQuestion(null);
        // Auto-expand answers when a new answer is added
        setExpandedAnswers(prev => ({ ...prev, [questionId]: true }));
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  };

  const toggleAnswers = (questionId: string) => {
    setExpandedAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Enhanced search functionality
  const filteredQuestions = questions.filter((question) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const titleMatch = question.title.toLowerCase().includes(query);
    const contentMatch = question.content.toLowerCase().includes(query);
    const userMatch = question.user.name.toLowerCase().includes(query);
    const answerMatch = question.answers?.some(answer => 
      answer.content.toLowerCase().includes(query) ||
      answer.user.name.toLowerCase().includes(query)
    );
    
    return titleMatch || contentMatch || userMatch || answerMatch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Questions & Answers</h2>
            <p className="text-gray-600">
              {questions.length} question{questions.length !== 1 ? 's' : ''} • Get help from instructors and peers
            </p>
          </div>
          <Button
            onClick={() => setShowNewQuestion(true)}
            size="lg"
            className="bg-[#001e62] hover:bg-[#001e62]/90 text-white font-semibold px-6 py-3 rounded-lg shadow-sm"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Ask Question
          </Button>
        </div>
      </div>

      {/* New Question Modal */}
      {showNewQuestion && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Ask a New Question</h3>
                <button
                  onClick={() => setShowNewQuestion(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Question Title
                </label>
                <Input
                  value={newQuestion.title}
                  onChange={(e) =>
                    setNewQuestion((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="What would you like to know?"
                  className="w-full text-lg py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Question Details
                </label>
                <textarea
                  value={newQuestion.content}
                  onChange={(e) =>
                    setNewQuestion((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="Provide more context, what you've tried, or any specific details that might help others understand your question better..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62] resize-none text-gray-700"
                  rows={6}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
              <Button
                variant="outline"
                onClick={() => setShowNewQuestion(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={submitQuestion}
                disabled={
                  submittingQuestion ||
                  !newQuestion.title.trim() ||
                  !newQuestion.content.trim()
                }
                className="bg-[#001e62] hover:bg-[#001e62]/90 px-6"
              >
                {submittingQuestion ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Post Question
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search questions, answers, or users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-12 py-4 text-lg border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#001e62]/20 focus:border-[#001e62] transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {filteredQuestions.map((question) => (
          <div
            key={question.id}
            className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
          >
            {/* Question Header */}
            <div className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  {question.user.image ? (
                    <img
                      src={question.user.image}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <Users className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">
                      {question.title}
                    </h3>
                    {question.isAnswered && (
                      <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-semibold ml-4">
                        <CheckCircle className="w-4 h-4" />
                        <span>Solved</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    Asked by <span className="font-medium">{question.user.name}</span> • {new Date(question.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {question.content}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-6">
                  {question._count.answers > 0 && (
                    <button
                      onClick={() => toggleAnswers(question.id)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-[#001e62] font-medium transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>
                        {question._count.answers} answer{question._count.answers !== 1 ? 's' : ''}
                      </span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => setAnsweringQuestion(answeringQuestion === question.id ? null : question.id)}
                    className="flex items-center space-x-2 px-3 py-1.5 text-[#001e62] hover:bg-[#001e62]/5 rounded-lg font-medium transition-colors"
                  >
                    <Reply className="w-4 h-4" />
                    <span>Reply</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Answer Form */}
            {answeringQuestion === question.id && (
              <div className="border-t border-gray-200 bg-gray-50 p-6">
                <div className="space-y-4">
                  <textarea
                    value={answerContent}
                    onChange={(e) => setAnswerContent(e.target.value)}
                    placeholder="Share your knowledge and help others learn..."
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62] resize-none bg-white"
                    rows={4}
                  />
                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAnsweringQuestion(null);
                        setAnswerContent("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => submitAnswer(question.id)}
                      disabled={!answerContent.trim()}
                      className="bg-[#001e62] hover:bg-[#001e62]/90"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Post Answer
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Answers Section */}
            {expandedAnswers[question.id] && question.answers && question.answers.length > 0 && (
              <div className="border-t border-gray-200">
                <div className="p-6 space-y-4">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    {question.answers.length} Answer{question.answers.length !== 1 ? 's' : ''}
                  </h4>
                  {question.answers.map((answer) => (
                    <div
                      key={answer.id}
                      className={`p-5 rounded-lg border-l-4 ${
                        answer.isCorrect
                          ? "border-green-500 bg-green-50/80"
                          : "border-gray-300 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            {answer.user.image ? (
                              <img
                                src={answer.user.image}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <Users className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">
                              {answer.user.name}
                            </span>
                            {answer.user.role === "ADMIN" && (
                              <span className="ml-2 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-semibold">
                                Instructor
                              </span>
                            )}
                            {answer.isCorrect && (
                              <span className="ml-2 flex items-center space-x-1 text-green-600 text-sm font-semibold">
                                <CheckCircle className="w-4 h-4" />
                                <span>Best Answer</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(answer.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap ml-11">
                        {answer.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Empty State */}
        {filteredQuestions.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
            <MessageSquare className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-700 mb-3">
              {searchQuery ? "No questions found" : "No questions yet"}
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto text-lg">
              {searchQuery
                ? "Try adjusting your search terms or browse all questions."
                : "Start the conversation by asking the first question about this course!"}
            </p>
            <div className="flex justify-center space-x-4">
              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="px-6"
                >
                  Clear Search
                </Button>
              )}
              <Button
                onClick={() => setShowNewQuestion(true)}
                size="lg"
                className="bg-[#001e62] hover:bg-[#001e62]/90 px-6"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Ask First Question
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}