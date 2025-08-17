// app/dashboard/page.tsx - PRODUCTION FIXED VERSION
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import CourseCard from "@/components/course/CourseCard";
import {
  BookOpen,
  Clock,
  Trophy,
  Flame,
  TrendingUp,
  Play,
  Calendar,
  Target,
  Loader2,
  AlertCircle,
  X,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import ClientAuthWrapper from "@/components/layout/ClientAuthWrapper";

interface DashboardStats {
  enrolledCourses: number;
  completedCourses: number;
  totalWatchTime: number;
  currentStreak: number;
  favoriteCoursesCount: number;
}

interface EnrolledCourse {
  id: string;
  course: {
    id: string;
    title: string;
    description: string;
    thumbnail?: string;
    category: string;
    level: string;
    videos: { duration?: number }[];
    _count: { enrollments: number };
  };
  progress: number;
  updatedAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCourses, setRecentCourses] = useState<EnrolledCourse[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [dataFetched, setDataFetched] = useState(false);

  // Handle authentication state changes
  useEffect(() => {
    console.log("Dashboard: Auth status changed:", status);
    console.log(
      "Dashboard: Session:",
      session ? { id: session.user?.id, email: session.user?.email } : null
    );

    if (status === "loading") {
      console.log("Dashboard: Session loading...");
      return;
    }

    if (status === "unauthenticated") {
      console.log("Dashboard: Not authenticated, redirecting to signin");
      router.push("/auth/signin?callbackUrl=/dashboard");
      return;
    }

    if (status === "authenticated" && session?.user && !dataFetched) {
      console.log("Dashboard: Authenticated, fetching data");
      fetchDashboardData();
    }
  }, [status, session, router, dataFetched]);

  // Auto-dismiss error messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchDashboardData = async () => {
    if (!session?.user) {
      console.log("Dashboard: No session user, skipping data fetch");
      setLoading(false);
      return;
    }

    console.log("Dashboard: Starting data fetch...");
    setLoading(true);
    setError(null);

    try {
      // Fetch all data with timeout and retry logic
      const fetchWithTimeout = async (url: string, timeout = 10000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              "Cache-Control": "no-cache",
            },
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      };

      const [statsResponse, coursesResponse, favoritesResponse] =
        await Promise.allSettled([
          fetchWithTimeout("/api/user/stats"),
          fetchWithTimeout("/api/user/courses"),
          fetchWithTimeout("/api/user/favorites"),
        ]);

      console.log("Dashboard: Data fetch responses:", {
        stats: statsResponse.status,
        courses: coursesResponse.status,
        favorites: favoritesResponse.status,
      });

      // Handle stats
      if (statsResponse.status === "fulfilled" && statsResponse.value.ok) {
        try {
          const statsData = await statsResponse.value.json();
          console.log("Dashboard: Stats loaded:", statsData);
          setStats(statsData);
        } catch (e) {
          console.error("Dashboard: Error parsing stats:", e);
        }
      } else {
        console.error(
          "Dashboard: Stats fetch failed:",
          statsResponse.status === "fulfilled"
            ? statsResponse.value.status
            : statsResponse.reason
        );
      }

      // Handle courses
      if (coursesResponse.status === "fulfilled" && coursesResponse.value.ok) {
        try {
          const coursesData = await coursesResponse.value.json();
          console.log("Dashboard: Courses loaded:", coursesData.length);
          setRecentCourses(coursesData);
        } catch (e) {
          console.error("Dashboard: Error parsing courses:", e);
        }
      } else {
        console.error(
          "Dashboard: Courses fetch failed:",
          coursesResponse.status === "fulfilled"
            ? coursesResponse.value.status
            : coursesResponse.reason
        );
      }

      // Handle favorites
      if (
        favoritesResponse.status === "fulfilled" &&
        favoritesResponse.value.ok
      ) {
        try {
          const favoritesData = await favoritesResponse.value.json();
          console.log("Dashboard: Favorites loaded:", favoritesData.length);
          setFavorites(favoritesData.map((fav: any) => fav.courseId));
        } catch (e) {
          console.error("Dashboard: Error parsing favorites:", e);
        }
      } else {
        console.error(
          "Dashboard: Favorites fetch failed:",
          favoritesResponse.status === "fulfilled"
            ? favoritesResponse.value.status
            : favoritesResponse.reason
        );
      }

      setDataFetched(true);
    } catch (error: any) {
      console.error("Dashboard: Error fetching data:", error);

      if (error.name === "AbortError") {
        setError(
          "Request timed out. Please check your connection and try again."
        );
      } else if (error.message?.includes("fetch")) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to load dashboard data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const retryFetch = () => {
    setRetryCount((prev) => prev + 1);
    setDataFetched(false);
    fetchDashboardData();
  };

  const toggleFavorite = async (courseId: string) => {
    if (!session?.user) {
      setError("Please sign in to manage favorites");
      return;
    }

    setFavoriteLoading(courseId);
    setError(null);

    try {
      const method = favorites.includes(courseId) ? "DELETE" : "POST";

      const response = await fetch("/api/user/favorites", {
        method,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({ courseId }),
      });

      if (response.ok) {
        setFavorites((prev) =>
          prev.includes(courseId)
            ? prev.filter((id) => id !== courseId)
            : [...prev, courseId]
        );

        // Update stats if available
        if (stats) {
          setStats((prev) =>
            prev
              ? {
                  ...prev,
                  favoriteCoursesCount: favorites.includes(courseId)
                    ? prev.favoriteCoursesCount - 1
                    : prev.favoriteCoursesCount + 1,
                }
              : null
          );
        }
      } else {
        const errorData = await response.json();
        console.error("Error toggling favorite:", errorData);

        if (response.status === 401) {
          setError("Session expired. Please sign in again.");
          router.push("/auth/signin?callbackUrl=/dashboard");
        } else {
          setError("Failed to update favorites. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setError("Network error. Please check your connection.");
    } finally {
      setFavoriteLoading(null);
    }
  };

  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Loading state
  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <BookOpen className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-blue-600 text-lg font-medium">
            {status === "loading"
              ? "Verifying authentication..."
              : "Loading your dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated state
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 mb-6">
            Please sign in to access your dashboard.
          </p>
          <Button
            onClick={() => router.push("/auth/signin?callbackUrl=/dashboard")}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (error && !dataFetched && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Dashboard Error
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={retryFetch} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Try Again
            </Button>
            <Button variant="outline" onClick={() => router.push("/courses")}>
              Browse Courses
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClientAuthWrapper requireAuth={true}>
      <div className="min-h-screen bg-white py-8">
        {/* Error Message Toast */}
        {error && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-red-800 font-medium">Error</h4>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Welcome back, {session?.user?.name?.split(" ")[0] || "Student"}!
            </h1>
            <p className="text-lg text-gray-600">
              Continue your learning journey and achieve your goals.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {stats ? (
              <>
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 text-center">
                    <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.enrolledCourses}
                    </p>
                    <p className="text-sm text-gray-600">Enrolled</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 text-center">
                    <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.completedCourses}
                    </p>
                    <p className="text-sm text-gray-600">Completed</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 text-center">
                    <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {formatWatchTime(stats.totalWatchTime)}
                    </p>
                    <p className="text-sm text-gray-600">Watch Time</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 text-center">
                    <Flame className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.currentStreak}
                    </p>
                    <p className="text-sm text-gray-600">Day Streak</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 text-center">
                    <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.favoriteCoursesCount}
                    </p>
                    <p className="text-sm text-gray-600">Favorites</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              // Loading skeleton for stats
              Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-4 text-center">
                    <div className="w-8 h-8 bg-gray-200 rounded mx-auto mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded mb-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Continue Learning */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Continue Learning
              </h2>
              <Link href="/courses">
                <Button
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  Browse All Courses
                </Button>
              </Link>
            </div>

            {recentCourses.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentCourses.slice(0, 6).map((enrollment) => (
                  <div key={enrollment.id} className="relative group">
                    <CourseCard
                      course={enrollment.course}
                      isFavorite={favorites.includes(enrollment.course.id)}
                      onToggleFavorite={toggleFavorite}
                      favoriteLoading={favoriteLoading === enrollment.course.id}
                    />

                    {/* Progress Overlay */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(enrollment.progress, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {Math.round(enrollment.progress)}%
                        </span>
                      </div>
                    </div>

                    {/* Continue Button Overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
                      <Link href={`/course/${enrollment.course.id}`}>
                        <Button
                          size="lg"
                          className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Continue Learning
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : dataFetched ? (
              <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
                <CardContent className="text-center py-16">
                  <Play className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">
                    Start Your Learning Journey
                  </h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    You haven't enrolled in any courses yet. Browse our
                    comprehensive catalog to discover amazing learning
                    opportunities.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Link href="/courses">
                      <Button
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <BookOpen className="w-5 h-5 mr-2" />
                        Explore Courses
                      </Button>
                    </Link>
                    <Link href="/courses?category=Programming">
                      <Button
                        variant="outline"
                        size="lg"
                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        Popular: Programming
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Loading skeleton for courses
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index} className="animate-pulse">
                    <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Schedule Learning
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Set up a consistent learning schedule
                </p>
                <Button variant="outline" size="sm">
                  Set Schedule
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <Target className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Set Goals
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Define your learning objectives
                </p>
                <Button variant="outline" size="sm">
                  Create Goals
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  View Progress
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Track your learning analytics
                </p>
                <Button variant="outline" size="sm">
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClientAuthWrapper>
  );
}
