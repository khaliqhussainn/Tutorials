"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
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
  Award 
} from "lucide-react";

// Import new components
import { VideoPageHeader } from "@/components/video/VideoPageHeader";
import { CourseSidebar } from "@/components/video/CourseSidebar";
import { TabNavigation } from "@/components/video/TabNavigation";
import { QATab } from "@/components/video/QATab";
import { ReviewsTab } from "@/components/video/ReviewsTab";
import { AnnouncementsTab } from "@/components/video/AnnouncementsTab";
import { AboutTab } from "@/components/video/AboutTab";
import { LearningToolsTab } from "@/components/video/LearningToolsTab";

// Updated interfaces for quiz system
interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

interface Test {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  order: number;
}

interface QuizAttempt {
  id: string;
  score: number;
  passed: boolean;
  answers: number[];
  timeSpent: number;
  completedAt: string;
  attemptNumber: number;
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
    segments?: TranscriptSegment[];
    confidence?: number;
    provider?: string;
  };
}

interface CourseSection {
  id: string;
  title: string;
  order: number;
  videos: { id: string; order: number; title: string; duration?: number; tests?: Test[] }[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  category: string;
  level: string;
  sections: CourseSection[];
  videos: { id: string; order: number; title: string; duration?: number; tests?: Test[] }[];
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
  const playerRef = useRef<VideoPlayerRef>(null);

  // Existing state
  const [video, setVideo] = useState<Video | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
  const [watchTime, setWatchTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState<CourseSection | null>(null);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [canWatch, setCanWatch] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "about" | "qa" | "notes" | "announcements" | "reviews" | "learning-tools"
  >("about");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Dynamic content state
  const [questions, setQuestions] = useState<CourseQuestion[]>([]);
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
  const [reviews, setReviews] = useState<CourseReviewData[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [userReview, setUserReview] = useState<CourseReviewData | null>(null);

  // NEW: Quiz-related state
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [quizRequired, setQuizRequired] = useState(false);

  // Updated useEffect hooks
  useEffect(() => {
    if (session) {
      fetchVideoData();
      fetchVideoProgress();
      checkVideoAccess();
      checkQuizRequirement();
      fetchQuizAttempts();
      fetchQuestions();
      fetchAnnouncements();
      fetchReviews();
    }
  }, [params.videoId, session]);

  useEffect(() => {
    if (course?.sections) {
      const sectionIds = new Set(course.sections.map((s) => s.id));
      setExpandedSections(sectionIds);
    }
  }, [course]);

  // NEW: Quiz-related fetch functions
  const fetchQuizAttempts = async () => {
    try {
      const response = await fetch(`/api/videos/${params.videoId}/quiz-attempts`);
      if (response.ok) {
        const attempts = await response.json();
        setQuizAttempts(attempts);
      }
    } catch (error) {
      console.error("Error fetching quiz attempts:", error);
    }
  };

  const checkQuizRequirement = async () => {
    try {
      const response = await fetch(`/api/videos/${params.videoId}/quiz-requirement`);
      if (response.ok) {
        const data = await response.json();
        setQuizRequired(data.needsQuiz);
        setShowQuizPrompt(data.needsQuiz);
      }
    } catch (error) {
      console.error("Error checking quiz requirement:", error);
    }
  };

  // Existing fetch functions
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
        setVideo(videoData);
        setCourse(courseData);

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

  // Event handlers
  const handleVideoProgress = async (progress: {
    played: number;
    playedSeconds: number;
  }) => {
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

  // UPDATED: handleVideoEnd with quiz checking
  const handleVideoEnd = async () => {
    if (!videoCompleted) {
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
        
        // Check if quiz is required after completion
        if (video?.tests && video.tests.length > 0) {
          await checkQuizRequirement();
        }
      } catch (error) {
        console.error("Error marking video complete:", error);
      }
    }
  };

  const handleSeekTo = (timeInSeconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(timeInSeconds, "seconds");
      setCurrentVideoTime(timeInSeconds);
    }
  };

  // UPDATED: Helper function with quiz logic
  const getVideoStatus = (
    videoItem: any,
    sectionVideos: any[],
    videoIndex: number,
    sectionIndex: number
  ): string => {
    const progress = videoProgress.find((p) => p.videoId === videoItem.id);

    // If video has quiz questions
    if (videoItem.tests && videoItem.tests.length > 0) {
      if (progress?.completed && progress?.testPassed) return "completed";
      if (progress?.completed && !progress?.testPassed) return "quiz-required";
    } else {
      // No quiz, just check completion
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
        (acc, section) => acc + section.videos.length,
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
        allVideos.push(...section.videos);
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

  // NEW: Quiz Prompt Modal Component
  const QuizPromptModal = () => {
    if (!showQuizPrompt || !video?.tests || video.tests.length === 0) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-blue-600" />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Quiz Time!
            </h2>
            
            <p className="text-gray-600 mb-6">
              You've completed the video. Test your knowledge with a {video.tests.length}-question quiz 
              to continue to the next lesson.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900">{video.tests.length}</div>
                <div className="text-gray-600">Questions</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900">70%</div>
                <div className="text-gray-600">Passing Score</div>
              </div>
            </div>

            {quizAttempts.length > 0 && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Previous attempts: {quizAttempts.length} 
                  {quizAttempts.length > 0 && (
                    <span className="block">
                      Best score: {Math.max(...quizAttempts.map(a => a.score))}%
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowQuizPrompt(false)}
                className="flex-1"
              >
                Review Video
              </Button>
              <Button
                onClick={() => {
                  setShowQuizPrompt(false);
                  router.push(`/course/${params.courseId}/video/${params.videoId}/quiz`);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Take Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // NEW: Enhanced VideoInfoSection with quiz status
  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds || seconds === 0) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const EnhancedVideoInfoSection = () => {
    const hasQuiz = !!(video?.tests && video.tests.length > 0);
    const currentProgress = videoProgress.find(p => p.videoId === params.videoId);
    const quizPassed = currentProgress?.testPassed || false;
    const quizScore = currentProgress?.testScore;

    return (
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{video?.title}</h1>
            {video?.description && (
              <p className="text-gray-600 leading-relaxed">{video.description}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-4 ml-6">
            {/* Video completion status */}
            <div className="text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${
                videoCompleted ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {videoCompleted ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <PlayCircle className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="text-xs text-gray-600">
                {videoCompleted ? 'Completed' : 'In Progress'}
              </div>
            </div>

            {/* Quiz status */}
            {hasQuiz && (
              <div className="text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${
                  quizPassed ? 'bg-green-100' : 
                  videoCompleted ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  {quizPassed ? (
                    <Award className="w-6 h-6 text-green-600" />
                  ) : videoCompleted ? (
                    <Target className="w-6 h-6 text-yellow-600" />
                  ) : (
                    <Target className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="text-xs text-gray-600">
                  {quizPassed ? `${quizScore}%` : 'Quiz Required'}
                </div>
              </div>
            )}

            {/* Progress info */}
            <div className="text-right text-sm text-gray-600">
              <div className="flex items-center mb-1">
                <Clock className="w-4 h-4 mr-1" />
                <span>
                  {formatDuration(watchTime)} / {formatDuration(video?.duration || 0)}
                </span>
              </div>
              <div className="text-xs">
                Progress: {video?.duration ? Math.round((watchTime / video.duration) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Quiz action button */}
        {hasQuiz && videoCompleted && (
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <Target className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <div className="font-medium text-blue-900">
                  {quizPassed ? 'Quiz Completed' : 'Quiz Available'}
                </div>
                <div className="text-sm text-blue-700">
                  {quizPassed 
                    ? `You scored ${quizScore}% - You can retake to improve your score`
                    : 'Complete the quiz to continue to the next lesson'
                  }
                </div>
              </div>
            </div>
            <Button
              onClick={() => router.push(`/course/${params.courseId}/video/${params.videoId}/quiz`)}
              variant={quizPassed ? "outline" : "primary"}
              className={!quizPassed ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {quizPassed ? 'Retake Quiz' : 'Take Quiz'}
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Render tab content
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
        return (
          <div className="max-w-4xl">
            <NotesTab
              videoId={params.videoId}
              currentTime={currentVideoTime}
              videoDuration={video?.duration || 0}
              onSeekTo={handleSeekTo}
            />
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
            setActiveTab={setActiveTab}
          />
        );
      default:
        return null;
    }
  };

  // Loading and error states
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md border-0 shadow-xl">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-[#001e62]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="w-8 h-8 text-[#001e62]" />
            </div>
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">
              You need to sign in to access course videos and track your progress.
            </p>
            <Link href="/auth/signin">
              <Button size="lg" className="bg-[#001e62] hover:bg-[#001e62]/90">
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#001e62] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video...</p>
        </div>
      </div>
    );
  }

  if (!video || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Video Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The video you're looking for doesn't exist.
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

  return (
    <div className="min-h-screen bg-gray-50">
      <VideoPageHeader
        courseId={params.courseId}
        courseTitle={course.title}
        progressPercentage={getProgressPercentage()}
      />

      <div className="flex min-h-[calc(100vh-80px)]">
        <div className="flex-1 bg-white flex flex-col min-w-0">
          <div className="bg-black p-6">
            <VideoPlayerWithTranscript
              ref={playerRef}
              videoUrl={video.videoUrl}
              title={video.title}
              videoId={video.id}
              onProgress={handleVideoProgress}
              onEnded={handleVideoEnd}
              canWatch={canWatch}
              initialTime={watchTime}
            />
          </div>

          <EnhancedVideoInfoSection />

          <div className="flex-1 bg-white">
            <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="p-6 flex-1 overflow-y-auto">
              {renderTabContent()}
            </div>
          </div>
        </div>

        <CourseSidebar
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
        />
      </div>

      {/* Quiz Prompt Modal */}
      <QuizPromptModal />
    </div>
  );
}