// app/course/[courseId]/page.tsx - PRODUCTION OPTIMIZED
"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Clock,
  Users,
  Star,
  Play,
  Lock,
  CheckCircle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Award,
  Target,
  AlertTriangle,
  FileText,
  Download,
  StickyNote,
  Info,
  PlayCircle,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { formatDuration, calculateProgress } from "@/lib/utils";

interface Test {
  id: string;
}

interface Video {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  order: number;
  tests: Test[];
}

interface CourseSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  videos: Video[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  category: string;
  level: string;
  sections: CourseSection[];
  videos: Video[];
  _count: { enrollments: number };
  rating?: number;
}

interface VideoProgress {
  videoId: string;
  completed: boolean;
  testPassed: boolean;
  testScore?: number;
  testAttempts?: number;
}

interface CoursePageProps {
  params: { courseId: string };
}

export default function CoursePage({ params }: CoursePageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [enrolling, setEnrolling] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"videos" | "about" | "notes" | "certificates">("videos");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [enrollmentChecked, setEnrollmentChecked] = useState<boolean>(false);
  const [authCheckComplete, setAuthCheckComplete] = useState<boolean>(false);

  // Fetch course data
  const fetchCourse = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${params.courseId}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data: Course = await response.json();
        setCourse(data);
      } else {
        setError("Course not found or unavailable");
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      setError("Failed to load course. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [params.courseId]);

  // Check enrollment status
  const checkEnrollment = useCallback(async () => {
    if (!session?.user?.email && !session?.user?.id) {
      console.log("👤 No session user, skipping enrollment check");
      setEnrollmentChecked(true);
      return;
    }

    try {
      console.log("🔍 Checking enrollment...", {
        userId: session.user.id,
        userEmail: session.user.email
      });

      const response = await fetch(`/api/enrollments/${params.courseId}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      console.log("📊 Enrollment check response:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Enrollment status:", data);
        setIsEnrolled(data.enrolled);
      } else if (response.status === 401) {
        console.log("🔐 Unauthorized - user needs to sign in");
        setIsEnrolled(false);
      } else {
        console.log("❌ Enrollment check failed:", response.status);
        setIsEnrolled(false);
      }
    } catch (error) {
      console.error("💥 Error checking enrollment:", error);
      setIsEnrolled(false);
    } finally {
      setEnrollmentChecked(true);
    }
  }, [session?.user, params.courseId]);

  // Fetch progress data
  const fetchProgress = useCallback(async () => {
    if (!session?.user || !isEnrolled) return;

    try {
      const response = await fetch(`/api/progress/${params.courseId}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data: VideoProgress[] = await response.json();
        setVideoProgress(data);
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  }, [session?.user, params.courseId, isEnrolled]);

  // Initial course fetch
  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  // Handle authentication and enrollment checks
  useEffect(() => {
    console.log("🔄 Session status changed:", {
      status,
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      userId: session?.user?.id
    });

    if (status === "loading") {
      setAuthCheckComplete(false);
      setEnrollmentChecked(false);
      return;
    }

    setAuthCheckComplete(true);

    if (status === "authenticated" && session?.user && course) {
      checkEnrollment();
    } else if (status === "unauthenticated" || !session?.user) {
      console.log("👤 User not authenticated");
      setIsEnrolled(false);
      setEnrollmentChecked(true);
    }
  }, [status, session, course, checkEnrollment]);

  // Fetch progress when enrollment is confirmed
  useEffect(() => {
    if (isEnrolled && course) {
      fetchProgress();
    }
  }, [isEnrolled, course, fetchProgress]);

  // Expand all sections by default
  useEffect(() => {
    if (course?.sections) {
      const sectionIds = new Set(course.sections.map((s) => s.id));
      setExpandedSections(sectionIds);
    }
  }, [course]);

  // Auto-dismiss messages
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // Enhanced enrollment handler
  const handleEnroll = async () => {
    console.log("=== FRONTEND ENROLLMENT START ===");
    console.log("Session status:", status);
    console.log("Session data:", session);

    // Clear previous messages
    setError(null);
    setSuccessMessage(null);

    // Wait for auth check to complete
    if (!authCheckComplete || status === "loading") {
      console.log("⏳ Auth check not complete, waiting...");
      setError("Please wait while we verify your authentication...");
      return;
    }

    // Check authentication state
    if (status === "unauthenticated" || !session?.user) {
      console.log("❌ Not authenticated, redirecting to signin");
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!session.user.email) {
      console.log("❌ No email in session");
      setError("Invalid session. Please sign out and back in.");
      return;
    }

    setEnrolling(true);

    try {
      console.log("📤 Making enrollment request...");

      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({ courseId: params.courseId }),
      });

      console.log("📥 Enrollment response status:", response.status);

      const data = await response.json();
      console.log("📊 Enrollment response data:", data);

      if (response.ok) {
        console.log("✅ Enrollment successful");

        // Update local state immediately
        setIsEnrolled(true);

        // Show success message based on response
        if (data.code === "ALREADY_ENROLLED") {
          setSuccessMessage("You're already enrolled! Taking you to your course...");
        } else {
          setSuccessMessage("Successfully enrolled! Redirecting to your first lesson...");
        }

        // Force re-check enrollment status
        setTimeout(() => {
          checkEnrollment();
        }, 500);

        // Navigate to the course or first video
        const redirectPath = data.redirect || `/course/${params.courseId}`;
        console.log("🔄 Navigating to:", redirectPath);

        setTimeout(() => {
          if (data.redirect && data.redirect.includes('/video/')) {
            // Direct to first video
            router.push(data.redirect);
          } else {
            // Stay on course page but refresh enrollment status
            window.location.reload();
          }
        }, 2000);

      } else {
        console.error("❌ Enrollment failed:", data);

        // Handle specific error codes
        switch (data.code) {
          case "AUTH_REQUIRED":
          case "INVALID_SESSION":
          case "USER_LOOKUP_FAILED":
            setError("Authentication issue. Please sign in again.");
            setTimeout(() => {
              router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
            }, 2000);
            break;

          case "COURSE_NOT_FOUND":
            setError("This course could not be found.");
            break;

          case "COURSE_NOT_PUBLISHED":
            setError("This course is not currently available for enrollment.");
            break;

          case "DATABASE_ERROR":
            setError("Temporary server issue. Please try again in a moment.");
            break;

          default:
            setError(data.details || data.error || "Failed to enroll. Please try again.");
        }
      }
    } catch (error) {
      console.error("💥 Network error during enrollment:", error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setEnrolling(false);
    }
  };

  // Get video status logic
  const getVideoStatus = (
    video: Video,
    sectionVideos: Video[],
    videoIndex: number,
    sectionIndex: number
  ): string => {
    const progress = videoProgress.find((p) => p.videoId === video.id);

    if (!video.tests || video.tests.length === 0) {
      if (progress?.completed) return "completed";
    } else {
      if (progress?.completed && progress?.testPassed) return "completed";
    }

    if (sectionIndex === 0 && videoIndex === 0) {
      return "available";
    }

    let prevVideo: Video | null = null;

    if (videoIndex > 0) {
      prevVideo = sectionVideos[videoIndex - 1];
    } else if (sectionIndex > 0) {
      const prevSection = course?.sections?.[sectionIndex - 1];
      if (prevSection && prevSection.videos.length > 0) {
        prevVideo = prevSection.videos[prevSection.videos.length - 1];
      }
    }

    if (prevVideo) {
      const prevProgress = videoProgress.find((p) => p.videoId === prevVideo!.id);
      const prevCompleted =
        prevProgress?.completed &&
        (!prevVideo.tests || prevVideo.tests.length === 0 || prevProgress?.testPassed);

      if (prevCompleted) {
        return "available";
      }
    }

    return "locked";
  };

  const getQuizStatus = (video: Video): string => {
    if (!video.tests || video.tests.length === 0) return "no-quiz";
    const progress = videoProgress.find((p) => p.videoId === video.id);
    if (!progress?.completed) return "quiz-locked";
    if (progress?.testPassed) return "quiz-passed";
    return "quiz-available";
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
    const sectionVideos = course?.sections?.reduce((acc, section) => acc + section.videos.length, 0) || 0;
    const legacyVideos = course?.videos?.length || 0;
    return sectionVideos + legacyVideos;
  };

  const getTotalDuration = (): number => {
    const sectionDuration = course?.sections?.reduce(
      (acc, section) => acc + section.videos.reduce((videoAcc, video) => videoAcc + (video.duration || 0), 0),
      0
    ) || 0;
    const legacyDuration = course?.videos?.reduce((acc, video) => acc + (video.duration || 0), 0) || 0;
    return sectionDuration + legacyDuration;
  };

  const getCompletedVideos = (): number => {
    return videoProgress.filter((p) => {
      const video = getAllVideos().find((v) => v.id === p.videoId);
      if (!video) return false;
      if (!video.tests || video.tests.length === 0) {
        return p.completed;
      }
      return p.completed && p.testPassed;
    }).length;
  };

  const getAllVideos = (): Video[] => {
    const allVideos: Video[] = [];
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
    return calculateProgress(completed, total);
  };

  // Render videos tab
  const renderVideosTab = () => (
    <div className="space-y-6">
      {!enrollmentChecked ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Checking your enrollment status...</p>
        </div>
      ) : (
        course?.sections?.map((section, sectionIndex) => (
          <Card key={section.id} className="overflow-hidden">
            <div
              className="flex items-center justify-between p-6 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors border-b"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center">
                <div className="flex items-center mr-4">
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{section.title}</h3>
                  {section.description && (
                    <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span className="flex items-center">
                  <PlayCircle className="w-4 h-4 mr-1" />
                  {section.videos.length} videos
                </span>
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatDuration(section.videos.reduce((acc, v) => acc + (v.duration || 0), 0))}
                </span>
              </div>
            </div>

            {expandedSections.has(section.id) && (
              <div className="p-0">
                {section.videos.map((video, videoIndex) => {
                  const status = getVideoStatus(video, section.videos, videoIndex, sectionIndex);
                  const quizStatus = getQuizStatus(video);
                  const progress = videoProgress.find((p) => p.videoId === video.id);

                  return (
                    <div
                      key={video.id}
                      className={`flex items-center p-6 border-b border-gray-100 last:border-b-0 transition-colors ${
                        status === "completed"
                          ? "bg-green-50"
                          : status === "available"
                          ? "hover:bg-blue-50"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center mr-6">
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center mr-4 text-sm font-medium">
                          {videoIndex + 1}
                        </div>
                        {status === "completed" ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : status === "available" ? (
                          <Play className="w-6 h-6 text-blue-600" />
                        ) : (
                          <Lock className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-2 text-lg">{video.title}</h4>
                        {video.description && (
                          <p className="text-sm text-gray-600 mb-3">{video.description}</p>
                        )}
                        <div className="flex items-center text-sm text-gray-500 space-x-6">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDuration(video.duration || 0)}
                          </div>

                          {quizStatus !== "no-quiz" && (
                            <div
                              className={`flex items-center ${
                                quizStatus === "quiz-passed"
                                  ? "text-green-600"
                                  : quizStatus === "quiz-available"
                                  ? "text-blue-600"
                                  : "text-gray-500"
                              }`}
                            >
                              {quizStatus === "quiz-passed" ? (
                                <>
                                  <Target className="w-4 h-4 mr-1" />
                                  Quiz Passed ({progress?.testScore}%)
                                </>
                              ) : quizStatus === "quiz-available" ? (
                                <>
                                  <FileText className="w-4 h-4 mr-1" />
                                  Quiz Available
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4 mr-1" />
                                  Quiz Locked
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {isEnrolled && status === "available" && (
                        <Link href={`/course/${course.id}/video/${video.id}`}>
                          <Button size="lg" className="ml-4">
                            {progress?.completed ? "Review" : "Watch"}
                          </Button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );

  // Render other tabs (about, notes, certificates)
  const renderAboutTab = () => (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="w-5 h-5 mr-2" />
            What you'll learn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span>Apply modern development techniques</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span>Gain hands-on experience with tools</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span>Prepare for professional development</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Course Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed">{course?.description}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills you'll gain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              course?.category,
              "Problem Solving",
              "Project Development",
              "Best Practices",
              "Modern Tools",
              "Industry Standards",
            ].map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderNotesTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <StickyNote className="w-5 h-5 mr-2" />
          Course Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEnrolled ? (
          <div className="text-center py-12">
            <StickyNote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your Notes</h3>
            <p className="text-gray-600 mb-6">
              Take notes while watching videos to remember important concepts
            </p>
            <Button>Start Taking Notes</Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Enroll to Access Notes</h3>
            <p className="text-gray-600">Enroll in this course to start taking and managing your notes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderCertificatesTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Award className="w-5 h-5 mr-2" />
          Certificates
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEnrolled ? (
          <div className="text-center py-12">
            <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Course Certificate</h3>
            <p className="text-gray-600 mb-6">
              Complete all course videos and pass the quizzes to earn your certificate
            </p>
            {getProgressPercentage() === 100 ? (
              <Button className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Download Certificate
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {getProgressPercentage()}% complete - {getTotalVideos() - getCompletedVideos()} videos remaining
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Enroll to Earn Certificate</h3>
            <p className="text-gray-600">
              Enroll in this course to work towards earning your completion certificate
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Course Not Found</h1>
          <p className="text-gray-600 mb-6">
            The course you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalVideos = getTotalVideos();
  const totalDuration = getTotalDuration();
  const progressPercentage = getProgressPercentage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Error/Success Messages */}
      {(error || successMessage) && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg mb-2">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-red-800 font-medium">Error</h4>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-green-800 font-medium">Success</h4>
                  <p className="text-green-700 text-sm mt-1">{successMessage}</p>
                </div>
                <button onClick={() => setSuccessMessage(null)} className="ml-auto text-green-400 hover:text-green-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          {course.thumbnail ? (
            <div className="relative w-full h-full">
              <Image src={course.thumbnail} alt={course.title} fill className="object-cover opacity-20" />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 opacity-90" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-blue-800/60" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl">
            {/* Badge and Level */}
            <div className="flex items-center mb-6">
              <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium mr-4">
                {course.category}
              </span>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  course.level === "BEGINNER"
                    ? "bg-green-500 text-white"
                    : course.level === "INTERMEDIATE"
                    ? "bg-yellow-500 text-white"
                    : "bg-red-500 text-white"
                }`}
              >
                {course.level}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              {course.title}
            </h1>

            {/* Description */}
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">{course.description}</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-6 h-6 text-blue-200 mr-2" />
                </div>
                <div className="text-2xl font-bold text-white">{formatDuration(totalDuration)}</div>
                <div className="text-sm text-blue-200">Duration</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <BookOpen className="w-6 h-6 text-blue-200 mr-2" />
                </div>
                <div className="text-2xl font-bold text-white">{totalVideos}</div>
                <div className="text-sm text-blue-200">Videos</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-6 h-6 text-blue-200 mr-2" />
                </div>
                <div className="text-2xl font-bold text-white">{course._count?.enrollments || 0}</div>
                <div className="text-sm text-blue-200">Students</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Star className="w-6 h-6 text-yellow-400 mr-2 fill-current" />
                </div>
                <div className="text-2xl font-bold text-white">{course.rating || 4.8}</div>
                <div className="text-sm text-blue-200">Rating</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {!authCheckComplete || !enrollmentChecked ? (
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                  <span className="text-white">
                    {!authCheckComplete ? "Checking authentication..." : "Checking enrollment..."}
                  </span>
                </div>
              ) : !isEnrolled ? (
                <Button
                  size="lg"
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="bg-white text-blue-900 hover:bg-gray-100 text-lg px-8 py-4 disabled:opacity-50"
                >
                  {enrolling ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    "Enroll for Free"
                  )}
                </Button>
              ) : (
                <>
                  <Link
                    href={`/course/${course.id}/video/${
                      course.sections?.[0]?.videos?.[0]?.id || course.videos?.[0]?.id
                    }`}
                  >
                    <Button size="lg" className="bg-white text-blue-900 hover:bg-gray-100 text-lg px-8 py-4">
                      <Play className="w-5 h-5 mr-2" />
                      Continue Learning
                    </Button>
                  </Link>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm">{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "videos", label: "Videos", icon: PlayCircle },
              { id: "about", label: "About", icon: Info },
              { id: "notes", label: "Notes", icon: StickyNote },
              { id: "certificates", label: "Certificates", icon: Award },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === "videos" && renderVideosTab()}
          {activeTab === "about" && renderAboutTab()}
          {activeTab === "notes" && renderNotesTab()}
          {activeTab === "certificates" && renderCertificatesTab()}
        </div>
      </div>
    </div>
  );
}