"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  FileText,
  Brain,
  Loader2,
  Eye,
  BrainCircuitIcon,
} from "lucide-react";

interface QuizManagerProps {
  videoId: string;
  videoTitle: string;
  hasTranscript: boolean;
  transcriptStatus?: string;
  onQuizGenerated?: () => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: string;
  points: number;
  order: number;
}

export default function QuizManager({
  videoId,
  videoTitle,
  hasTranscript,
  transcriptStatus,
  onQuizGenerated,
}: QuizManagerProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, [videoId]);

  const fetchQuestions = async () => {
    try {
      // Use the new quiz endpoint that fetches from database
      const response = await fetch(`/api/videos/${videoId}/quiz`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async (regenerate = false) => {
    setGenerating(true);
    setError("");
    setSuccess("");
    
    try {
      const response = await fetch(
        `/api/admin/videos/${videoId}/generate-quiz`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            regenerate,
            source: "admin_manual",
          }),
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        setSuccess(
          `Successfully generated ${result.count} questions!`
        );
        
        // Refresh questions to show newly generated ones
        await fetchQuestions();
        
        // Notify parent component
        onQuizGenerated?.();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to generate quiz");
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      setError("Network error while generating quiz");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">{videoTitle}</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <BrainCircuitIcon className="w-4 h-4 mr-1" />
            {questions.length} questions
          </div>
          {hasTranscript && (
            <div className="flex items-center">
              <FileText className="w-4 h-4 mr-1" />
              Transcript available
            </div>
          )}
          <Badge
            variant={transcriptStatus === "COMPLETED" ? "default" : "secondary"}
          >
            {transcriptStatus || "No transcript"}
          </Badge>
        </div>
      </div>

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

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <Brain className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Quiz Generation</p>
            <p>
              {hasTranscript
                ? "Questions will be generated from the video transcript for maximum relevance and accuracy."
                : "Questions will be generated based on the video title, description, and topic."}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-3">
        <Button
          onClick={() => generateQuiz(false)}
          disabled={generating || questions.length > 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Generate Quiz
            </>
          )}
        </Button>
        {questions.length > 0 && (
          <Button
            onClick={() => generateQuiz(true)}
            disabled={generating}
            variant="outline"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate Quiz
              </>
            )}
          </Button>
        )}
      </div>

      {/* Current Questions */}
      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Current Quiz Questions ({questions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm text-gray-500">
                      Q{index + 1}
                    </span>
                    <Badge
                      variant={
                        question.difficulty === "easy"
                          ? "default"
                          : question.difficulty === "medium"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {question.difficulty}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {question.points} pts
                    </span>
                  </div>
                </div>
                <h4 className="font-medium text-gray-900 mb-3">
                  {question.question}
                </h4>
                <div className="space-y-2 mb-3">
                  {question.options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={`p-2 rounded text-sm ${
                        optIndex === question.correct
                          ? "bg-green-50 border border-green-200 text-green-800"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <span className="font-medium mr-2">
                        {String.fromCharCode(65 + optIndex)}.
                      </span>
                      {option}
                      {optIndex === question.correct && (
                        <CheckCircle className="w-4 h-4 inline ml-2 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
                {question.explanation && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    <strong className="text-blue-900">Explanation:</strong>{" "}
                    <span className="text-blue-800">{question.explanation}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Quiz State */}
      {questions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Quiz Questions Yet
            </h3>
            <p className="text-gray-500 mb-6">
              {hasTranscript
                ? "Generate high-quality quiz questions from the video transcript."
                : "Generate quiz questions based on the video topic and description."}
            </p>
            <Button
              onClick={() => generateQuiz(false)}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Quiz {hasTranscript ? "from Transcript" : "from Topic"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}