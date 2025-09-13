import { Search } from "lucide-react";

type TabId = "about" | "qa" | "notes" | "announcements" | "reviews" | "compiler" |  "learning-tools";

interface TabNavigationProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

const tabs = [
  {
    id: "about" as const,
    label: "Overview",
  },
  {
    id: "qa" as const,
    label: "Q&A",
  },
  {
    id: "notes" as const,
    label: "Notes",
  },
  {
    id: "announcements" as const,
    label: "Announcements",
  },
  {
    id: "reviews" as const,
    label: "Reviews",
  },
  {
    id: "compiler" as const,
    label: "Compiler",
  },
  {
    id: "learning-tools" as const,
    label: "Learning tools",
  },
];

export function TabNavigation({ activeTab, setActiveTab }: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex overflow-x-auto">
        <div className="flex items-center px-6 py-4">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                isActive
                  ? `border-gray-900 text-gray-900`
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}