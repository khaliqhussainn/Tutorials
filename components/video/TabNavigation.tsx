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
    shortLabel: "Overview",
  },
  {
    id: "qa" as const,
    label: "Q&A",
    shortLabel: "Q&A",
  },
  {
    id: "notes" as const,
    label: "Notes",
    shortLabel: "Notes",
  },
  {
    id: "announcements" as const,
    label: "Announcements",
    shortLabel: "Updates",
  },
  {
    id: "reviews" as const,
    label: "Reviews",
    shortLabel: "Reviews",
  },
  {
    id: "compiler" as const,
    label: "Compiler",
    shortLabel: "Code",
  },
  {
    id: "learning-tools" as const,
    label: "Learning tools",
    shortLabel: "AI Tools",
  },
];

export function TabNavigation({ activeTab, setActiveTab }: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <nav className="flex overflow-x-auto scrollbar-hide">
        <div className="flex items-center px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
          <Search className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
        </div>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 md:px-6 py-3 md:py-4 border-b-2 font-medium text-xs md:text-sm transition-all whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? `border-gray-900 text-gray-900`
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}