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
} from "lucide-react";

interface VideoProgress {
  videoId: string;
  completed: boolean;
  testPassed: boolean;
  watchTime: number;
}

interface Video {
  id: string;
  title: string;
  duration?: number;
  tests?: any[];
}

interface CourseSection {
  id: string;
  title: string;
  videos: Video[];
}

interface Course {
  id: string;
  sections?: CourseSection[];
}

interface CourseSidebarProps {
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
}

const formatDuration = (seconds: number) => {
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

export function CourseSidebar({
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
  getVideoStatus
}: CourseSidebarProps) {
  return (
    <div
      className={`${
        sidebarOpen ? "w-96" : "w-12"
      } transition-all duration-300 bg-white border-l border-gray-200 flex-shrink-0`}
    >
      <div className="p-4 border-b border-gray-200">
        <Button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {sidebarOpen ? (
            <>
              <ChevronRight className="w-4 h-4 mr-2" />
              Hide Course Content
            </>
          ) : (
            <List className="w-4 h-4" />
          )}
        </Button>
      </div>

      {sidebarOpen && (
        <div className="p-4 h-full overflow-y-auto">
          <div className="mb-6">
            <div className="bg-gradient-to-r from-[#001e62] to-[#001e62]/90 p-4 rounded-xl text-white">
              <h3 className="font-bold mb-2">Course Progress</h3>
              <div className="text-2xl font-bold mb-2">
                {getProgressPercentage()}%
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <div className="text-sm text-white/80 mt-2">
                {getCompletedVideos()}/{getTotalVideos()} videos completed
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {course?.sections?.map((section, sectionIndex) => (
              <div
                key={section.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center">
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="w-4 h-4 mr-2 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-2 text-gray-600" />
                    )}
                    <div>
                      <h4 className="font-semibold text-sm">{section.title}</h4>
                      <p className="text-xs text-gray-500">
                        {section.videos.length} videos
                      </p>
                    </div>
                  </div>
                </div>

                {expandedSections.has(section.id) && (
                  <div className="bg-white">
                    {section.videos.map((videoItem, videoIndex) => {
                      const status = getVideoStatus(
                        videoItem,
                        section.videos,
                        videoIndex,
                        sectionIndex
                      );
                      const progress = videoProgress.find(
                        (p) => p.videoId === videoItem.id
                      );
                      const isCurrentVideo = videoItem.id === currentVideoId;

                      return (
                        <div
                          key={videoItem.id}
                          className={`flex items-center p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer ${
                            isCurrentVideo
                              ? "bg-[#001e62]/5 border-l-4 border-l-[#001e62]"
                              : ""
                          }`}
                        >
                          <div className="flex items-center mr-3">
                            <div
                              className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all ${
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
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                videoIndex + 1
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h5
                              className={`font-medium text-sm leading-tight truncate ${
                                isCurrentVideo
                                  ? "text-[#001e62]"
                                  : "text-gray-900"
                              }`}
                            >
                              {videoItem.title}
                            </h5>
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDuration(videoItem.duration || 0)}
                              {progress && progress.watchTime > 0 && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span className="text-blue-600">
                                    {Math.round(
                                      (progress.watchTime /
                                        (videoItem.duration || 1)) *
                                        100
                                    )}
                                    % watched
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {status === "available" && !isCurrentVideo && (
                            <Link
                              href={`/course/${course?.id}/video/${videoItem.id}`}
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs px-2 py-1"
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
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}