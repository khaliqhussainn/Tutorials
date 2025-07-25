// app/admin/courses/[courseId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ArrowLeft,
  Plus,
  Play,
  Edit,
  Trash2,
  Upload,
  Clock,
  AlertCircle,
  CheckCircle,
  Save,
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  isPublished: boolean;
  thumbnail?: string;
  videos: Video[];
}

interface Video {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  duration?: number;
  order: number;
  aiPrompt?: string;
  tests: { id: string }[];
}

interface VideoFormData {
  title: string;
  description: string;
  aiPrompt: string;
  videoFile: File | null;
}

export default function CourseManagementPage({
  params,
}: {
  params: { courseId: string };
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "processing" | "success" | "error"
  >("idle");

  const [videoForm, setVideoForm] = useState<VideoFormData>({
    title: "",
    description: "",
    aiPrompt: "",
    videoFile: null,
  });

  useEffect(() => {
    if (session?.user.role !== "ADMIN") {
      router.push("/");
      return;
    }
    fetchCourse();
  }, [session, router, params.courseId]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/admin/courses/${params.courseId}`);
      if (response.ok) {
        const data = await response.json();
        setCourse(data);
      } else {
        router.push("/admin/courses");
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      router.push("/admin/courses");
    } finally {
      setLoading(false);
    }
  };

  const handleVideoFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setVideoForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoForm((prev) => ({ ...prev, videoFile: file }));
    }
  };

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoForm.videoFile) {
      setError("Please select a video file");
      return;
    }

    // File validation
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (videoForm.videoFile.size > maxSize) {
      setError("File size must be less than 100MB");
      return;
    }

    if (!videoForm.videoFile.type.startsWith("video/")) {
      setError("Please select a valid video file");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    setUploadProgress(0);
    setUploadStatus("uploading");

    try {
      // Step 1: Upload video file with progress tracking
      const formData = new FormData();
      formData.append("file", videoForm.videoFile);

      // Simulate upload progress (since we can't get real progress from fetch)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 90) return prev + Math.random() * 10;
          return prev;
        });
      }, 1000);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Failed to upload video");
      }

      const uploadData = await uploadResponse.json();
      setUploadProgress(95);
      setUploadStatus("processing");

      // Step 2: Create video record with AI test generation
      const videoResponse = await fetch(
        `/api/courses/${params.courseId}/videos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: videoForm.title,
            description: videoForm.description,
            videoUrl: uploadData.url,
            duration: uploadData.duration,
            aiPrompt: videoForm.aiPrompt,
          }),
        }
      );

      if (!videoResponse.ok) {
        const errorData = await videoResponse.json();
        throw new Error(errorData.error || "Failed to create video");
      }

      setUploadProgress(100);
      setUploadStatus("success");
      setSuccess("Video uploaded successfully with AI-generated tests!");
      setShowVideoForm(false);
      setVideoForm({
        title: "",
        description: "",
        aiPrompt: "",
        videoFile: null,
      });

      // Reset file input
      const fileInput = document.getElementById(
        "videoFile"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      await fetchCourse(); // Refresh course data
    } catch (error) {
      setUploadStatus("error");
      setError(error instanceof Error ? error.message : "Upload failed");
      setUploadProgress(0);
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadStatus("idle");
        setUploadProgress(0);
      }, 3000);
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this video? This will also delete associated tests."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchCourse();
        setSuccess("Video deleted successfully");
      }
    } catch (error) {
      setError("Failed to delete video");
    }
  };

  const toggleCoursePublished = async () => {
    try {
      const response = await fetch(`/api/admin/courses/${params.courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !course?.isPublished }),
      });

      if (response.ok) {
        setCourse((prev) =>
          prev ? { ...prev, isPublished: !prev.isPublished } : null
        );
        setSuccess(
          `Course ${
            course?.isPublished ? "unpublished" : "published"
          } successfully`
        );
      }
    } catch (error) {
      setError("Failed to update course status");
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="text-center p-8">
            <h2 className="text-xl font-semibold mb-4">Course Not Found</h2>
            <Link href="/admin/courses">
              <Button>Back to Courses</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/courses"
            className="flex items-center text-primary-600 hover:text-primary-700 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Courses
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-dark-900 mb-2">
                {course.title}
              </h1>
              <p className="text-lg text-dark-600">
                Manage course content and videos
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant={course.isPublished ? "outline" : "primary"}
                onClick={toggleCoursePublished}
              >
                {course.isPublished ? "Unpublish" : "Publish"} Course
              </Button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Course Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-dark-700">
                    Category:
                  </span>
                  <p className="text-dark-900">{course.category}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-dark-700">
                    Level:
                  </span>
                  <p className="text-dark-900">{course.level}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-dark-700">
                    Status:
                  </span>
                  <span
                    className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      course.isPublished
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {course.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-dark-700">
                    Total Videos:
                  </span>
                  <p className="text-dark-900">{course.videos.length}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-dark-700">
                    Description:
                  </span>
                  <p className="text-dark-600 text-sm">{course.description}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Videos Management */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Video Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Course Videos</CardTitle>
                  <Button
                    onClick={() => setShowVideoForm(!showVideoForm)}
                    disabled={uploading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Video
                  </Button>
                </div>
              </CardHeader>

              {showVideoForm && (
                <CardContent className="border-t border-dark-200">
                  <form onSubmit={handleVideoSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-dark-700 block mb-2">
                          Video Title *
                        </label>
                        <Input
                          name="title"
                          placeholder="Enter video title"
                          value={videoForm.title}
                          onChange={handleVideoFormChange}
                          required
                          disabled={uploading}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-dark-700 block mb-2">
                          Video File * (Max 100MB)
                        </label>
                        <Input
                          id="videoFile"
                          type="file"
                          accept="video/*"
                          onChange={handleFileChange}
                          required
                          disabled={uploading}
                        />
                        {videoForm.videoFile && (
                          <p className="text-xs text-dark-500 mt-1">
                            File: {videoForm.videoFile.name} (
                            {(videoForm.videoFile.size / 1024 / 1024).toFixed(
                              2
                            )}{" "}
                            MB)
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-dark-700 block mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        rows={3}
                        placeholder="Describe what this video covers"
                        value={videoForm.description}
                        onChange={handleVideoFormChange}
                        className="flex w-full rounded-md border border-dark-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        disabled={uploading}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-dark-700 block mb-2">
                        AI Test Prompt *
                      </label>
                      <textarea
                        name="aiPrompt"
                        rows={3}
                        placeholder="Provide context for AI to generate relevant test questions (e.g., 'This video covers HTML basics, tags, attributes, and document structure')"
                        value={videoForm.aiPrompt}
                        onChange={handleVideoFormChange}
                        className="flex w-full rounded-md border border-dark-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        required
                        disabled={uploading}
                      />
                      <p className="text-xs text-dark-500 mt-1">
                        This helps AI generate relevant test questions for this
                        video
                      </p>
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-dark-600">
                            {uploadStatus === "uploading" &&
                              "Uploading video..."}
                            {uploadStatus === "processing" &&
                              "Processing and generating tests..."}
                          </span>
                          <span className="text-dark-600">
                            {uploadProgress.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-dark-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-dark-500">
                          {uploadStatus === "uploading" &&
                            "This may take a few minutes for large files..."}
                          {uploadStatus === "processing" &&
                            "AI is generating test questions..."}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center space-x-4">
                      <Button type="submit" disabled={uploading}>
                        {uploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            {uploadStatus === "uploading"
                              ? "Uploading..."
                              : "Processing..."}
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Video
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowVideoForm(false);
                          setVideoForm({
                            title: "",
                            description: "",
                            aiPrompt: "",
                            videoFile: null,
                          });
                          setUploadProgress(0);
                          setUploadStatus("idle");
                        }}
                        disabled={uploading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              )}
            </Card>

            {/* Videos List */}
            <Card>
              <CardHeader>
                <CardTitle>Videos ({course.videos.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {course.videos.length > 0 ? (
                  <div className="space-y-4">
                    {course.videos
                      .sort((a, b) => a.order - b.order)
                      .map((video, index) => (
                        <div
                          key={video.id}
                          className="flex items-center p-4 border border-dark-200 rounded-lg"
                        >
                          <div className="flex items-center mr-4">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-primary-600">
                                {index + 1}
                              </span>
                            </div>
                            <Play className="w-5 h-5 text-primary-600" />
                          </div>

                          <div className="flex-1">
                            <h4 className="font-semibold text-dark-900 mb-1">
                              {video.title}
                            </h4>
                            {video.description && (
                              <p className="text-sm text-dark-600 mb-2">
                                {video.description}
                              </p>
                            )}
                            <div className="flex items-center text-sm text-dark-500 space-x-4">
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {video.duration
                                  ? formatDuration(video.duration)
                                  : "Processing..."}
                              </div>
                              <div>Tests: {video.tests.length}</div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteVideo(video.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Play className="w-16 h-16 text-dark-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-dark-700 mb-2">
                      No videos yet
                    </h3>
                    <p className="text-dark-500 mb-4">
                      Add your first video to get started with this course.
                    </p>
                    <Button onClick={() => setShowVideoForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Video
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
