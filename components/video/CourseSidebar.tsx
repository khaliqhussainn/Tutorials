import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ChevronRight,
  ChevronDown,
  List,
  Clock,
  CheckCircle,
  PlayCircle,
  Lock,
  Target,
  Award,
  RefreshCw,
  X
} from "lucide-react";

interface VideoProgress {
  videoId: string;
  completed: boolean;
  testPassed: boolean;
  watchTime: number;
  testScore?: number;
  testAttempts?: number;
  hasAccess: boolean;
}

interface Test {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface Video {
  id: string;
  title: string;
  duration?: number;
  tests?: Test[];
  order: number;
}

interface CourseSection {
  id: string;
  title: string;
  order: number;
  videos: Video[];
}

interface Course {
  id: string;
  title: string;
  sections?: CourseSection[];
  videos?: Video[];
}

interface ResponsiveCourseSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  course: Course | null;
  videoProgress: VideoProgress[];
  expandedSections: Set<string>;
  toggleSection: (sectionId: string) => void;
  currentVideoId: string;
  getProgressPercentage: () => number;
  getCompletedVideos: () => number;
  getTotalVideos: () => number;
  getVideoStatus: (
    videoItem: any,
    sectionVideos: any[],
    videoIndex: number,
    sectionIndex: number
  ) => string;
  isQuizMode?: boolean;
  isMobile?: boolean;
}

