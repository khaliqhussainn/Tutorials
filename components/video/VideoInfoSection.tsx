import { Clock, Eye, CheckCircle } from "lucide-react";

interface VideoInfoSectionProps {
  title: string;
  description?: string;
  duration?: number;
  watchTime: number;
  videoCompleted: boolean;
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

export function VideoInfoSection({
  title,
  description,
  duration,
  watchTime,
  videoCompleted
}: VideoInfoSectionProps) {
  return (
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        {title}
      </h2>

      <div className="flex items-center space-x-4 text-sm text-gray-600 flex-wrap gap-3">
        <div className="flex items-center bg-gray-100 px-3 py-1.5 rounded-full">
          <Clock className="w-4 h-4 mr-2 text-[#001e62]" />
          <span>
            {duration
              ? formatDuration(duration)
              : "Duration not available"}
          </span>
        </div>
        <div className="flex items-center bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full">
          <Eye className="w-4 h-4 mr-2" />
          <span>
            {Math.round(
              duration
                ? Math.min((watchTime / duration) * 100, 100)
                : 0
            )}
            % watched
          </span>
        </div>
        {videoCompleted && (
          <div className="flex items-center text-green-600 bg-green-100 px-3 py-1.5 rounded-full">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span className="font-medium">Completed</span>
          </div>
        )}
      </div>

      {description && (
        <p className="text-gray-700 leading-relaxed mt-4">
          {description}
        </p>
      )}
    </div>
  );
}