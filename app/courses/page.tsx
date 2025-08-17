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
  AlertCircle,
  Brain,
  Microscope,
  Calculator,
  PenTool,
  MessageCircle,
  Monitor,
  Settings,
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

const searchableCategories = [
  {
    name: "Business",
    searchTerms: [
      "business",
      "management",
      "entrepreneurship",
      "finance",
      "accounting",
      "excel",
      "project management",
      "power bi",
    ],
  },
  {
    name: "Data Science",
    searchTerms: [
      "data",
      "analytics",
      "statistics",
      "python",
      "r",
      "machine learning",
      "ai",
      "sql",
      "data analysis",
      "data visualization",
    ],
  },
  {
    name: "Programming",
    searchTerms: [
      "programming",
      "coding",
      "development",
      "software",
      "javascript",
      "react",
      "node",
      "html",
      "css",
      "web development",
      "mobile development",
      "artificial intelligence",
    ],
  },
  {
    name: "Design",
    searchTerms: [
      "design",
      "ui",
      "ux",
      "graphics",
      "photoshop",
      "figma",
      "adobe",
      "arts",
      "humanities",
    ],
  },
  {
    name: "Marketing",
    searchTerms: [
      "marketing",
      "digital marketing",
      "social media",
      "seo",
      "advertising",
    ],
  },
  {
    name: "Other",
    searchTerms: [
      "language",
      "personal development",
      "science",
      "engineering",
      "physics",
      "chemistry",
      "life sciences",
      "social sciences",
    ],
  },
];

const skillMappings = [
  { skill: "Python", category: "Programming", searchUrl: "/courses?search=Python" },
  { skill: "JavaScript", category: "Programming", searchUrl: "/courses?search=JavaScript" },
  { skill: "React", category: "Programming", searchUrl: "/courses?search=React" },
  { skill: "Node.js", category: "Programming", searchUrl: "/courses?search=Node.js" },
  { skill: "HTML", category: "Programming", searchUrl: "/courses?search=HTML" },
  { skill: "CSS", category: "Programming", searchUrl: "/courses?search=CSS" },
  {
    skill: "Web Development",
    category: "Programming",
    searchUrl: "/courses?search=Web Development",
  },
  {
    skill: "Mobile Development",
    category: "Programming",
    searchUrl: "/courses?search=Mobile Development",
  },
  {
    skill: "Machine Learning",
    category: "Data Science",
    searchUrl: "/courses?search=Machine Learning",
  },
  {
    skill: "Data Analysis",
    category: "Data Science",
    searchUrl: "/courses?search=Data Analysis",
  },
  {
    skill: "Data Visualization",
    category: "Data Science",
    searchUrl: "/courses?search=Data Visualization",
  },
  { skill: "SQL", category: "Data Science", searchUrl: "/courses?search=SQL" },
  { skill: "Excel", category: "Business", searchUrl: "/courses?search=Excel" },
  {
    skill: "Project Management",
    category: "Business",
    searchUrl: "/courses?search=Project Management",
  },
  {
    skill: "Business Analysis",
    category: "Business",
    searchUrl: "/courses?search=Business Analysis",
  },
  { skill: "Power BI", category: "Business", searchUrl: "/courses?search=Power BI" },
  { skill: "Marketing", category: "Marketing", searchUrl: "/courses?search=Marketing" },
  { skill: "AI", category: "Programming", searchUrl: "/courses?search=AI" },
  {
    skill: "Artificial Intelligence",
    category: "Programming",
    searchUrl: "/courses?search=AI",
  },
];

const categoryMappings = {
  "Information Technology": "Programming",
  "Computer Science": "Programming",
  "Life Sciences": "Other",
  "Physical Science and Engineering": "Other",
  "Personal Development": "Other",
  "Social Sciences": "Other",
  "Language Learning": "Other",
  "Arts and Humanities": "Design",
};

function getCategoryFromSearchTerm(searchTerm: string): string {
  const lowercaseSearch = searchTerm.toLowerCase();

  for (const category of searchableCategories) {
    if (category.searchTerms.some((term) => lowercaseSearch.includes(term))) {
      return category.name;
    }
  }

  return "All";
}

function getSkillMapping(skillName: string) {
  return skillMappings.find(
    (mapping) => mapping.skill.toLowerCase() === skillName.toLowerCase()
  );
}

function mapCategoryToDisplay(dbCategory: string): string {
  return categoryMappings[dbCategory] || dbCategory;
}