const formatDuration = (seconds: number | undefined) => {
  if (!seconds) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export function ResponsiveCourseSidebar({
  sidebarOpen,
  setSidebarOpen,
  course,
  videoProgress,
  expandedSections,
  toggleSection,
  currentVideoId,
  getProgressPercentage,
  getCompletedVideos,
  getTotalVideos,
  getVideoStatus,
  isQuizMode = false,
  isMobile = false
}: ResponsiveCourseSidebarProps) {

  const renderCourseItems = (section: CourseSection, sectionIndex: number) => {
    const items: JSX.Element[] = [];
    
    if (!section.videos || !Array.isArray(section.videos)) return items;

    section.videos.forEach((videoItem, videoIndex) => {
      const status = getVideoStatus(videoItem, section.videos, videoIndex, sectionIndex);
      const progress = videoProgress.find((p) => p.videoId === videoItem.id);
      const isCurrentVideo = videoItem.id === currentVideoId && !isQuizMode;
      const isCurrentQuiz = videoItem.id === currentVideoId && isQuizMode;
      const hasQuiz = videoItem.tests && videoItem.tests.length > 0;

      // Add video item
      items.push(
        <div
          key={videoItem.id}
          className={`flex items-center p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
            isCurrentVideo
              ? "bg-[#001e62]/5 border-l-4 border-l-[#001e62]"
              : ""
          }`}
        >
          <div className="flex items-center mr-3">
            <div
              className={`w-7 h-7 md:w-8 md:h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all ${
                isCurrentVideo
                  ? "bg-[#001e62] text-white border-[#001e62]"
                  : status === "completed"
                  ? "bg-green-500 text-white border-green-500"
                  : status === "available"
                  ? "bg-white border-[#001e62] text-[#001e62]"
                  : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              {status === "completed" ? (
                <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
              ) : status === "available" ? (
                <PlayCircle className="w-3 h-3 md:w-4 md:h-4" />
              ) : (
                videoIndex + 1
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h5
              className={`font-medium text-sm leading-tight line-clamp-2 ${
                isCurrentVideo
                  ? "text-[#001e62]"
                  : "text-gray-900"
              }`}
            >
              {videoItem.title}
            </h5>
            <div className="flex flex-wrap items-center text-xs text-gray-500 mt-1 gap-x-2">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatDuration(videoItem.duration)}
              </div>
              {hasQuiz && (
                <div className="flex items-center">
                  <span>•</span>
                  <Target className="w-3 h-3 mx-1" />
                  <span>Quiz</span>
                </div>
              )}
              {progress && progress.watchTime > 0 && !isCurrentVideo && (
                <div className="flex items-center">
                  <span>•</span>
                  <span className="text-blue-600 ml-1">
                    {Math.round(
                      (progress.watchTime / (videoItem.duration || 1)) * 100
                    )}% watched
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-2">
            {status === "available" && !isCurrentVideo && (
              <Link href={`/course/${course?.id}/video/${videoItem.id}`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs px-2 py-1 h-8"
                  onClick={() => isMobile && setSidebarOpen(false)}
                >
                  <PlayCircle className="w-3 h-3" />
                </Button>
              </Link>
            )}

            {isCurrentVideo && (
              <Badge className="bg-[#001e62] text-white text-xs px-2 py-1">
                Playing
              </Badge>
            )}

            {status === "locked" && (
              <Lock className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
      );

      // Add quiz item if video has tests and is completed
      if (hasQuiz && progress?.completed) {
        const quizCompleted = progress?.testPassed || false;
        
        items.push(
          <div
            key={`${videoItem.id}-quiz`}
            className={`flex items-center p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ml-4 ${
              isCurrentQuiz
                ? "bg-blue-50 border-l-4 border-l-blue-500"
                : ""
            }`}
          >
            <div className="flex items-center mr-3">
              <div
                className={`w-7 h-7 md:w-8 md:h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all ${
                  isCurrentQuiz
                    ? "bg-blue-500 text-white border-blue-500"
                    : quizCompleted
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-blue-100 border-blue-300 text-blue-600"
                }`}
              >
                {quizCompleted ? (
                  <Award className="w-3 h-3 md:w-4 md:h-4" />
                ) : (
                  <Target className="w-3 h-3 md:w-4 md:h-4" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h5 className={`font-medium text-sm leading-tight line-clamp-2 ${
                isCurrentQuiz ? "text-blue-700" : "text-gray-900"
              }`}>
                Quiz: {videoItem.title}
              </h5>
              <div className="flex flex-wrap items-center text-xs text-gray-500 mt-1 gap-x-2">
                <div className="flex items-center">
                  <Target className="w-3 h-3 mr-1" />
                  {videoItem.tests?.length || 0} questions • 70% to pass
                </div>
                {progress?.testScore && (
                  <div className="flex items-center">
                    <span>•</span>
                    <span className={`ml-1 ${progress.testPassed ? "text-green-600" : "text-red-600"}`}>
                      Best: {progress.testScore}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-2">
              {quizCompleted && progress?.testScore && (
                <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1">
                  {progress.testScore}%
                </Badge>
              )}
              
              {!isCurrentQuiz && (
                <Link href={`/course/${course?.id}/video/${videoItem.id}?mode=quiz`}>
                  <Button
                    size="sm"
                    variant={quizCompleted ? "outline" : "primary"}
                    className={`text-xs px-2 py-1 h-8 ${
                      !quizCompleted ? "bg-blue-600 hover:bg-blue-700" : ""
                    }`}
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    {quizCompleted ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Retake</span>
                      </>
                    ) : (
                      <>
                        <Target className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Take Quiz</span>
                      </>
                    )}
                  </Button>
                </Link>
              )}

              {isCurrentQuiz && (
                <Badge className="bg-blue-500 text-white text-xs px-2 py-1">
                  Active
                </Badge>
              )}
            </div>
          </div>
        );
      }
    });

    return items;
  };

  const sidebarClasses = isMobile 
    ? `fixed top-16 right-0 h-[calc(100vh-4rem)] bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-30 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      } w-80 max-w-[85vw] flex flex-col`
    : `${
        sidebarOpen ? "w-80 lg:w-96" : "w-12"
      } transition-all duration-300 bg-white border-l border-gray-200 flex-shrink-0 flex flex-col`;

  return (
    <div className={sidebarClasses} id="course-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        {!isMobile && (
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            {sidebarOpen ? (
              <>
                <ChevronRight className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Hide Course Content</span>
                <span className="md:hidden">Hide Content</span>
              </>
            ) : (
              <List className="w-4 h-4" />
            )}
          </Button>
        )}
        
        {/* Mobile Header */}
        {isMobile && sidebarOpen && (
          <>
            <h3 className="font-semibold text-gray-900 flex-1">Course Content</h3>
            <Button
              onClick={() => setSidebarOpen(false)}
              variant="ghost"
              size="sm"
              className="flex-shrink-0 p-2 hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-600" />
            </Button>
          </>
        )}
      </div>

      {sidebarOpen && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Progress Section */}
          <div className="p-4 flex-shrink-0">
            <div className="bg-gradient-to-r from-[#001e62] to-[#001e62]/90 p-4 rounded-xl text-white">
              <h3 className="font-bold mb-2 text-sm md:text-base">Course Progress</h3>
              <div className="text-xl md:text-2xl font-bold mb-2">
                {getProgressPercentage()}%
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <div className="text-xs md:text-sm text-white/80 mt-2">
                {getCompletedVideos()}/{getTotalVideos()} videos completed
              </div>
            </div>
          </div>

          {/* Course Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-4">
            <div className="space-y-4 pb-4">
              {course?.sections && Array.isArray(course.sections) && course.sections.map((section, sectionIndex) => (
                <div
                  key={section.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="w-4 h-4 mr-2 text-gray-600 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mr-2 text-gray-600 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm line-clamp-1">{section.title}</h4>
                        <p className="text-xs text-gray-500">
                          {section.videos?.length || 0} videos
                          {section.videos?.some(v => v.tests && v.tests.length > 0) && " + quizzes"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {expandedSections.has(section.id) && section.videos && Array.isArray(section.videos) && (
                    <div className="bg-white">
                      {renderCourseItems(section, sectionIndex)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Close Button at Bottom */}
          {isMobile && (
            <div className="p-4 border-t border-gray-200 flex-shrink-0 bg-white">
              <Button
                onClick={() => setSidebarOpen(false)}
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              >
                <X className="w-4 h-4 mr-2" />
                Close Sidebar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}