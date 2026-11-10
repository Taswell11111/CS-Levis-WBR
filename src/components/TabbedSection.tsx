import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Tab {
  id: string;
  label: React.ReactNode;
  content?: React.ReactNode;
}

interface TabbedSectionProps {
  tabs: Tab[];
  activeTabId?: string;
  onTabChange?: (id: string) => void;
  defaultTabId?: string;
  className?: string;
  tabClassName?: string | ((id: string, isActive: boolean) => string);
  activeTabClassName?: string;
  inactiveTabClassName?: string;
}

export const TabbedSection: React.FC<TabbedSectionProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  defaultTabId,
  className = "",
  tabClassName = "px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer",
  activeTabClassName = "bg-[#003876] text-white shadow-xs",
  inactiveTabClassName = "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-blue-500/30"
}) => {
  const [internalTabId, setInternalTabId] = useState(defaultTabId || tabs[0]?.id);
  const currentTabId = activeTabId !== undefined ? activeTabId : internalTabId;

  const handleTabClick = (id: string) => {
    if (onTabChange) {
      onTabChange(id);
    } else {
      setInternalTabId(id);
    }
  };

  const getTabClass = (id: string) => {
    const isActive = currentTabId === id;
    const baseClass = typeof tabClassName === 'function' ? tabClassName(id, isActive) : tabClassName;
    const activeClass = isActive ? activeTabClassName : inactiveTabClassName;
    return `${baseClass} ${activeClass}`;
  };

  return (
    <div className={`tabbed-section ${className}`}>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab.id)}
            className={getTabClass(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {tabs.find((t) => t.id === currentTabId)?.content && (
          <motion.div
            key={currentTabId}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {tabs.find((t) => t.id === currentTabId)?.content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