export default function CoursesPage() {
  const { data: session, status } = useSession();
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
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "trending" | "rating">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const searchParam = searchParams?.get("search");
    const categoryParam = searchParams?.get("category");
    if (searchParam) {
      setSearchTerm(searchParam);
      if (!categoryParam) {
        const detectedCategory = getCategoryFromSearchTerm(searchParam);
        if (detectedCategory !== "All") {
          setSelectedCategory(detectedCategory);
        }
      }
    }

    if (categoryParam) {
      const mappedCategory =
        categories.find(
          (cat) => cat.name.toLowerCase() === categoryParam.toLowerCase()
        )?.name || categoryParam;
      setSelectedCategory(mappedCategory);
    }
    fetchCourses();
    if (status === "authenticated") {
      fetchUserData();
    }
  }, [status, searchParams]);

  useEffect(() => {
    filterCourses();
    organizeCoursesByCategory();
  }, [courses, searchTerm, selectedCategory, selectedLevel, sortBy]);

  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      if (response.ok) {
        const data = await response.json();
        setCourses(data || []);
        const featured = (data || [])
          .filter((course: Course) => course.isFeatured)
          .slice(0, 8);
        setFeaturedCourses(featured);
      } else {
        setError("Failed to load courses. Please refresh the page.");
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourses([]);
      setFeaturedCourses([]);
      setError("Network error while loading courses. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    if (status !== "authenticated") return;
    try {
      const enrollmentsResponse = await fetch("/api/user/enrollments");
      if (enrollmentsResponse.ok) {
        const enrollmentsData = await enrollmentsResponse.json();
        setEnrolledCourses(enrollmentsData || []);
      }
      const progressResponse = await fetch("/api/user/progress");
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        setContinueCourses(
          (progressData || [])
            .filter((item: UserProgress) => item.progress > 0 && item.progress < 100)
            .slice(0, 4)
        );
      }
      const favoritesResponse = await fetch("/api/user/favorites");
      if (favoritesResponse.ok) {
        const favoritesData = await favoritesResponse.json();
        setFavoriteCourses(favoritesData || []);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setEnrolledCourses([]);
      setContinueCourses([]);
      setFavoriteCourses([]);
    }
  };

  const filterCourses = () => {
    let filtered = [...courses];
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(searchLower) ||
          course.description.toLowerCase().includes(searchLower) ||
          course.category.toLowerCase().includes(searchLower) ||
          skillMappings.some(
            (mapping) =>
              mapping.skill.toLowerCase().includes(searchLower) &&
              mapCategoryToDisplay(course.category) === mapping.category
          )
      );
    }
    if (selectedCategory !== "All") {
      filtered = filtered.filter((course) => {
        const mappedCategory = mapCategoryToDisplay(course.category);
        return mappedCategory === selectedCategory;
      });
    }
    if (selectedLevel !== "All") {
      filtered = filtered.filter((course) => course.level === selectedLevel);
    }
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return (b._count?.enrollments || 0) - (a._count?.enrollments || 0);
        case "trending":
          return (b._count?.enrollments || 0) - (a._count?.enrollments || 0);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    setFilteredCourses(filtered);
  };

  const organizeCoursesByCategory = () => {
    const organized: { [key: string]: Course[] } = {};
    categories.forEach((category) => {
      if (category.name === "All") return;
      let categoryCourses = courses.filter((course) => course.isPublished);

      categoryCourses = categoryCourses.filter((course) => {
        const mappedCategory = mapCategoryToDisplay(course.category);
        return mappedCategory === category.name;
      });
      if (categoryCourses.length > 0) {
        organized[category.name] = categoryCourses.sort(
          (a, b) => (b._count?.enrollments || 0) - (a._count?.enrollments || 0)
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
    if (status !== "authenticated") {
      router.push("/auth/signin");
      return;
    }
    setFavoriteLoading(courseId);
    try {
      const isFavorited = favoriteCourses.some((fav) => fav.courseId === courseId);
      const method = isFavorited ? "DELETE" : "POST";
      const response = await fetch("/api/user/favorites", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      if (response.ok) {
        if (isFavorited) {
          setFavoriteCourses((prev) => prev.filter((fav) => fav.courseId !== courseId));
          setSuccessMessage("Course removed from favorites");
        } else {
          const course = courses.find((c) => c.id === courseId);
          if (course) {
            setFavoriteCourses((prev) => [...prev, { courseId, course }]);
            setSuccessMessage("Course added to favorites");
          }
        }
      } else {
        const errorData = await response.json();
        console.error("Error toggling favorite:", errorData);
        setError("Failed to update favorites. Please try again.");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setError("Network error. Please check your connection.");
    } finally {
      setFavoriteLoading(null);
    }
  };

  const enrollInCourse = async (courseId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setError(null);
    setSuccessMessage(null);
    if (status !== "authenticated" || !session) {
      router.push("/auth/signin");
      return;
    }
    setEnrollingCourseId(courseId);
    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId }),
      });
      const data = await response.json();
      if (response.ok) {
        setEnrolledCourses((prev) => {
          const filtered = prev.filter((e) => e.courseId !== courseId);
          return [
            ...filtered,
            {
              courseId,
              enrolledAt: new Date().toISOString(),
              progress: 0,
            },
          ];
        });
        if (data.code === "ALREADY_ENROLLED") {
          setSuccessMessage("You're already enrolled! Redirecting to course...");
        } else if (data.code === "ENROLLMENT_SUCCESS") {
          setSuccessMessage("Successfully enrolled in course! Starting your journey...");
        }
        const redirectPath = data.redirect || `/course/${courseId}`;

        setTimeout(() => {
          router.push(redirectPath);
        }, 1500);
      } else {
        switch (data.code) {
          case "AUTH_REQUIRED":
            setError("Please sign in to enroll in courses");
            setTimeout(() => router.push("/auth/signin"), 2000);
            break;

          case "COURSE_NOT_FOUND":
            setError("This course could not be found. Please try refreshing the page.");
            break;

          case "COURSE_NOT_PUBLISHED":
            setError("This course is not currently available for enrollment.");
            break;

          case "USER_NOT_FOUND":
            setError("There was an issue with your account. Please try signing out and back in.");
            break;

          default:
            setError(data.details || data.error || "Failed to enroll in course. Please try again.");
        }
      }
    } catch (error) {
      console.error("Network error during enrollment:", error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSelectedLevel("All");
    setSortBy("newest");
    router.push("/courses", { scroll: false });
  };

  const handleSkillSearch = (skillName: string) => {
    const skillMapping = getSkillMapping(skillName);
    if (skillMapping) {
      router.push(skillMapping.searchUrl);
    } else {
      router.push(`/courses?search=${encodeURIComponent(skillName)}`);
    }
  };

  const getTotalDuration = (course: Course) => {
    const sectionDuration =
      course.sections?.reduce(
        (acc, section) =>
          acc +
          section.videos.reduce((videoAcc, video) => videoAcc + (video.duration || 0), 0),
        0
      ) || 0;
    const legacyDuration = course.videos?.reduce((acc, video) => acc + (video.duration || 0), 0) || 0;
    return sectionDuration + legacyDuration;
  };

  const getTotalVideos = (course: Course) => {
    const sectionVideos =
      course.sections?.reduce((acc, section) => acc + section.videos.length, 0) || 0;
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
    const isLoadingEnrollment = enrollingCourseId === course.id;
    return (
      <Link href={`/course/${course.id}`}>
        <Card
          className={`group overflow-hidden hover:shadow-xl transition-all duration-500 border-0 bg-white hover:-translate-y-1 ${
            featured ? "ring-2 ring-[#001e62]/20" : ""
          } ${size === "large" ? "lg:col-span-2" : ""} ${
            isLoadingEnrollment ? "opacity-75" : ""
          }`}
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
            <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {status === "authenticated" && (
                <button
                  type="button"
                  onClick={(e) => toggleFavorite(course.id, e)}
                  disabled={isLoadingFavorite}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-lg disabled:opacity-50"
                  aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
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
                type="button"
                onClick={(e) => enrollInCourse(course.id, e)}
                disabled={isLoadingEnrollment}
                className="p-2 bg-[#001e62] text-white rounded-full hover:bg-[#001e62]/90 transition-colors shadow-lg disabled:opacity-50"
                aria-label={enrolled ? "Continue course" : "Enroll in course"}
              >
                {isLoadingEnrollment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
              </button>
            </div>
            {enrolled && (
              <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center shadow-lg">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Enrolled
                </span>
              </div>
            )}
            {isLoadingEnrollment && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="bg-white rounded-lg p-3 shadow-lg">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#001e62]" />
                    <span className="text-sm font-medium text-gray-700">Enrolling...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#001e62]">
                {mapCategoryToDisplay(course.category)}
              </span>
              <div className="flex items-center text-xs text-gray-500">
                <Users className="w-3 h-3 mr-1" />
                {course._count?.enrollments || 0}
              </div>
            </div>
            <h3
              className={`font-bold text-gray-900 mb-2 line-clamp-2 leading-tight ${
                size === "large" ? "text-xl" : "text-lg"
              }`}
            >
              {course.title}
            </h3>
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-4">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                <span className="truncate">{formatDuration(totalDuration)}</span>
              </div>
              <div className="flex items-center">
                <BookOpen className="w-3 h-3 mr-1" />
                <span className="truncate">{totalVideos} lessons</span>
              </div>
              <div className="flex items-center">
                <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                <span>{course.rating || 4.8}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center"></div>
              <Button
                size="sm"
                onClick={(e) => enrollInCourse(course.id, e)}
                disabled={isLoadingEnrollment}
                className={`${
                  enrolled
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-[#001e62] hover:bg-[#001e62]/90"
                } text-white border-0 disabled:opacity-50`}
              >
                {isLoadingEnrollment ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Enrolling...
                  </>
                ) : enrolled ? (
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
    Icon,
  }: {
    title: string;
    courses: Course[];
    Icon: React.ComponentType<{ className?: string }>;
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
              {Icon && <Icon className="w-6 h-6 text-[#001e62]" />}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
              <p className="text-gray-600 text-sm md:text-base">
                {courses.length} courses available
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll("left")}
              className="p-2 rounded-full bg-gray-100 hover:bg-[#001e62]/10 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-[#001e62]" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="p-2 rounded-full bg-gray-100 hover:bg-[#001e62]/10 transition-colors"
              aria-label="Scroll right"
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

  const hasActiveFilters = searchTerm || selectedCategory !== "All" || selectedLevel !== "All";

  return (
    <div className="min-h-screen bg-gray-50">
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
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                  aria-label="Close error message"
                >
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
                <button
                  type="button"
                  onClick={() => setSuccessMessage(null)}
                  className="ml-auto text-green-400 hover:text-green-600"
                  aria-label="Close success message"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="relative bg-[#001e62] text-white overflow-hidden">
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
                      <span className="text-blue-300">{selectedCategory}</span> Courses
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
                  {filteredCourses.length !== 1 ? "s" : ""} matching your criteria. Start learning
                  with expert-led content designed to advance your skills.
                </>
              ) : (
                <>
                  Browse our comprehensive library of expert-led courses. From beginner-friendly
                  tutorials to advanced masterclasses, find the perfect course to accelerate your
                  learning journey.
                </>
              )}
            </p>
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
        {status === "authenticated" && (
          <>
            {continueCourses.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-xl mr-4">
                      <PlayCircle className="w-7 h-7 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Continue Learning</h2>
                      <p className="text-gray-600">Pick up where you left off</p>
                    </div>
                  </div>
                  <Link href="/dashboard">
                    <Button
                      variant="outline"
                      className="hidden md:flex border-[#001e62] text-[#001e62] hover:bg-[#001e62]/5"
                    >
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
                              {mapCategoryToDisplay(userProgress.course.category)}
                            </span>
                            <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
                              {userProgress.course.title}
                            </h3>
                            <div className="flex items-center text-xs text-gray-500 mb-4">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDuration(getTotalDuration(userProgress.course))}
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
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{userProgress.progress}% complete</span>
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
            {favoriteCourses.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center">
                    <div className="p-3 bg-red-100 rounded-xl mr-4">
                      <Heart className="w-7 h-7 text-red-500 fill-current" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">My Favorites</h2>
                      <p className="text-gray-600">Courses you've saved for later</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {favoriteCourses.slice(0, 4).map((favorite) => (
                    <CourseCard key={favorite.courseId} course={favorite.course} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        <section className="mb-8">
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="Search courses by title, description, or category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-12 text-lg border-[#001e62]/20 focus:border-[#001e62] focus:ring-[#001e62]"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 border-[#001e62] text-[#001e62] hover:bg-[#001e62]/5 h-12"
                >
                  <Filter className="w-5 h-5" />
                  Filters
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
              <div
                className={`${
                  showFilters ? "block" : "hidden"
                } mt-6 space-y-6 transition-all duration-300 border-t border-gray-200 pt-6`}
              >
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Categories</h4>
                  <div className="flex flex-wrap gap-3">
                    {categories.map((category) => (
                      <Button
                        key={category.name}
                        variant={selectedCategory === category.name ? "primary" : "outline"}
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
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Difficulty Level</h4>
                    <div className="flex flex-wrap gap-2">
                      {levels.map((level) => (
                        <Button
                          key={level}
                          variant={selectedLevel === level ? "primary" : "outline"}
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
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Sort By</h4>
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
        {courses.length === 0 ? (
          <section className="mb-12">
            <Card className="border-0 shadow-lg">
              <CardContent className="text-center py-20">
                <div className="w-32 h-32 bg-gradient-to-br from-[#001e62]/10 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-8">
                  <BookOpen className="w-16 h-16 text-[#001e62]" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">No Courses Available Yet</h3>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto text-lg">
                  We're working hard to bring you amazing courses. Our expert instructors are creating
                  comprehensive learning experiences that will help you master new skills and advance
                  your career.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                  <Button size="lg" className="bg-[#001e62] hover:bg-[#001e62]/90">
                    <Mail className="w-5 h-5 mr-2" />
                    Get Notified When Ready
                  </Button>
                  {session?.user?.role === "ADMIN" && (
                    <Link href="/admin/courses/new">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-[#001e62] text-[#001e62] hover:bg-[#001e62]/5"
                      >
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
            {!hasActiveFilters &&
              Object.entries(coursesByCategory).map(([categoryName, categoryCourses]) => {
                const categoryInfo = categories.find((cat) => cat.name === categoryName);
                return categoryInfo ? (
                  <CategorySlider
                    key={categoryName}
                    title={categoryName}
                    courses={categoryCourses}
                    Icon={categoryInfo.icon}
                  />
                ) : null;
              })}
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
                      <p className="text-gray-600">Hand-picked by our experts</p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Trending This Week
                  </div>
                </div>
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
                              {formatDuration(getTotalDuration(featuredCourses[0]))}
                            </div>
                            <div className="text-sm text-gray-600">Total Duration</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl md:text-2xl font-bold text-[#001e62]">
                              {getTotalVideos(featuredCourses[0])}
                            </div>
                            <div className="text-sm text-gray-600">Lessons</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl md:text-2xl font-bold text-[#001e62]">
                              {featuredCourses[0]._count?.enrollments || 0}+
                            </div>
                            <div className="text-sm text-gray-600">Students</div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <Button
                            size="lg"
                            onClick={(e) => enrollInCourse(featuredCourses[0].id, e)}
                            disabled={enrollingCourseId === featuredCourses[0].id}
                            className="bg-gradient-to-r from-[#001e62] to-blue-600 hover:from-[#001e62]/90 hover:to-blue-700 text-white font-bold px-8 disabled:opacity-50"
                          >
                            {enrollingCourseId === featuredCourses[0].id ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Enrolling...
                              </>
                            ) : (
                              <>
                                <Zap className="w-5 h-5 mr-2" />
                                {isEnrolled(featuredCourses[0].id)
                                  ? "Continue Learning"
                                  : "Start Learning Now"}
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={(e) => toggleFavorite(featuredCourses[0].id, e)}
                            disabled={favoriteLoading === featuredCourses[0].id}
                            className="border-[#001e62] text-[#001e62] hover:bg-[#001e62]/5 disabled:opacity-50"
                          >
                            {favoriteLoading === featuredCourses[0].id ? (
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                              <Heart
                                className={`w-5 h-5 mr-2 ${
                                  isFavorited(featuredCourses[0].id)
                                    ? "fill-red-500 text-red-500"
                                    : "text-[#001e62]"
                                }`}
                              />
                            )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {featuredCourses.slice(1, 9).map((course) => (
                    <CourseCard key={course.id} course={course} featured={true} />
                  ))}
                </div>
              </section>
            )}
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
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">No courses found</h3>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                      {searchTerm
                        ? `We couldn't find any courses matching "${searchTerm}". Try adjusting your search or filters.`
                        : "No courses match your current filters. Try expanding your search criteria."}
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="border-[#001e62] text-[#001e62] hover:bg-[#001e62]/5"
                      >
                        Clear All Filters
                      </Button>
                      <Button
                        onClick={() => setSearchTerm("JavaScript")}
                        className="bg-[#001e62] hover:bg-[#001e62]/90"
                      >
                        Try "JavaScript"
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>
          </>
        )}
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
                Join over 50,000 successful students who have advanced their careers with our
                comprehensive learning platform. Start with any course and see immediate results.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-md mx-auto">
                {status !== "authenticated" ? (
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
                    <Button
                      size="lg"
                      variant="secondary"
                      className="font-bold bg-white text-[#001e62] hover:bg-gray-100"
                    >
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
