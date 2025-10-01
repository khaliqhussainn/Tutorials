// app/course/[courseId]/video/[videoId]/page.tsx - Fixed version
"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  VideoPlayerWithTranscript,
  VideoPlayerRef,
} from "@/components/VideoPlayerWithTranscript";
import { NotesTab } from "@/components/NotesTab";
import {
  PlayCircle,
  CheckCircle,
  Clock,
  Target,
  Award,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Brain,
  HelpCircle,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";
// Import existing components
import { VideoPageHeader } from "@/components/video/VideoPageHeader";
import { TabNavigation } from "@/components/video/TabNavigation";
import { QATab } from "@/components/video/QATab";
import { ReviewsTab } from "@/components/video/ReviewsTab";
import { AnnouncementsTab } from "@/components/video/AnnouncementsTab";
import { AboutTab } from "@/components/video/AboutTab";
import { LearningToolsTab } from "@/components/video/LearningToolsTab";
import { ResponsiveCourseSidebar } from "@/components/video/CourseSidebar";
import { CompilerTab } from "@/components/video/CompilerTab";
import { AIFeaturesProvider } from "@/components/AIFeaturesProvider";

// Interfaces
interface Test {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
  points?: number;
  order?: number;
}

interface Video {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  duration?: number;
  order: number;
  sectionId?: string;
  tests: Test[];
  transcript?: {
    id: string;
    content: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    language: string;
    segments?: any[];
    confidence?: number;
    provider?: string;
  };
  // Add course relation for video
  course?: {
    title: string;
    category: string;
  };
}

interface CourseSection {
  id: string;
  title: string;
  order: number;
  videos: {
    id: string;
    order: number;
    title: string;
    duration?: number;
    tests?: Test[];
  }[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  category: string;
  level: string;
  sections: CourseSection[];
  videos: {
    id: string;
    order: number;
    title: string;
    duration?: number;
    tests?: Test[];
  }[];
  _count: { enrollments: number };
  rating?: number;
}

interface VideoProgress {
  videoId: string;
  completed: boolean;
  testPassed: boolean;
  watchTime: number;
  testScore?: number;
  testAttempts?: number;
  hasAccess: boolean;
}

interface QuizAttempt {
  id?: string;
  score: number;
  passed: boolean;
  answers: number[];
  timeSpent: number;
  completedAt: string;
  attemptNumber?: number;
}

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
  answers: any[];
  _count: {
    answers: number;
  };
}

interface CourseAnnouncement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: {
    name: string;
    role: string;
  };
}

