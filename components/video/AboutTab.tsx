import { Star, Users, Clock } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  rating?: number;
  _count: { enrollments: number };
}

interface AboutTabProps {
  course: Course | null;
  getTotalDuration: () => number;
  getTotalVideos: () => number;
  getProgressPercentage: () => number;
  getCompletedVideos: () => number;
}

export function AboutTab({
  course,
  getTotalDuration,
  getTotalVideos,
  getProgressPercentage,
  getCompletedVideos,
}: AboutTabProps) {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          {course?.title}
        </h2>
        <p className="text-lg text-gray-700 leading-relaxed mb-8">
          {course?.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-2">
            <Star className="w-5 h-5 text-yellow-400 mr-2" />
            <span className="text-2xl font-bold">{course?.rating || 4.6}</span>
          </div>
          <p className="text-gray-600 text-sm">
            {course?._count?.enrollments || 50936} ratings
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-2">
            <Users className="w-5 h-5 text-blue-500 mr-2" />
            <span className="text-2xl font-bold">
              {course?._count?.enrollments?.toLocaleString() || "230,038"}
            </span>
          </div>
          <p className="text-gray-600 text-sm">Students</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-2">
            <Clock className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-2xl font-bold">
              {Math.round(getTotalDuration() / 3600)} hours
            </span>
          </div>
          <p className="text-gray-600 text-sm">Total</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">By the numbers</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Skill level:</span>
                <span className="font-medium">
                  {course?.level || "All Levels"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Students:</span>
                <span className="font-medium">
                  {course?._count?.enrollments?.toLocaleString() || "230038"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Languages:</span>
                <span className="font-medium">English</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Course Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Lectures:</span>
                <span className="font-medium">{getTotalVideos()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Video:</span>
                <span className="font-medium">
                  {Math.round(getTotalDuration() / 3600)} total hours
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Last updated:</span>
                <span className="font-medium">February 2025</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-xl font-semibold mb-4">Your Progress</h3>
        <div className="bg-gradient-to-r from-[#001e62]/5 to-[#001e62]/10 rounded-lg p-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-lg font-medium">Course Completion</span>
            <span className="text-2xl font-bold text-[#001e62]">
              {getProgressPercentage()}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div
              className="bg-[#001e62] h-3 rounded-full transition-all duration-500"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              {getCompletedVideos()} of {getTotalVideos()} videos completed
            </span>
            <span>
              {getTotalVideos() - getCompletedVideos()} videos remaining
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}