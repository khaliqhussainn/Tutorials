import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Brain,
  StickyNote,
  Award,
  Download,
  Clock,
} from "lucide-react";

interface Video {
  tests: any[];
}

interface LearningToolsTabProps {
  video: Video | null;
  getProgressPercentage: () => number;
  setActiveTab: (tab: any) => void;
}

export function LearningToolsTab({
  video,
  getProgressPercentage,
  setActiveTab,
}: LearningToolsTabProps) {
  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">Learning Tools</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Practice Quizzes</h3>
                <p className="text-sm text-gray-600">Test your knowledge</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Take interactive quizzes to reinforce your learning and track your
              progress.
            </p>
            <Button className="w-full">
              {video && video.tests.length > 0
                ? "Take Quiz"
                : "No Quiz Available"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <StickyNote className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Course Notes</h3>
                <p className="text-sm text-gray-600">Save important points</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Create and organize your personal notes with timestamps for easy
              review.
            </p>
            <Button className="w-full" onClick={() => setActiveTab("notes")}>
              View Notes
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Certificate</h3>
                <p className="text-sm text-gray-600">
                  Earn completion certificate
                </p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Complete the course to earn a certificate of completion to
              showcase your skills.
            </p>
            <Button
              className="w-full"
              disabled={getProgressPercentage() !== 100}
            >
              {getProgressPercentage() === 100
                ? "Download Certificate"
                : `${getProgressPercentage()}% Complete`}
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <Download className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Resources</h3>
                <p className="text-sm text-gray-600">
                  Download course materials
                </p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Access downloadable resources, code files, and supplementary
              materials.
            </p>
            <Button className="w-full">View Resources</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-[#001e62]" />
            Schedule learning time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Learning a little each day adds up. Research shows that students who
            make learning a habit are more likely to reach their goals. Set time
            aside to learn and get reminders using your learning scheduler.
          </p>
          <div className="flex space-x-4">
            <Button className="bg-[#001e62] hover:bg-[#001e62]/90">
              Get started
            </Button>
            <Button variant="outline">Dismiss</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}