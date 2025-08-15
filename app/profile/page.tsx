"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  User,
  Mail,
  Calendar,
  Award,
  BookOpen,
  Clock,
  Edit3,
  Save,
  X,
  Camera,
  Trophy,
  Target,
  TrendingUp,
  Heart,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Shield,
  Bell,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface UserStats {
  totalEnrollments: number;
  completedCourses: number;
  inProgressCourses: number;
  totalWatchTime: number;
  favoriteCount: number;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  role: string;
}

interface RecentActivity {
  id: string;
  type: "completed" | "enrolled" | "favorited";
  title: string;
  subtitle: string;
  timestamp: string;
  progress?: number;
}

export default function ProfilePage() {
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated' && session?.user?.email) {
      fetchAllData();
    }
  }, [session, status, router]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        fetchUserProfile(),
        fetchUserStats(),
        fetchRecentActivity(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load profile data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      const data = await response.json();
      setUserProfile(data);
      setFormData({
        name: data.name || "",
        email: data.email || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch("/api/user/course-stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      const data = await response.json();
      setUserStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Don't throw - stats are not critical
      setUserStats({
        totalEnrollments: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        totalWatchTime: 0,
        favoriteCount: 0,
      });
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Fetch recent enrollments
      const enrollmentsResponse = await fetch("/api/user/enrollments");
      const enrollments = enrollmentsResponse.ok
        ? await enrollmentsResponse.json()
        : [];

      // Fetch progress data
      const progressResponse = await fetch("/api/user/progress");
      const progress = progressResponse.ok ? await progressResponse.json() : [];

      // Mock recent activity - in production, you'd have actual activity tracking
      const activities: RecentActivity[] = [
        ...enrollments.slice(0, 3).map((enrollment: any) => ({
          id: enrollment.id,
          type: "enrolled" as const,
          title: `Enrolled in ${enrollment.course.title}`,
          subtitle: enrollment.course.category,
          timestamp: enrollment.enrolledAt,
          progress: enrollment.calculatedProgress || 0,
        })),
        ...progress.slice(0, 2).map((item: any) => ({
          id: item.courseId,
          type: "completed" as const,
          title: `Making progress in ${item.course.title}`,
          subtitle: `${item.progress}% complete`,
          timestamp: item.lastWatched,
          progress: item.progress,
        })),
      ].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error("Error fetching activity:", error);
      setRecentActivity([]);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: formData.name.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      const updatedUser = await response.json();
      setUserProfile(updatedUser);
      setIsEditing(false);

      // Update the session
      await update({
        ...session,
        user: {
          ...session?.user,
          name: formData.name.trim(),
        },
      });

      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: userProfile?.name || "",
      email: userProfile?.email || "",
    });
    setIsEditing(false);
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/user/upload-avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload avatar");
      }

      const result = await response.json();

      // Update user profile with new avatar
      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              image: result.user.image,
            }
          : null
      );

      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          image: result.user.image,
        },
      });

      toast.success("Avatar updated successfully!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(error.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const response = await fetch("/api/user/upload-avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove avatar");
      }

      const result = await response.json();

      // Update user profile
      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              image: null,
            }
          : null
      );

      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          image: null,
        },
      });

      toast.success("Avatar removed successfully!");
    } catch (error: any) {
      console.error("Error removing avatar:", error);
      toast.error(error.message || "Failed to remove avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "enrolled":
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case "favorited":
        return <Heart className="w-4 h-4 text-red-500" />;
      default:
        return <Play className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  // Show loading spinner while session is loading or data is fetching
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    return null; // Will redirect in useEffect
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error Loading Profile
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchAllData} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
            {/* Profile Image */}
            <div className="relative group">
              <div className="w-32 h-32 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-2xl overflow-hidden">
                {userProfile?.image ? (
                  <img
                    src={userProfile.image}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {userProfile?.name?.charAt(0) ||
                      userProfile?.email?.charAt(0) ||
                      "U"}
                  </span>
                )}

                {/* Upload overlay */}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Avatar upload button */}
              <div className="absolute -bottom-3 -right-3 flex gap-1">
                <label className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center hover:bg-primary-400 transition-all duration-200 shadow-lg border-2 border-white cursor-pointer group-hover:scale-110">
                  <Camera className="w-5 h-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>

                {userProfile?.image && (
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center hover:bg-red-400 transition-all duration-200 shadow-lg border-2 border-white group-hover:scale-110"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3">
                {userProfile?.name || "Welcome!"}
              </h1>
              <p className="text-primary-100 text-lg mb-6">
                {userProfile?.email}
              </p>

              <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-6">
                <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                  <Calendar className="w-4 h-4 mr-2 text-white" />
                  <span className="text-sm text-white">
                    Joined{" "}
                    {new Date(userProfile?.createdAt || "").toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        {userStats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8 -mt-16 relative z-10">
            <Card className="text-center shadow-lg border-0 bg-white/95 backdrop-blur-sm">
              <CardContent className="p-6">
                <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {userStats.totalEnrollments}
                </div>
                <div className="text-sm text-gray-600">Enrolled</div>
              </CardContent>
            </Card>

            <Card className="text-center shadow-lg border-0 bg-white/95 backdrop-blur-sm">
              <CardContent className="p-6">
                <Trophy className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {userStats.completedCourses}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </CardContent>
            </Card>

            <Card className="text-center shadow-lg border-0 bg-white/95 backdrop-blur-sm">
              <CardContent className="p-6">
                <Target className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {userStats.inProgressCourses}
                </div>
                <div className="text-sm text-gray-600">In Progress</div>
              </CardContent>
            </Card>

            <Card className="text-center shadow-lg border-0 bg-white/95 backdrop-blur-sm">
              <CardContent className="p-6">
                <Clock className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatDuration(userStats.totalWatchTime)}
                </div>
                <div className="text-sm text-gray-600">Watch Time</div>
              </CardContent>
            </Card>

            <Card className="text-center shadow-lg border-0 bg-white/95 backdrop-blur-sm">
              <CardContent className="p-6">
                <Heart className="w-8 h-8 text-red-600 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {userStats.favoriteCount}
                </div>
                <div className="text-sm text-gray-600">Favorites</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center text-lg">
                  <User className="w-5 h-5 mr-2 text-gray-700" />
                  Profile Information
                </CardTitle>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="hover:bg-primary-50"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-primary-600 hover:bg-primary-700"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    {isEditing ? (
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Enter your full name"
                        className="focus:ring-primary-500 focus:border-primary-500"
                        maxLength={100}
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg border">
                        {userProfile?.name || (
                          <span className="text-gray-400 italic">
                            Not provided
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg border flex items-center">
                      <Mail className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="truncate">{userProfile?.email}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Email cannot be changed for security reasons
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Type
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg border flex items-center">
                      <Award className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="capitalize">
                        {userProfile?.role?.toLowerCase()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Member Since
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg border flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span>
                        {new Date(
                          userProfile?.createdAt || ""
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Learning Progress Section */}
            <Card className="mt-6 shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="w-5 h-5 mr-2 text-gray-700" />
                  Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userStats && (
                  <div className="space-y-6">
                    {/* Completion Rate */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          Overall Completion Rate
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {userStats.totalEnrollments > 0
                            ? Math.round(
                                (userStats.completedCourses /
                                  userStats.totalEnrollments) *
                                  100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500 ease-out"
                          style={{
                            width:
                              userStats.totalEnrollments > 0
                                ? `${
                                    (userStats.completedCourses /
                                      userStats.totalEnrollments) *
                                    100
                                  }%`
                                : "0%",
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Progress Grid */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                      <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                        <div className="text-2xl font-bold text-green-700 mb-1">
                          {userStats.completedCourses}
                        </div>
                        <div className="text-xs text-green-600 font-medium">
                          Completed
                        </div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="text-2xl font-bold text-blue-700 mb-1">
                          {userStats.inProgressCourses}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          In Progress
                        </div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-200">
                        <div className="text-2xl font-bold text-purple-700 mb-1">
                          {userStats.favoriteCount}
                        </div>
                        <div className="text-xs text-purple-600 font-medium">
                          Favorites
                        </div>
                      </div>
                    </div>

                    {/* Learning Streak */}
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">
                            Learning Streak
                          </h4>
                          <p className="text-xs text-gray-600">
                            Keep up the great work!
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-orange-600">
                            {Math.floor(
                              userStats.totalWatchTime / (60 * 24 * 7)
                            )}{" "}
                            {/* Rough weekly streak */}
                          </div>
                          <div className="text-xs text-orange-700">
                            weeks active
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Sidebar */}
          <div>
            <Card className="shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Bell className="w-5 h-5 mr-2 text-gray-700" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-shrink-0 mt-1">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-500 mb-1">
                            {activity.subtitle}
                          </p>
                          {activity.progress !== undefined &&
                            activity.progress > 0 && (
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                                <div
                                  className="bg-primary-500 h-1.5 rounded-full"
                                  style={{ width: `${activity.progress}%` }}
                                ></div>
                              </div>
                            )}
                          <p className="text-xs text-gray-400">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      No recent activity
                    </p>
                    <p className="text-xs text-gray-400">
                      Start learning to see your progress here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card className="mt-6 shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">
                      Total Learning Time
                    </span>
                    <span className="font-semibold text-gray-900">
                      {userStats
                        ? formatDuration(userStats.totalWatchTime)
                        : "0m"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">
                      Courses Enrolled
                    </span>
                    <span className="font-semibold text-gray-900">
                      {userStats?.totalEnrollments || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="font-semibold text-green-600">
                      {userStats && userStats.totalEnrollments > 0
                        ? `${Math.round(
                            (userStats.completedCourses /
                              userStats.totalEnrollments) *
                              100
                          )}%`
                        : "0%"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">
                      Favorite Subjects
                    </span>
                    <span className="font-semibold text-gray-900">
                      {userStats?.favoriteCount || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievement Badge */}
            <Card className="mt-6 shadow-sm border-gray-200 bg-gradient-to-br from-yellow-50 to-orange-50">
              <CardContent className="text-center py-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {userStats?.completedCourses && userStats.completedCourses > 0
                    ? userStats.completedCourses >= 10
                      ? "Course Master"
                      : userStats.completedCourses >= 5
                      ? "Learning Champion"
                      : "Quick Learner"
                    : "Getting Started"}
                </h3>
                <p className="text-sm text-gray-600">
                  {userStats?.completedCourses && userStats.completedCourses > 0
                    ? `Completed ${userStats.completedCourses} course${
                        userStats.completedCourses > 1 ? "s" : ""
                      }`
                    : "Complete your first course to earn a badge"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}