import React from 'react';

interface TabsProps {
  tabs: { id: string; label: React.ReactNode }[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex gap-2 mb-6 border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-6 py-3 text-sm font-bold transition-all relative ${
              isActive
                ? 'text-kaboo-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-kaboo-primary rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
