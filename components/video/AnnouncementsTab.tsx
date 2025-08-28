import { Badge } from "@/components/ui/Badge";
import { Megaphone, Pin } from "lucide-react";

interface CourseAnnouncement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: {
    name: string;
    role: string;
  };
}

interface AnnouncementsTabProps {
  announcements: CourseAnnouncement[];
}

export function AnnouncementsTab({ announcements }: AnnouncementsTabProps) {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Course Announcements</h2>
        <Badge variant="secondary">
          {
            announcements.filter((a) => {
              const daysDiff =
                (new Date().getTime() - new Date(a.createdAt).getTime()) /
                (1000 * 3600 * 24);
              return daysDiff <= 7;
            }).length
          }{" "}
          New This Week
        </Badge>
      </div>

      <div className="space-y-6">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="border border-gray-200 rounded-lg p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-[#001e62] rounded-full flex items-center justify-center">
                  <Megaphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg flex items-center">
                    {announcement.title}
                    {announcement.isPinned && (
                      <Pin className="w-4 h-4 ml-2 text-yellow-500" />
                    )}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {new Date(announcement.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              </div>
              {(() => {
                const daysDiff =
                  (new Date().getTime() -
                    new Date(announcement.createdAt).getTime()) /
                  (1000 * 3600 * 24);
                return (
                  daysDiff <= 7 && (
                    <Badge className="bg-blue-100 text-blue-800">New</Badge>
                  )
                );
              })()}
            </div>
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {announcement.content}
              </p>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-12 border border-gray-200 rounded-lg">
            <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No announcements yet
            </h3>
            <p className="text-gray-500">
              Course announcements will appear here when available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}