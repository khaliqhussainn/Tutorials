import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Share2 } from "lucide-react";

interface VideoPageHeaderProps {
  courseId: string;
  courseTitle: string;
  progressPercentage: number;
}

export function VideoPageHeader({ 
  courseId, 
  courseTitle, 
  progressPercentage 
}: VideoPageHeaderProps) {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-full mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link
              href={`/course/${courseId}`}
              className="flex items-center text-gray-600 hover:text-[#001e62] transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold">Back to course</span>
            </Link>

            <div className="h-8 w-px bg-gray-300"></div>

            <div>
              <h1 className="font-bold text-gray-900 text-lg">
                {courseTitle}
              </h1>
              <p className="text-gray-500 text-sm">
                {progressPercentage}% Complete
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 hover:bg-gray-50"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}