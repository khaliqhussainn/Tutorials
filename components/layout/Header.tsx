"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Search,
  Bell,
  BookOpen,
  GraduationCap,
  ChevronDown,
  Code,
  Palette,
  Briefcase,
  BarChart,
  Database,
  MoreHorizontal,
  TrendingUp,
  Award,
  Monitor,
  Heart,
  Brain,
  Globe,
  Microscope,
  Users,
  MessageCircle,
  PenTool,
  Calculator,
  ChevronRight,
} from "lucide-react";

const exploreData = {
  roles: [
    { name: "Data Analyst", href: "/careers/data-analyst", icon: BarChart },
    { name: "Project Manager", href: "/careers/project-manager", icon: Users },
    {
      name: "Cyber Security Analyst",
      href: "/careers/cybersecurity",
      icon: Settings,
    },
    { name: "Data Scientist", href: "/careers/data-scientist", icon: Database },
    {
      name: "Business Intelligence Analyst",
      href: "/careers/business-intelligence",
      icon: TrendingUp,
    },
    {
      name: "Digital Marketing Specialist",
      href: "/careers/digital-marketing",
      icon: BarChart,
    },
    {
      name: "UI / UX Designer",
      href: "/careers/ui-ux-designer",
      icon: Palette,
    },
    {
      name: "Machine Learning Engineer",
      href: "/careers/ml-engineer",
      icon: Brain,
    },
    {
      name: "Social Media Specialist",
      href: "/careers/social-media",
      icon: MessageCircle,
    },
    {
      name: "Computer Support Specialist",
      href: "/careers/computer-support",
      icon: Monitor,
    },
  ],
  categories: [
    { name: "Business", href: "/courses?category=Business", icon: Briefcase },
    {
      name: "Data Science",
      href: "/courses?category=Data Science",
      icon: Database,
    },
    {
      name: "Information Technology",
      href: "/courses?category=Programming",
      icon: Code,
    },
    {
      name: "Computer Science",
      href: "/courses?category=Programming",
      icon: Monitor,
    },
    {
      name: "Life Sciences",
      href: "/courses?category=Other",
      icon: Microscope,
    },
    {
      name: "Physical Science and Engineering",
      href: "/courses?category=Other",
      icon: Calculator,
    },
    {
      name: "Personal Development",
      href: "/courses?category=Other",
      icon: TrendingUp,
    },
    { name: "Social Sciences", href: "/courses?category=Other", icon: Users },
    { name: "Language Learning", href: "/courses?category=Other", icon: Globe },
    {
      name: "Arts and Humanities",
      href: "/courses?category=Design",
      icon: PenTool,
    },
  ],
  certificates: [
    { name: "Business", href: "/certificates/business" },
    { name: "Computer Science", href: "/certificates/computer-science" },
    { name: "Data Science", href: "/certificates/data-science" },
    {
      name: "Information Technology",
      href: "/certificates/information-technology",
    },
  ],
  degrees: [
    { name: "Bachelor's Degrees", href: "/degrees/bachelors" },
    { name: "Master's Degrees", href: "/degrees/masters" },
    { name: "Postgraduate Programs", href: "/degrees/postgraduate" },
  ],
  trendingSkills: [
    { name: "Python", href: "/courses?search=Python", category: "Programming" },
    {
      name: "Artificial Intelligence",
      href: "/courses?search=AI",
      category: "Programming",
    },
    { name: "Excel", href: "/courses?search=Excel", category: "Business" },
    {
      name: "Machine Learning",
      href: "/courses?search=Machine Learning",
      category: "Data Science",
    },
    { name: "SQL", href: "/courses?search=SQL", category: "Data Science" },
    {
      name: "Project Management",
      href: "/courses?search=Project Management",
      category: "Business",
    },
    {
      name: "Power BI",
      href: "/courses?search=Power BI",
      category: "Business",
    },
    {
      name: "Marketing",
      href: "/courses?search=Marketing",
      category: "Marketing",
    },
    {
      name: "JavaScript",
      href: "/courses?search=JavaScript",
      category: "Programming",
    },
    { name: "React", href: "/courses?search=React", category: "Programming" },
    {
      name: "Node.js",
      href: "/courses?search=Node.js",
      category: "Programming",
    },
    { name: "HTML", href: "/courses?search=HTML", category: "Programming" },
    { name: "CSS", href: "/courses?search=CSS", category: "Programming" },
    {
      name: "Web Development",
      href: "/courses?search=Web Development",
      category: "Programming",
    },
    {
      name: "Mobile Development",
      href: "/courses?search=Mobile Development",
      category: "Programming",
    },
    {
      name: "Data Analysis",
      href: "/courses?search=Data Analysis",
      category: "Data Science",
    },
    {
      name: "Data Visualization",
      href: "/courses?search=Data Visualization",
      category: "Data Science",
    },
    {
      name: "Business Analysis",
      href: "/courses?search=Business Analysis",
      category: "Business",
    },
  ],
};

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isMobileExploreExpanded, setIsMobileExploreExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<
    Array<{
      name: string;
      href: string;
      category: string;
      type: "category" | "skill";
    }>
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchableItems = [
    ...exploreData.categories.map((cat) => ({
      name: cat.name,
      href: cat.href,
      category: cat.name,
      type: "category" as const,
    })),
    ...exploreData.trendingSkills.map((skill) => ({
      name: skill.name,
      href: skill.href,
      category: skill.category,
      type: "skill" as const,
    })),
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
      if (
        exploreRef.current &&
        !exploreRef.current.contains(event.target as Node)
      ) {
        setIsExploreOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim().length > 0) {
      const filtered = searchableItems
        .filter((item) => item.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 8);
      setSearchSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/courses?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm("");
      setIsSearchFocused(false);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: {
    name: string;
    href: string;
    category: string;
    type: "category" | "skill";
  }) => {
    if (suggestion.type === "category") {
      router.push(`/courses?category=${encodeURIComponent(suggestion.name)}`);
    } else {
      router.push(suggestion.href);
    }
    setSearchTerm("");
    setShowSuggestions(false);
    setIsSearchFocused(false);
  };

  const handleCategoryClick = (category: string) => {
    router.push(`/courses?category=${encodeURIComponent(category)}`);
    setIsExploreOpen(false);
  };

  const handleSkillClick = (skill: string) => {
    router.push(`/courses?search=${encodeURIComponent(skill)}`);
    setIsExploreOpen(false);
  };

  // Show search bar on all pages except auth pages (ONLY CHANGE: removed '/admin')
  const hideSearchOnPages = ['/auth/signin', '/auth/signup'];
  const showSearchBar = !hideSearchOnPages.some(page => pathname.startsWith(page));

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-[#001e62] to-blue-700 rounded-lg flex items-center justify-center mr-3">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#001e62]">LearnHub</span>
            </div>
          </Link>

          {/* Explore Dropdown - Desktop */}
          <div className="hidden lg:flex items-center ml-8">
            <div className="relative" ref={exploreRef}>
              <button
                onClick={() => setIsExploreOpen(!isExploreOpen)}
                className="flex items-center px-4 py-2 text-gray-700 hover:text-[#001e62] font-medium transition-colors border border-gray-300 rounded-lg hover:border-[#001e62]/30"
              >
                Explore
                <ChevronDown
                  className={`w-4 h-4 ml-2 transition-transform ${
                    isExploreOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {/* Explore Mega Menu - Adjusted for 60% height */}
              {isExploreOpen && (
                <div className="fixed left-0 right-0 mt-2 bg-white shadow-xl border-t border-gray-200 z-50 h-[60vh] overflow-y-auto">
                  <div className="max-w-7xl mx-auto p-4">
                    <div className="grid grid-cols-2 gap-8">
                      {/* Explore categories */}
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 mb-4">
                          Explore categories
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {exploreData.categories.map((category) => (
                            <button
                              key={category.name}
                              onClick={() => handleCategoryClick(category.name)}
                              className="flex items-center text-sm text-gray-600 hover:text-[#001e62] transition-colors py-1.5 text-left"
                            >
                              <category.icon className="w-4 h-4 mr-2" />
                              {category.name}
                            </button>
                          ))}
                        </div>
                        <Link
                          href="/courses"
                          className="text-[#001e62] hover:text-[#001e62]/80 font-medium pt-3 block text-sm"
                          onClick={() => setIsExploreOpen(false)}
                        >
                          View all categories →
                        </Link>
                      </div>
                      {/* Explore skills */}
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 mb-4">
                          Explore skills
                        </h3>
                        <div className="grid grid-cols-4 gap-2">
                          {exploreData.trendingSkills.map((skill) => (
                            <button
                              key={skill.name}
                              onClick={() => handleSkillClick(skill.name)}
                              className="text-sm text-gray-600 hover:text-[#001e62] transition-colors py-1.5 block text-left"
                            >
                              {skill.name}
                            </button>
                          ))}
                        </div>
                        <Link
                          href="/skills"
                          className="text-[#001e62] hover:text-[#001e62]/80 font-medium pt-3 block text-sm"
                          onClick={() => setIsExploreOpen(false)}
                        >
                          View all skills →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar - Desktop - Now shows on all pages except specified ones */}
          {showSearchBar && (
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <div ref={searchRef} className="w-full relative">
                <form onSubmit={handleSearch} className="w-full relative">
                  <div
                    className={`relative transition-all duration-200 ${
                      isSearchFocused ? "transform scale-[1.02]" : ""
                    }`}
                  >
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="What do you want to learn?"
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => {
                        setIsSearchFocused(true);
                        if (searchTerm.trim()) setShowSuggestions(true);
                      }}
                      onBlur={() => setIsSearchFocused(false)}
                      className="pl-12 pr-16 py-3 w-full border-gray-300 rounded-full focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62] text-base"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#001e62] hover:bg-[#001e62]/90 text-white p-2 rounded-full transition-colors"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </form>
                {/* Search Suggestions Dropdown */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-44 overflow-y-auto">
                    <div className="py-1">
                      <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Suggestions
                      </div>
                      {searchSuggestions.map((suggestion, index) => (
                        <a
                          key={`${suggestion.type}-${suggestion.name}-${index}`}
                          href={
                            suggestion.type === "category"
                              ? `/courses?category=${encodeURIComponent(
                                  suggestion.name
                                )}`
                              : suggestion.href
                          }
                          onClick={(e) => {
                            e.preventDefault();
                            handleSuggestionClick(suggestion);
                          }}
                          className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 transition-colors text-left w-full"
                        >
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="flex items-center min-w-0 flex-1">
                              {suggestion.type === "category" ? (
                                <div className="w-4 h-4 bg-[#001e62]/10 rounded flex items-center justify-center mr-2 flex-shrink-0">
                                  <BookOpen className="w-2.5 h-2.5 text-[#001e62]" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center mr-2 flex-shrink-0">
                                  <TrendingUp className="w-2.5 h-2.5 text-green-600" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-800 text-xs truncate">
                                  {suggestion.name}
                                </div>
                                <div className="text-xs text-gray-400 truncate -mt-0.5">
                                  {suggestion.type === "category"
                                    ? "Category"
                                    : suggestion.category}
                                </div>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-2.5 h-2.5 text-gray-300 flex-shrink-0 ml-1" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Links - Desktop */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              href="/courses"
              className="text-gray-700 hover:text-[#001e62] transition-colors font-medium whitespace-nowrap"
            >
              Courses
            </Link>
            <Link
              href="/careers"
              className="text-gray-700 hover:text-[#001e62] transition-colors font-medium"
            >
              Careers
            </Link>
          </nav>

          {/* Auth Section - Desktop */}
          <div className="hidden md:flex items-center space-x-4 ml-6">
            {session ? (
              <div className="flex items-center space-x-3">
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-700 hover:text-[#001e62] font-medium"
                  >
                    My Learning
                  </Button>
                </Link>
                <Link href="/favorites">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-700 hover:text-[#001e62] font-medium flex items-center"
                  >
                    <Heart className="w-4 h-4 mr-1" />
                    Favorites
                  </Button>
                </Link>
                <button className="relative p-2 text-gray-600 hover:text-[#001e62] transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
                </button>
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {session.user?.image ? (
                      <img
                        src={session.user.image}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-[#001e62] to-blue-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {session.user?.name?.charAt(0) ||
                            session.user?.email?.charAt(0) ||
                            "U"}
                        </span>
                      </div>
                    )}
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">
                          {session.user?.name || "User"}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {session.user?.email}
                        </p>
                      </div>
                      <div className="py-2">
                        <Link
                          href="/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <User className="w-4 h-4 mr-3" />
                          View Profile
                        </Link>
                        <Link
                          href="/dashboard"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <BookOpen className="w-4 h-4 mr-3" />
                          My Learning
                        </Link>
                        <Link
                          href="/favorites"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Heart className="w-4 h-4 mr-3" />
                          My Favorites
                        </Link>
                        {session.user?.role === "ADMIN" && (
                          <Link
                            href="/admin"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <Settings className="w-4 h-4 mr-3" />
                            Admin Panel
                          </Link>
                        )}
                        <hr className="my-2 border-gray-100" />
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            signOut();
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/auth/signin">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#001e62] text-[#001e62] hover:bg-[#001e62]/5"
                  >
                    Log In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button
                    size="sm"
                    className="bg-[#001e62] hover:bg-[#001e62]/90 text-white"
                  >
                    Join for Free
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {session && (
              <button className="relative p-2 text-gray-600 hover:text-[#001e62] transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Search Bar - Now shows on all pages except specified ones */}
        {showSearchBar && (
          <div className="md:hidden py-3 border-t border-gray-100">
            <div ref={searchRef} className="relative">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="What do you want to learn?"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    if (searchTerm.trim()) setShowSuggestions(true);
                  }}
                  onBlur={() => setIsSearchFocused(false)}
                  className="pl-12 pr-16 py-3 w-full rounded-full focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62]"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#001e62] hover:bg-[#001e62]/90 text-white p-2 rounded-full transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-40 overflow-y-auto">
                  <div className="py-1">
                    <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Suggestions
                    </div>
                    {searchSuggestions.map((suggestion, index) => (
                      <a
                        key={`mobile-${suggestion.type}-${suggestion.name}-${index}`}
                        href={
                          suggestion.type === "category"
                            ? `/courses?category=${encodeURIComponent(
                                suggestion.name
                              )}`
                            : suggestion.href
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          handleSuggestionClick(suggestion);
                        }}
                        className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 transition-colors text-left w-full"
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="flex items-center min-w-0 flex-1">
                            {suggestion.type === "category" ? (
                              <div className="w-4 h-4 bg-[#001e62]/10 rounded flex items-center justify-center mr-2 flex-shrink-0">
                                <BookOpen className="w-2.5 h-2.5 text-[#001e62]" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center mr-2 flex-shrink-0">
                                <TrendingUp className="w-2.5 h-2.5 text-green-600" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-800 text-xs truncate">
                                {suggestion.name}
                              </div>
                              <div className="text-xs text-gray-400 truncate -mt-0.5">
                                {suggestion.type === "category"
                                  ? "Category"
                                  : suggestion.category}
                              </div>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-2.5 h-2.5 text-gray-300 flex-shrink-0 ml-1" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Navigation - ONLY CHANGE: Made scrollable */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 max-h-[70vh] overflow-y-auto">
            <nav className="flex flex-col space-y-3">
              <div className="mb-4">
                <button
                  onClick={() => setIsMobileExploreExpanded(!isMobileExploreExpanded)}
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-900 mb-3"
                >
                  Explore Categories
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isMobileExploreExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div className="ml-4">
                  {/* Show limited categories when collapsed */}
                  {!isMobileExploreExpanded && (
                    <div className="grid grid-cols-1 gap-2">
                      {exploreData.categories.slice(0, 6).map((category) => (
                        <button
                          key={category.name}
                          onClick={() => {
                            handleCategoryClick(category.name);
                            setIsMenuOpen(false);
                          }}
                          className="flex items-center text-gray-600 hover:text-[#001e62] transition-colors py-2 text-left"
                        >
                          <category.icon className="w-4 h-4 mr-3" />
                          {category.name}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Show all categories when expanded */}
                  {isMobileExploreExpanded && (
                    <div className="max-h-60 overflow-y-auto">
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                          All Categories
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {exploreData.categories.map((category) => (
                            <button
                              key={category.name}
                              onClick={() => {
                                handleCategoryClick(category.name);
                                setIsMenuOpen(false);
                              }}
                              className="flex items-center text-gray-600 hover:text-[#001e62] transition-colors py-2 text-left"
                            >
                              <category.icon className="w-4 h-4 mr-3" />
                              {category.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                          Trending Skills
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {exploreData.trendingSkills.map((skill) => (
                            <button
                              key={skill.name}
                              onClick={() => {
                                handleSkillClick(skill.name);
                                setIsMenuOpen(false);
                              }}
                              className="text-sm text-gray-600 hover:text-[#001e62] transition-colors py-1.5 text-left"
                            >
                              {skill.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mb-2">
                        <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                          Career Paths
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {exploreData.roles.map((role) => (
                            <Link
                              key={role.name}
                              href={role.href}
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center text-gray-600 hover:text-[#001e62] transition-colors py-1.5 text-left"
                            >
                              <role.icon className="w-4 h-4 mr-3" />
                              <span className="text-sm">{role.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Link
                    href="/courses"
                    className="text-[#001e62] hover:text-[#001e62]/80 font-medium py-2 block"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    View all courses →
                  </Link>
                </div>
              </div>
              <hr className="border-gray-200" />
              <Link
                href="/online-degrees"
                className="text-gray-700 hover:text-[#001e62] transition-colors py-2 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Online Degrees
              </Link>
              <Link
                href="/careers"
                className="text-gray-700 hover:text-[#001e62] transition-colors py-2 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Careers
              </Link>
              {session ? (
                <>
                  <hr className="border-gray-200" />
                  <div className="flex items-center py-2">
                    {session.user?.image ? (
                      <img
                        src={session.user.image}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover mr-3"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-[#001e62] to-blue-700 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-semibold text-white">
                          {session.user?.name?.charAt(0) || "U"}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {session.user?.name || "User"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>
                  <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start hover:bg-[#001e62]/5"
                    >
                      <User className="w-4 h-4 mr-3" />
                      View Profile
                    </Button>
                  </Link>
                  <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start hover:bg-[#001e62]/5"
                    >
                      <BookOpen className="w-4 h-4 mr-3" />
                      My Learning
                    </Button>
                  </Link>
                  <Link href="/favorites" onClick={() => setIsMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start hover:bg-[#001e62]/5"
                    >
                      <Heart className="w-4 h-4 mr-3" />
                      My Favorites
                    </Button>
                  </Link>
                  {session.user?.role === "ADMIN" && (
                    <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start hover:bg-[#001e62]/5"
                      >
                        <Settings className="w-4 h-4 mr-3" />
                        Admin Panel
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setIsMenuOpen(false);
                      signOut();
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
                  <Link
                    href="/auth/signin"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-[#001e62] text-[#001e62] hover:bg-[#001e62]/5"
                    >
                      Log In
                    </Button>
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button
                      size="sm"
                      className="w-full bg-[#001e62] hover:bg-[#001e62]/90"
                    >
                      Join for Free
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}