interface CourseReviewData {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: string;
  user: {
    name: string;
    image?: string;
  };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export default function VideoPage({
  params,
}: {
  params: { courseId: string; videoId: string };
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const playerRef = useRef<VideoPlayerRef>(null);
  const isQuizMode = searchParams?.get("mode") === "quiz";

  // State declarations
  const [video, setVideo] = useState<Video | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
  const [watchTime, setWatchTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState<CourseSection | null>(null);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [canWatch, setCanWatch] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "about"
    | "qa"
    | "notes"
    | "announcements"
    | "reviews"
    | "learning-tools"
    | "compiler"
  >("about");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number>(-1);
  const [showResults, setShowResults] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [previousAttempts, setPreviousAttempts] = useState<QuizAttempt[]>([]);

  // Content state
  const [questions, setQuestions] = useState<CourseQuestion[]>([]);
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
  const [reviews, setReviews] = useState<CourseReviewData[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [userReview, setUserReview] = useState<CourseReviewData | null>(null);

  // Mobile detection and window resize handling
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && sidebarOpen) {
        const sidebar = document.getElementById('course-sidebar');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        
        if (sidebar && sidebarToggle && 
            !sidebar.contains(event.target as Node) && 
            !sidebarToggle.contains(event.target as Node)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, sidebarOpen]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, sidebarOpen]);

  // Effects
  useEffect(() => {
    if (session) {
      fetchVideoData();
      fetchVideoProgress();
      checkVideoAccess();
      fetchQuestions();
      fetchAnnouncements();
      fetchReviews();
      if (isQuizMode) {
        fetchPreviousAttempts();
      }
    }
  }, [params.videoId, session, isQuizMode]);

  useEffect(() => {
    if (course?.sections) {
      const sectionIds = new Set(course.sections.map((s) => s.id));
      setExpandedSections(sectionIds);
    }
  }, [course]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (quizStarted && startTime && !showResults && isQuizMode) {
      interval = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizStarted, startTime, showResults, isQuizMode]);

  // Data fetching functions
  const fetchPreviousAttempts = async () => {
    try {
      const response = await fetch(`/api/videos/${params.videoId}/quiz-attempts`);
      if (response.ok) {
        const attempts = await response.json();
        setPreviousAttempts(attempts);
      }
    } catch (error) {
      console.error("Error fetching previous attempts:", error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/courses/${params.courseId}/questions`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`/api/courses/${params.courseId}/announcements`);
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/courses/${params.courseId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setReviewStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const fetchVideoData = async () => {
    try {
      const [videoResponse, courseResponse] = await Promise.all([
        fetch(`/api/videos/${params.videoId}`),
        fetch(`/api/courses/${params.courseId}`),
      ]);
      if (videoResponse.ok && courseResponse.ok) {
        const videoData = await videoResponse.json();
        const courseData = await courseResponse.json();
        
        // FIXED: Add course info to video object
        const enrichedVideo = {
          ...videoData,
          course: {
            title: courseData.title,
            category: courseData.category
          }
        };
        
        setVideo(enrichedVideo);
        setCourse(courseData);
        
        if (isQuizMode && videoData.tests) {
          setAnswers(new Array(videoData.tests.length).fill(-1));
        }
        if (videoData.sectionId) {
          const section = courseData.sections?.find(
            (s: CourseSection) => s.id === videoData.sectionId
          );
          setCurrentSection(section || null);
        }
      }
    } catch (error) {
      console.error("Error fetching video data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoProgress = async () => {
    try {
      const response = await fetch(`/api/progress/${params.courseId}`);
      if (response.ok) {
        const data = await response.json();
        setVideoProgress(data);
        const currentVideoProgress = data.find(
          (p: VideoProgress) => p.videoId === params.videoId
        );
        if (currentVideoProgress) {
          setWatchTime(currentVideoProgress.watchTime || 0);
          setVideoCompleted(currentVideoProgress.completed || false);
        }
      }
    } catch (error) {
      console.error("Error checking progress:", error);
    }
  };

  const checkVideoAccess = async () => {
    try {
      const response = await fetch(`/api/videos/${params.videoId}/access`);
      if (response.ok) {
        const data = await response.json();
        setCanWatch(data.canWatch);
      }
    } catch (error) {
      console.error("Error checking access:", error);
    }
  };

  // Video handlers
  const handleVideoProgress = async (progress: {
    played: number;
    playedSeconds: number;
  }) => {
    if (isQuizMode) return;
    setCurrentVideoTime(progress.playedSeconds);
    if (progress.playedSeconds > watchTime) {
      setWatchTime(progress.playedSeconds);
      if (Math.floor(progress.playedSeconds) % 10 === 0) {
        try {
          await fetch(`/api/progress/video`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              videoId: params.videoId,
              watchTime: progress.playedSeconds,
            }),
          });
        } catch (error) {
          console.error("Error updating progress:", error);
        }
      }
    }
  };

  const handleVideoEnd = async () => {
    if (isQuizMode || videoCompleted) return;
    setVideoCompleted(true);
    try {
      await fetch(`/api/progress/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: params.videoId,
          completed: true,
          watchTime: video?.duration || 0,
        }),
      });
      await fetchVideoProgress();
    } catch (error) {
      console.error("Error marking video complete:", error);
    }
  };

  // Quiz handlers
  const startQuiz = () => {
    if (!video?.tests) return;
    setQuizStarted(true);
    setStartTime(new Date());
    setCurrentQuestionIndex(0);
    setAnswers(new Array(video.tests.length).fill(-1));
    setSelectedAnswer(-1);
    setShowResults(false);
    setShowExplanation(false);
  };

  const handleAnswerSelect = (optionIndex: number) => {
    setSelectedAnswer(optionIndex);
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (!video?.tests) return;
    if (currentQuestionIndex < video.tests.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(answers[currentQuestionIndex + 1]);
      setShowExplanation(false);
    } else {
      submitQuiz();
    }
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex(currentQuestionIndex - 1);
    setSelectedAnswer(answers[currentQuestionIndex - 1]);
    setShowExplanation(false);
  };

  const submitQuiz = async () => {
    if (!video?.tests) return;
    setSubmitting(true);
    try {
      const correctAnswers = answers.filter(
        (answer, index) => answer === video.tests[index].correct
      ).length;
      const score = Math.round((correctAnswers / video.tests.length) * 100);
      const passed = score >= 70;
      const response = await fetch(`/api/progress/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: params.videoId,
          answers: answers,
          score,
          passed,
          timeSpent,
        }),
      });
      if (response.ok) {
        setShowResults(true);
        await fetchVideoProgress();
        await fetchPreviousAttempts();
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateResults = () => {
    if (!video?.tests) return { correct: 0, total: 0, score: 0, passed: false };
    const correctAnswers = answers.filter(
      (answer, index) => answer === video.tests[index].correct
    ).length;
    return {
      correct: correctAnswers,
      total: video.tests.length,
      score: Math.round((correctAnswers / video.tests.length) * 100),
      passed: (correctAnswers / video.tests.length) * 100 >= 70,
    };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeekTo = (timeInSeconds: number) => {
    if (playerRef.current && !isQuizMode) {
      playerRef.current.seekTo(timeInSeconds, "seconds");
      setCurrentVideoTime(timeInSeconds);
    }
  };

  // Helper functions for sidebar
  const getVideoStatus = (
    videoItem: any,
    sectionVideos: any[],
    videoIndex: number,
    sectionIndex: number
  ): string => {
    const progress = videoProgress.find((p) => p.videoId === videoItem.id);
    if (videoItem.tests && videoItem.tests.length > 0) {
      if (progress?.completed && progress?.testPassed) return "completed";
      if (progress?.completed && !progress?.testPassed) return "quiz-required";
    } else {
      if (progress?.completed) return "completed";
    }
    if (sectionIndex === 0 && videoIndex === 0) {
      return "available";
    }
    let prevVideo: any = null;
    if (videoIndex > 0) {
      prevVideo = sectionVideos[videoIndex - 1];
    } else if (sectionIndex > 0) {
      const prevSection = course?.sections?.[sectionIndex - 1];
      if (prevSection && prevSection.videos.length > 0) {
        prevVideo = prevSection.videos[prevSection.videos.length - 1];
      }
    }
    if (prevVideo) {
      const prevProgress = videoProgress.find((p) => p.videoId === prevVideo.id);
      const prevCompleted =
        prevProgress?.completed &&
        (!prevVideo.tests ||
          prevVideo.tests.length === 0 ||
          prevProgress?.testPassed);
      if (prevCompleted) {
        return "available";
      }
    }
    return "locked";
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const getTotalVideos = (): number => {
    const sectionVideos =
      course?.sections?.reduce(
        (acc, section) => acc + (section.videos?.length || 0),
        0
      ) || 0;
    const legacyVideos = course?.videos?.length || 0;
    return sectionVideos + legacyVideos;
  };

  const getCompletedVideos = (): number => {
    return videoProgress.filter((p) => {
      const videoItem = getAllVideos().find((v) => v.id === p.videoId);
      if (!videoItem) return false;
      if (!videoItem.tests || videoItem.tests.length === 0) {
        return p.completed;
      }
      return p.completed && p.testPassed;
    }).length;
  };

  const getAllVideos = (): any[] => {
    const allVideos: any[] = [];
    if (course?.sections) {
      for (const section of course.sections) {
        if (section.videos) {
          allVideos.push(...section.videos);
        }
      }
    }
    if (course?.videos) {
      allVideos.push(...course.videos);
    }
    return allVideos;
  };

  const getProgressPercentage = (): number => {
    const total = getTotalVideos();
    const completed = getCompletedVideos();
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getTotalDuration = (): number => {
    const allVideos = getAllVideos();
    return allVideos.reduce((total, video) => total + (video.duration || 0), 0);
  };

  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds || seconds === 0) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Render functions
  const renderVideoPlayer = () => {
    if (isQuizMode) return null;
    return (
      <div className="bg-black p-3 md:p-6">
        <VideoPlayerWithTranscript
          ref={playerRef}
          videoUrl={video!.videoUrl}
          title={video!.title}
          videoId={video!.id}
          onProgress={handleVideoProgress}
          onEnded={handleVideoEnd}
          canWatch={canWatch}
          initialTime={watchTime}
        />
      </div>
    );
  };

  const renderQuizInterface = () => {
    if (!isQuizMode || !video?.tests?.length) return null;
    if (!quizStarted && !showResults) {
      return (
        <div className="bg-gray-50 p-3 md:p-6">
          <Card className="max-w-2xl mx-auto border-0 shadow-lg">
            <CardContent className="p-4 md:p-8 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#001e62]/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Brain className="w-8 h-8 md:w-10 md:h-10 text-[#001e62]" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
                Ready to test your knowledge?
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6 md:mb-8 text-sm md:text-base">
                This quiz contains {video.tests.length} questions and should
                take about {Math.ceil(video.tests.length * 1.5)} minutes to
                complete. You need a score of 70% or higher to pass.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="text-center p-3 md:p-4 bg-[#001e62]/5 rounded-lg border border-[#001e62]/20">
                  <div className="text-xl md:text-2xl font-bold text-[#001e62] mb-1">
                    {video.tests.length}
                  </div>
                  <div className="text-xs md:text-sm text-[#001e62]">Questions</div>
                </div>
                <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xl md:text-2xl font-bold text-green-600 mb-1">
                    70%
                  </div>
                  <div className="text-xs md:text-sm text-green-800">Passing Score</div>
                </div>
                <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xl md:text-2xl font-bold text-blue-600 mb-1">
                    {previousAttempts.length}
                  </div>
                  <div className="text-xs md:text-sm text-blue-800">Previous Attempts</div>
                </div>
              </div>
              <Button
                size="lg"
                onClick={startQuiz}
                className="w-full md:w-auto min-w-48 bg-[#001e62] hover:bg-[#001e62]/90"
              >
                <Target className="w-5 h-5 mr-2" />
                Start Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    if (quizStarted && !showResults) {
      const currentQuestion = video.tests[currentQuestionIndex];
      const isLastQuestion = currentQuestionIndex === video.tests.length - 1;
      const isFirstQuestion = currentQuestionIndex === 0;
      return (
        <div className="bg-gray-50 p-3 md:p-6">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6 md:mb-8">
              <div className="flex flex-col md:flex-row md:justify-between text-sm text-gray-600 mb-3 space-y-2 md:space-y-0">
                <span>
                  Question {currentQuestionIndex + 1} of {video.tests.length}
                </span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{formatTime(timeSpent)}</span>
                  </div>
                  <span>
                    {Math.round(
                      ((currentQuestionIndex + 1) / video.tests.length) * 100
                    )}
                    % Complete
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 md:h-3">
                <div
                  className="bg-[#001e62] h-2 md:h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      ((currentQuestionIndex + 1) / video.tests.length) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg md:text-xl">
                  {currentQuestion.question}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6">
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      className={`w-full p-3 md:p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                        selectedAnswer === index
                          ? "border-[#001e62] bg-[#001e62]/5 shadow-md"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 mr-3 md:mr-4 flex items-center justify-center ${
                            selectedAnswer === index
                              ? "border-[#001e62] bg-[#001e62]"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedAnswer === index && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <span className="text-gray-900 text-sm md:text-base">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedAnswer !== -1 && currentQuestion.explanation && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowExplanation(!showExplanation)}
                      className="flex items-center text-[#001e62] hover:text-[#001e62]/80 text-sm"
                    >
                      <HelpCircle className="w-4 h-4 mr-1" />
                      {showExplanation ? "Hide" : "Show"} explanation
                    </button>
                    {showExplanation && (
                      <div className="mt-3 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800 text-sm">
                          {currentQuestion.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center pt-4 md:pt-6 border-t space-y-4 md:space-y-0">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={isFirstQuestion}
                    className="flex items-center w-full md:w-auto"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-center order-first md:order-none">
                    {selectedAnswer === -1 ? (
                      <p className="text-sm text-gray-500">
                        Select an answer to continue
                      </p>
                    ) : (
                      <div className="flex items-center justify-center text-[#001e62]">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Answer selected</span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleNext}
                    disabled={selectedAnswer === -1 || submitting}
                    className="flex items-center w-full md:w-auto md:min-w-32 bg-[#001e62] hover:bg-[#001e62]/90"
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
          </div>
        </div>
      );
    }
    if (showResults) {
      const results = calculateResults();
      return (
        <div className="bg-gray-50 p-3 md:p-6">
          <div className="max-w-2xl mx-auto">
            <Card
              className={`border-2 shadow-lg ${
                results.passed
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <CardContent className="p-6 md:p-8 text-center">
                <div
                  className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 ${
                    results.passed ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {results.passed ? (
                    <Award className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
                  ) : (
                    <XCircle className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
                  )}
                </div>
                <h2
                  className={`text-2xl md:text-3xl font-bold mb-4 ${
                    results.passed ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {results.passed ? "Congratulations!" : "Keep Learning!"}
                </h2>
                <div className="mb-6">
                  <div
                    className={`text-3xl md:text-4xl font-bold mb-2 ${
                      results.passed ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {results.score}%
                  </div>
                  <p
                    className={`text-base md:text-lg ${
                      results.passed ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {results.correct} out of {results.total} questions correct
                  </p>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-center space-y-3 md:space-y-0 md:space-x-4">
                  {results.passed ? (
                    <Button
                      onClick={() =>
                        router.push(
                          `/course/${params.courseId}/video/${params.videoId}`
                        )
                      }
                      className="w-full md:w-auto bg-[#001e62] hover:bg-[#001e62]/90"
                    >
                      Continue Learning
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={startQuiz}
                        className="w-full md:w-auto bg-[#001e62] hover:bg-[#001e62]/90"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retake Quiz
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          router.push(
                            `/course/${params.courseId}/video/${params.videoId}`
                          )
                        }
                        className="w-full md:w-auto"
                      >
                        Review Video
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderInfoSection = () => {
    return (
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              {isQuizMode ? `Quiz: ${video?.title}` : video?.title}
            </h1>
            {video?.description && (
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                {video.description}
              </p>
            )}
          </div>
          {!isQuizMode && (
            <div className="flex items-center justify-between md:justify-end space-x-4 mt-4 md:mt-0 md:ml-6">
              <div className="text-center">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-1 ${
                    videoCompleted ? "bg-green-100" : "bg-gray-100"
                  }`}
                >
                  {videoCompleted ? (
                    <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                  ) : (
                    <PlayCircle className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                  )}
                </div>
                <div className="text-xs text-gray-600">
                  {videoCompleted ? "Completed" : "In Progress"}
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div className="flex items-center mb-1">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>
                    {formatDuration(watchTime)} /{" "}
                    {formatDuration(video?.duration || 0)}
                  </span>
                </div>
                <div className="text-xs">
                  Progress:{" "}
                  {video?.duration
                    ? Math.round((watchTime / video.duration) * 100)
                    : 0}
                  %
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quiz availability banner */}
        {!isQuizMode &&
          video?.tests &&
          video.tests.length > 0 &&
          videoCompleted && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3 md:space-y-0">
              <div className="flex items-center">
                <Target className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <div className="font-medium text-blue-900">
                    Quiz Available
                  </div>
                  <div className="text-sm text-blue-700">
                    Test your knowledge with {video.tests.length} questions to
                    continue
                  </div>
                </div>
              </div>
              <Button
                onClick={() =>
                  router.push(
                    `/course/${params.courseId}/video/${params.videoId}?mode=quiz`
                  )
                }
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
              >
                Take Quiz
              </Button>
            </div>
          )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "about":
        return (
          <AboutTab
            course={course}
            getTotalDuration={getTotalDuration}
            getTotalVideos={getTotalVideos}
            getProgressPercentage={getProgressPercentage}
            getCompletedVideos={getCompletedVideos}
          />
        );
      case "qa":
        return (
          <QATab
            courseId={params.courseId}
            questions={questions}
            setQuestions={setQuestions}
          />
        );
      case "notes":
        return !isQuizMode ? (
          <div className="max-w-4xl">
            <NotesTab
              videoId={params.videoId}
              currentTime={currentVideoTime}
              videoDuration={video?.duration || 0}
              onSeekTo={handleSeekTo}
            />
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">
              Notes are only available for video content.
            </p>
          </div>
        );
      case "announcements":
        return <AnnouncementsTab announcements={announcements} />;
      case "reviews":
        return (
          <ReviewsTab
            courseId={params.courseId}
            reviews={reviews}
            reviewStats={reviewStats}
            userReview={userReview}
            setUserReview={setUserReview}
            fetchReviews={fetchReviews}
          />
        );
      case "learning-tools":
        return (
          <LearningToolsTab
            video={video}
            getProgressPercentage={getProgressPercentage}
          />
        );
      case "compiler":
        return <CompilerTab setActiveTab={setActiveTab} />;
      default:
        return null;
    }
  };

  // Main render
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md border-0 shadow-xl">
          <CardContent className="text-center p-6 md:p-8">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-[#001e62]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="w-6 h-6 md:w-8 md:h-8 text-[#001e62]" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6 text-sm md:text-base">
              You need to sign in to access course content and track your
              progress.
            </p>
            <Link href="/auth/signin">
              <Button size="lg" className="w-full bg-[#001e62] hover:bg-[#001e62]/90">
                Sign In to Continue
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-b-2 border-[#001e62] mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm md:text-base">Loading content...</p>
        </div>
      </div>
    );
  }

  if (!video || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
            Content Not Found
          </h1>
          <p className="text-gray-600 mb-6 text-sm md:text-base">
            The content you're looking for doesn't exist.
          </p>
          <Link href={`/course/${params.courseId}`}>
            <Button className="bg-[#001e62] hover:bg-[#001e62]/90">
              Back to Course
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Redirect if trying to access quiz mode but no quiz available
  if (isQuizMode && (!video.tests || video.tests.length === 0)) {
    router.push(`/course/${params.courseId}/video/${params.videoId}`);
    return null;
  }

  return (
    <AIFeaturesProvider>
      <div className="min-h-screen bg-gray-50">
        <VideoPageHeader
          courseId={params.courseId}
          courseTitle={course.title}
          progressPercentage={getProgressPercentage()}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
        />
        
        {/* Mobile Overlay */}
        {isMobile && sidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" />
        )}

        <div className="flex min-h-[calc(100vh-80px)]">
          <div className="flex-1 bg-white flex flex-col min-w-0">
            {/* Video Player or Quiz Interface */}
            {isQuizMode ? renderQuizInterface() : renderVideoPlayer()}
            {/* Info Section */}
            {renderInfoSection()}
            {/* Tabs - Only show for video mode */}
            {!isQuizMode && (
              <div className="flex-1 bg-white">
                <TabNavigation
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
                <div className="p-4 md:p-6 flex-1 overflow-y-auto">
                  {renderTabContent()}
                </div>
              </div>
            )}
          </div>
          
          <ResponsiveCourseSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            course={course}
            videoProgress={videoProgress}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            currentVideoId={params.videoId}
            getProgressPercentage={getProgressPercentage}
            getCompletedVideos={getCompletedVideos}
            getTotalVideos={getTotalVideos}
            getVideoStatus={getVideoStatus}
            isQuizMode={isQuizMode}
            isMobile={isMobile}
          />
        </div>
      </div>
    </AIFeaturesProvider>
  );
}