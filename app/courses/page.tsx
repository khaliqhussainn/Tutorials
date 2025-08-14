"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Search,
  Filter,
  Star,
  TrendingUp,
  PlayCircle,
  Clock,
  BookOpen,
  Users,
  Award,
  ChevronRight,
  Heart,
  Play,
  Target,
  Zap,
  CheckCircle,
  Lock,
  Loader2,
  ChevronLeft,
  Globe,
  Bookmark,
  ArrowRight,
  Grid3X3,
  BarChart3,
  Trophy,
  GraduationCap,
  Lightbulb,
  Code,
  Palette,
  Briefcase,
  BarChart,
  Database,
  MoreHorizontal,
  Mail,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDuration, calculateProgress } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  category: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  isPublished: boolean;
  isFeatured: boolean;
  rating: number;
  price: number;
  isFree: boolean;
  createdAt: string;
  sections: {
    id: string;
    videos: {
      id: string;
      duration?: number;
    }[];
  }[];
  videos: {
    id: string;
    duration?: number;
  }[];
  _count: { enrollments: number };
}

interface UserProgress {
  courseId: string;
  progress: number;
  lastWatched: string;
  course: Course;
}

interface Enrollment {
  courseId: string;
  enrolledAt: string;
  progress: number;
}

interface FavoriteCourse {
  courseId: string;
  course: Course;
}

const categories = [
  { name: "All", icon: Grid3X3, count: 0 },
  { name: "Programming", icon: Code, count: 0 },
  { name: "Design", icon: Palette, count: 0 },
  { name: "Business", icon: Briefcase, count: 0 },
  { name: "Marketing", icon: BarChart, count: 0 },
  { name: "Data Science", icon: Database, count: 0 },
  { name: "Other", icon: MoreHorizontal, count: 0 },
];

const levels = ["All", "BEGINNER", "INTERMEDIATE", "ADVANCED"];

