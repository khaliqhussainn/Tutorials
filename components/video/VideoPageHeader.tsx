import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Share2, Menu, X } from "lucide-react";

interface VideoPageHeaderProps {
  courseId: string;
  courseTitle: string;
  progressPercentage: number;
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  isMobile?: boolean;
}

export function VideoPageHeader({ 
  courseId, 
  courseTitle, 
  progressPercentage,
  sidebarOpen = false,
  setSidebarOpen,
  isMobile = false
}: VideoPageHeaderProps) {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-full mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-6 min-w-0 flex-1">
            <Link
              href={`/course/${courseId}`}
              className="flex items-center text-gray-600 hover:text-[#001e62] transition-colors group flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2 group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold text-sm md:text-base hidden sm:inline">Back to course</span>
              <span className="font-semibold text-sm md:text-base sm:hidden">Back</span>
            </Link>

            <div className="h-6 md:h-8 w-px bg-gray-300 flex-shrink-0"></div>

            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-gray-900 text-sm md:text-lg truncate">
                {courseTitle}
              </h1>
              <p className="text-gray-500 text-xs md:text-sm">
                {progressPercentage}% Complete
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 hover:bg-gray-50 text-xs md:text-sm px-2 md:px-3"
            >
              <Share2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            
            {/* Sidebar Toggle Button */}
            {setSidebarOpen && (
              <Button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-gray-50 text-xs md:text-sm px-2 md:px-3"
              >
                {sidebarOpen ? (
                  <X className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                ) : (
                  <Menu className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                )}
                <span className="hidden sm:inline">
                  {sidebarOpen ? "Hide" : "Show"} Content
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}