export default function CoursesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [continueCourses, setContinueCourses] = useState<UserProgress[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Enrollment[]>([]);
  const [favoriteCourses, setFavoriteCourses] = useState<FavoriteCourse[]>([]);
  const [coursesByCategory, setCoursesByCategory] = useState<{
    [key: string]: Course[];
  }>({});

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [sortBy, setSortBy] = useState<
    "newest" | "popular" | "trending" | "rating"
  >("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);

  useEffect(() => {
    const searchParam = searchParams.get("search");
    const categoryParam = searchParams.get("category");

    if (searchParam) setSearchTerm(searchParam);
    if (categoryParam) setSelectedCategory(categoryParam);

    fetchCourses();

    if (session) {
      fetchUserData();
    }
  }, [session, searchParams]);

  useEffect(() => {
    filterCourses();
    organizeCoursesByCategory();
  }, [courses, searchTerm, selectedCategory, selectedLevel, sortBy]);

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      if (response.ok) {
        const data = await response.json();
        setCourses(data);

        // Get featured courses
        const featured = data
          .filter((course: Course) => course.isFeatured)
          .slice(0, 8);
        setFeaturedCourses(featured);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      // Fetch enrollments
      const enrollmentsResponse = await fetch("/api/user/enrollments");
      if (enrollmentsResponse.ok) {
        const enrollmentsData = await enrollmentsResponse.json();
        setEnrolledCourses(enrollmentsData);
      }

      // Fetch progress for continue learning
      const progressResponse = await fetch("/api/user/progress");
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        setContinueCourses(
          progressData
            .filter(
              (item: UserProgress) => item.progress > 0 && item.progress < 100
            )
            .slice(0, 4)
        );
      }

      // Fetch favorites
      const favoritesResponse = await fetch("/api/user/favorites");
      if (favoritesResponse.ok) {
        const favoritesData = await favoritesResponse.json();
        setFavoriteCourses(favoritesData);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const filterCourses = () => {
    let filtered = courses;

    if (searchTerm) {
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter(
        (course) => course.category === selectedCategory
      );
    }

    if (selectedLevel !== "All") {
      filtered = filtered.filter((course) => course.level === selectedLevel);
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b._count.enrollments - a._count.enrollments;
        case "trending":
          return b._count.enrollments - a._count.enrollments;
        case "rating":
          return b.rating - a.rating;
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    setFilteredCourses(filtered);
  };

  const organizeCoursesByCategory = () => {
    const organized: { [key: string]: Course[] } = {};

    categories.forEach((category) => {
      if (category.name === "All") return;

      const categoryCourses = courses.filter(
        (course) => course.category === category.name && course.isPublished
      );

      if (categoryCourses.length > 0) {
        organized[category.name] = categoryCourses.sort(
          (a, b) => b._count.enrollments - a._count.enrollments
        );
      }
    });

    setCoursesByCategory(organized);
  };

  const toggleFavorite = async (courseId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    setFavoriteLoading(courseId);

    try {
      const isFavorited = favoriteCourses.some(
        (fav) => fav.courseId === courseId
      );
      const method = isFavorited ? "DELETE" : "POST";

      const response = await fetch("/api/user/favorites", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      if (response.ok) {
        if (isFavorited) {
          setFavoriteCourses((prev) =>
            prev.filter((fav) => fav.courseId !== courseId)
          );
        } else {
          const course = courses.find((c) => c.id === courseId);
          if (course) {
            setFavoriteCourses((prev) => [...prev, { courseId, course }]);
          }
        }
      } else {
        const errorData = await response.json();
        console.error("Error toggling favorite:", errorData);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setFavoriteLoading(null);
    }
  };

  const enrollInCourse = async (courseId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      if (response.ok) {
        setEnrolledCourses((prev) => [
          ...prev,
          { courseId, enrolledAt: new Date().toISOString(), progress: 0 },
        ]);
        router.push(`/course/${courseId}`);
      } else {
        const error = await response.json();
        if (error.error === "Already enrolled") {
          router.push(`/course/${courseId}`);
        }
      }
    } catch (error) {
      console.error("Error enrolling in course:", error);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSelectedLevel("All");
    setSortBy("newest");

    // Update URL to clear search params
    router.push("/courses", { scroll: false });
  };

  const getTotalDuration = (course: Course) => {
    const sectionDuration =
      course.sections?.reduce(
        (acc, section) =>
          acc +
          section.videos.reduce(
            (videoAcc, video) => videoAcc + (video.duration || 0),
            0
          ),
        0
      ) || 0;
    const legacyDuration =
      course.videos?.reduce((acc, video) => acc + (video.duration || 0), 0) ||
      0;
    return sectionDuration + legacyDuration;
  };

  const getTotalVideos = (course: Course) => {
    const sectionVideos =
      course.sections?.reduce(
        (acc, section) => acc + section.videos.length,
        0
      ) || 0;
    const legacyVideos = course.videos?.length || 0;
    return sectionVideos + legacyVideos;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "BEGINNER":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "INTERMEDIATE":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "ADVANCED":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const isEnrolled = (courseId: string) =>
    enrolledCourses.some((enrollment) => enrollment.courseId === courseId);
  const isFavorited = (courseId: string) =>
    favoriteCourses.some((fav) => fav.courseId === courseId);

  const CourseCard = ({
    course,
    featured = false,
    size = "normal",
  }: {
    course: Course;
    featured?: boolean;
    size?: "normal" | "large" | "small";
  }) => {
    const enrolled = isEnrolled(course.id);
    const favorited = isFavorited(course.id);
    const totalDuration = getTotalDuration(course);
    const totalVideos = getTotalVideos(course);
    const isLoadingFavorite = favoriteLoading === course.id;

    return (
      <Link href={`/course/${course.id}`}>
        <Card
          className={`group overflow-hidden hover:shadow-xl transition-all duration-500 border-0 bg-white hover:-translate-y-1 ${
            featured ? "ring-2 ring-[#001e62]/20" : ""
          } ${size === "large" ? "lg:col-span-2" : ""}`}
        >
          <div className="relative">
            {course.thumbnail ? (
              <div
                className={`relative ${
                  size === "large" ? "aspect-[16/9]" : "aspect-video"
                } overflow-hidden`}
              >
                <Image
                  src={course.thumbnail}
                  alt={course.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ) : (
              <div
                className={`${
                  size === "large" ? "aspect-[16/9]" : "aspect-video"
                } bg-gradient-to-br from-[#001e62]/10 via-[#001e62]/5 to-blue-100 flex items-center justify-center relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#001e62]/10 to-blue-500/10" />
                <PlayCircle
                  className={`${
                    size === "large" ? "w-16 h-16" : "w-12 h-12"
                  } text-[#001e62] relative z-10`}
                />
              </div>
            )}

            {/* Overlay badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(
                  course.level
                )}`}
              >
                {course.level}
              </span>
            </div>

            {featured && (
              <div className="absolute top-3 right-3">
                <div className="bg-gradient-to-r from-[#001e62] to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center shadow-lg">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  FEATURED
                </div>
              </div>
            )}

            {/* Favorite & Play buttons */}
            <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {session && (
                <button
                  onClick={(e) => toggleFavorite(course.id, e)}
                  disabled={isLoadingFavorite}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-lg disabled:opacity-50"
                >
                  {isLoadingFavorite ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  ) : (
                    <Heart
                      className={`w-4 h-4 transition-colors ${
                        favorited
                          ? "fill-red-500 text-red-500"
                          : "text-gray-600 hover:text-red-500"
                      }`}
                    />
                  )}
                </button>
              )}
              <button
                onClick={(e) => enrollInCourse(course.id, e)}
                className="p-2 bg-[#001e62] text-white rounded-full hover:bg-[#001e62]/90 transition-colors shadow-lg"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>

            {/* Enrollment status */}
            {enrolled && (
              <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center shadow-lg">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Enrolled
                </span>
              </div>
            )}
          </div>

          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#001e62]">
                {course.category}
              </span>
              <div className="flex items-center text-xs text-gray-500">
                <Users className="w-3 h-3 mr-1" />
                {course._count.enrollments}
              </div>
            </div>

            <h3
              className={`font-bold text-gray-900 mb-2 line-clamp-2 leading-tight ${
                size === "large" ? "text-xl" : "text-lg"
              }`}
            >
              {course.title}
            </h3>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {course.description}
            </p>

            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-4">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                <span className="truncate">
                  {formatDuration(totalDuration)}
                </span>
              </div>
              <div className="flex items-center">
                <BookOpen className="w-3 h-3 mr-1" />
                <span className="truncate">{totalVideos} lessons</span>
              </div>
              <div className="flex items-center">
                <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                <span>{course.rating}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {/* Removed price display */}
              </div>
              <Button
                size="sm"
                onClick={(e) => enrollInCourse(course.id, e)}
                className={`${
                  enrolled
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-[#001e62] hover:bg-[#001e62]/90"
                } text-white border-0`}
              >
                {enrolled ? (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    Continue
                  </>
                ) : (
                  <>
                    <Target className="w-3 h-3 mr-1" />
                    Enroll
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  const CategorySlider = ({
    title,
    courses,
    icon: Icon,
  }: {
    title: string;
    courses: Course[];
    icon: any;
  }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
      if (scrollRef.current) {
        const isMobile = window.innerWidth < 768;
        const scrollAmount = isMobile ? 280 : 320;
        scrollRef.current.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth",
        });
      }
    };

    if (!courses.length) return null;

    return (
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-2 bg-[#001e62]/10 rounded-lg mr-3">
              <Icon className="w-6 h-6 text-[#001e62]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                {title}
              </h2>
              <p className="text-gray-600 text-sm md:text-base">
                {courses.length} courses available
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="p-2 rounded-full bg-gray-100 hover:bg-[#001e62]/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-[#001e62]" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-2 rounded-full bg-gray-100 hover:bg-[#001e62]/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-[#001e62]" />
            </button>
          </div>
        </div>

        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {courses.map((course) => (
              <div key={course.id} className="flex-none w-64 md:w-80">
                <CourseCard course={course} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#001e62]/5 to-blue-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-[#001e62]/20 border-t-[#001e62] rounded-full animate-spin mx-auto mb-4"></div>
            <GraduationCap className="w-8 h-8 text-[#001e62] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-[#001e62] text-lg font-medium">
            Loading your learning journey...
          </p>
        </div>
      </div>
    );
  }

  // Check if we have active filters
  const hasActiveFilters =
    searchTerm || selectedCategory !== "All" || selectedLevel !== "All";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-[#001e62] text-white overflow-hidden">
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {hasActiveFilters ? (
                <>
                  {searchTerm ? (
                    <>
                      Results for "
                      <span className="text-blue-300">{searchTerm}</span>"
                    </>
                  ) : selectedCategory !== "All" ? (
                    <>
                      <span className="text-blue-300">
                        {selectedCategory}
                      </span>{" "}
                      Courses
                    </>
                  ) : (
                    <>
                      Filtered <span className="text-blue-300">Courses</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  Discover Amazing
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300">
                    Courses
                  </span>
                </>
              )}
            </h1>

            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              {hasActiveFilters ? (
                <>
                  Found {filteredCourses.length} course
                  {filteredCourses.length !== 1 ? "s" : ""} matching your
                  criteria. Start learning with expert-led content designed to
                  advance your skills.
                </>
              ) : (
                <>
                  Browse our comprehensive library of expert-led courses. From
                  beginner-friendly tutorials to advanced masterclasses, find
                  the perfect course to accelerate your learning journey.
                </>
              )}
            </p>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <span className="text-blue-200 text-sm">Active filters:</span>
                {searchTerm && (
                  <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                    Search: "{searchTerm}"
                  </span>
                )}
                {selectedCategory !== "All" && (
                  <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                    {selectedCategory}
                  </span>
                )}
                {selectedLevel !== "All" && (
                  <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                    {selectedLevel} Level
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-1 border border-white/30 text-white text-sm font-medium rounded-full hover:bg-white/20 hover:border-white/50 transition-colors"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* User Dashboard Sections - DYNAMIC */}
        {session && (
          <>
            {/* Continue Learning Section */}
            {continueCourses.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-xl mr-4">
                      <PlayCircle className="w-7 h-7 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">
                        Continue Learning
                      </h2>
                      <p className="text-gray-600">
                        Pick up where you left off
                      </p>
                    </div>
                  </div>
                  <Link href="/dashboard">
                    <Button variant="outline" className="hidden md:flex border-[#001e62] text-[#001e62] hover:bg-[#001e62]/5">
                      View Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {continueCourses.map((userProgress) => (
                    <Card
                      key={userProgress.courseId}
                      className="group hover:shadow-xl transition-all duration-300 border-0 hover:-translate-y-1"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-[#001e62] mb-1 block">
                              {userProgress.course.category}
                            </span>
                            <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
                              {userProgress.course.title}
                            </h3>
                            <div className="flex items-center text-xs text-gray-500 mb-4">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDuration(
                                getTotalDuration(userProgress.course)
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mb-6">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${userProgress.progress}%` }}
                            />
                          </div>
                        </div>

                        <Link href={`/course/${userProgress.courseId}`}>
                          <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                            <Play className="w-4 h-4 mr-2" />
                            Continue Learning
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* My Favorites Section */}
            {favoriteCourses.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center">
                    <div className="p-3 bg-red-100 rounded-xl mr-4">
                      <Heart className="w-7 h-7 text-red-500 fill-current" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                        My Favorites
                      </h2>
                      <p className="text-gray-600">
                        Courses you've saved for later
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {favoriteCourses.slice(0, 4).map((favorite) => (
                    <CourseCard
                      key={favorite.courseId}
                      course={favorite.course}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Filters Section */}
        <section className="mb-8">
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Find Your Perfect Course
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 border-[#001e62] text-[#001e62] hover:bg-[#001e62]/5"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {showFilters ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div
                className={`${
                  showFilters ? "block" : "hidden"
                } space-y-6 transition-all duration-300`}
              >
                {/* Category Filter */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Categories
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {categories.map((category) => (
                      <Button
                        key={category.name}
                        variant={
                          selectedCategory === category.name
                            ? "primary"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setSelectedCategory(category.name)}
                        className={`transition-all ${
                          selectedCategory === category.name
                            ? "bg-[#001e62] hover:bg-[#001e62]/90 text-white border-[#001e62]"
                            : "hover:bg-[#001e62]/5 hover:border-[#001e62]/30 text-[#001e62] border-[#001e62]/20"
                        }`}
                      >
                        <category.icon className="w-4 h-4 mr-2" />
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Level and Sort */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Difficulty Level
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {levels.map((level) => (
                        <Button
                          key={level}
                          variant={
                            selectedLevel === level ? "primary" : "outline"
                          }
                          size="sm"
                          onClick={() => setSelectedLevel(level)}
                          className={`transition-all ${
                            selectedLevel === level
                              ? "bg-[#001e62] hover:bg-[#001e62]/90 text-white border-[#001e62]"
                              : "hover:bg-[#001e62]/5 hover:border-[#001e62]/30 text-[#001e62] border-[#001e62]/20"
                          }`}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Sort By
                    </h4>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full rounded-lg border border-[#001e62]/20 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#001e62] focus:border-transparent text-[#001e62]"
                    >
                      <option value="newest">Newest First</option>
                      <option value="popular">Most Popular</option>
                      <option value="rating">Highest Rated</option>
                      <option value="trending">Trending</option>
                    </select>
                  </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Filter className="w-4 h-4" />
                      <span>Active filters: </span>
                      {searchTerm && (
                        <span className="bg-[#001e62]/10 text-[#001e62] px-2 py-1 rounded text-xs">
                          Search: "{searchTerm}"
                        </span>
                      )}
                      {selectedCategory !== "All" && (
                        <span className="bg-[#001e62]/10 text-[#001e62] px-2 py-1 rounded text-xs">
                          {selectedCategory}
                        </span>
                      )}
                      {selectedLevel !== "All" && (
                        <span className="bg-[#001e62]/10 text-[#001e62] px-2 py-1 rounded text-xs">
                          {selectedLevel}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear All
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Content Based on Available Courses */}
        {courses.length === 0 ? (
          /* No Courses Available State */
          <section className="mb-12">
            <Card className="border-0 shadow-lg">
              <CardContent className="text-center py-20">
                <div className="w-32 h-32 bg-gradient-to-br from-[#001e62]/10 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-8">
                  <BookOpen className="w-16 h-16 text-[#001e62]" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  No Courses Available Yet
                </h3>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto text-lg">
                  We're working hard to bring you amazing courses. Our expert
                  instructors are creating comprehensive learning experiences
                  that will help you master new skills and advance your career.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                  <Button size="lg" className="bg-[#001e62] hover:bg-[#001e62]/90">
                    <Mail className="w-5 h-5 mr-2" />
                    Get Notified When Ready
                  </Button>
                  {session?.user?.role === "ADMIN" && (
                    <Link href="/admin/courses/new">
                      <Button size="lg" variant="outline" className="border-[#001e62] text-[#001e62] hover:bg-[#001e62]/5">
                        <BookOpen className="w-5 h-5 mr-2" />
                        Create First Course
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        ) : (
          <>
            {/* Show Category Sliders only when no active filters */}
            {!hasActiveFilters &&
              Object.entries(coursesByCategory).map(
                ([categoryName, categoryCourses]) => {
                  const categoryInfo = categories.find(
                    (cat) => cat.name === categoryName
                  );
                  return categoryInfo ? (
                    <CategorySlider
                      key={categoryName}
                      title={categoryName}
                      courses={categoryCourses}
                      icon={categoryInfo.icon}
                    />
                  ) : null;
                }
              )}

            {/* Featured Courses Section - Show before All Courses when no active filters */}
            {!hasActiveFilters && featuredCourses.length > 0 && (
              <section className="mb-16">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-100 rounded-xl mr-4">
                      <Star className="w-7 h-7 text-yellow-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                        Featured Courses
                      </h2>
                      <p className="text-gray-600">
                        Hand-picked by our experts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Trending This Week
                  </div>
                </div>

                {/* Hero Featured Course */}
                {featuredCourses[0] && (
                  <div className="bg-gradient-to-r from-[#001e62]/5 via-blue-50 to-[#001e62]/5 rounded-3xl p-8 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#001e62]/20 to-blue-300/50 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>

                    <div className="grid lg:grid-cols-2 gap-8 items-center relative">
                      <div>
                        <div className="inline-flex items-center bg-gradient-to-r from-[#001e62] to-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-6 shadow-lg">
                          <Trophy className="w-4 h-4 mr-2" />
                          #1 Most Popular Course
                        </div>
                        <h3 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                          {featuredCourses[0].title}
                        </h3>
                        <p className="text-gray-700 mb-6 text-lg leading-relaxed">
                          {featuredCourses[0].description}
                        </p>
                        <div className="grid grid-cols-3 gap-4 mb-8">
                          <div className="text-center">
                            <div className="text-xl md:text-2xl font-bold text-[#001e62]">
                              {formatDuration(
                                getTotalDuration(featuredCourses[0])
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              Total Duration
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl md:text-2xl font-bold text-[#001e62]">
                              {getTotalVideos(featuredCourses[0])}
                            </div>
                            <div className="text-sm text-gray-600">Lessons</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl md:text-2xl font-bold text-[#001e62]">
                              {featuredCourses[0]._count.enrollments}+
                            </div>
                            <div className="text-sm text-gray-600">
                              Students
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <Button
                            size="lg"
                            onClick={(e) => enrollInCourse(featuredCourses[0].id, e)}
                            className="bg-gradient-to-r from-[#001e62] to-blue-600 hover:from-[#001e62]/90 hover:to-blue-700 text-white font-bold px-8"
                          >
                            <Zap className="w-5 h-5 mr-2" />
                            {isEnrolled(featuredCourses[0].id)
                              ? "Continue Learning"
                              : "Start Learning Now"}
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={(e) => toggleFavorite(featuredCourses[0].id, e)}
                            className="border-[#001e62] text-[#001e62] hover:bg-[#001e62]/5"
                          >
                            <Heart
                              className={`w-5 h-5 mr-2 ${
                                isFavorited(featuredCourses[0].id)
                                  ? "fill-red-500 text-red-500"
                                  : "text-[#001e62]"
                              }`}
                            />
                            Save for Later
                          </Button>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="aspect-video bg-gradient-to-br from-[#001e62]/10 to-blue-200 rounded-2xl overflow-hidden shadow-2xl">
                          {featuredCourses[0].thumbnail ? (
                            <Image
                              src={featuredCourses[0].thumbnail}
                              alt={featuredCourses[0].title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <PlayCircle className="w-24 h-24 text-[#001e62]" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Featured Courses */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {featuredCourses.slice(1, 9).map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      featured={true}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All Courses Section - Always show, but change title based on filters */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {hasActiveFilters ? "Search Results" : "All Courses"}
                  </h2>
                  <p className="text-gray-600">
                    Showing {filteredCourses.length} of {courses.length} courses
                    {searchTerm && ` for "${searchTerm}"`}
                    {selectedCategory !== "All" && ` in ${selectedCategory}`}
                    {selectedLevel !== "All" && ` (${selectedLevel} level)`}
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </div>

              {filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredCourses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              ) : (
                <Card className="border-0 shadow-lg">
                  <CardContent className="text-center py-16">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      No courses found
                    </h3>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                      {searchTerm
                        ? `We couldn't find any courses matching "${searchTerm}". Try adjusting your search or filters.`
                        : "No courses match your current filters. Try expanding your search criteria."}
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button variant="outline" onClick={clearFilters} className="border-[#001e62] text-[#001e62] hover:bg-[#001e62]/5">
                        Clear All Filters
                      </Button>
                      <Button onClick={() => setSearchTerm("JavaScript")} className="bg-[#001e62] hover:bg-[#001e62]/90">
                        Try "JavaScript"
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>
          </>
        )}

        {/* CTA Section */}
        <section className="mt-20">
          <div className="bg-gradient-to-r from-[#001e62] via-[#001e62] to-blue-700 rounded-3xl p-8 md:p-16 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform -translate-x-32 -translate-y-32"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-32 translate-y-32"></div>

            <div className="relative">
           

              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Ready to Transform Your
                <span className="block text-blue-300">Career?</span>
              </h2>

              <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
                Join over 50,000 successful students who have advanced their
                careers with our comprehensive learning platform. Start with any
                course and see immediate results.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-md mx-auto">
                {!session ? (
                  <>
                    <Link href="/auth/signup" className="flex-1">
                      <Button
                        size="lg"
                        variant="secondary"
                        className="w-full font-bold bg-white text-[#001e62] hover:bg-gray-100"
                      >
                        <GraduationCap className="w-5 h-5 mr-2" />
                        Start Learning Free
                      </Button>
                    </Link>
                    <Link href="/auth/signin" className="flex-1">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full border-white text-white hover:bg-white hover:text-[#001e62] font-bold"
                      >
                        Sign In
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link href="/dashboard">
                    <Button size="lg" variant="secondary" className="font-bold bg-white text-[#001e62] hover:bg-gray-100">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      View My Progress
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}