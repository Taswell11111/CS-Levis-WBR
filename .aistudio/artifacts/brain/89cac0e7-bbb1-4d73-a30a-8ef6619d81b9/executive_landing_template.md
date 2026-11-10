# Executive Landing Page Template Spec

Use the prompt below to generate or customize this professional landing page layout for any application.

## The Prompt
> "Create a production-grade Executive Landing Page using React and Tailwind CSS. Use a **Deep Navy/Royal Blue (#003876)** primary accent color and a **Clean White & Minimal Gray** background aesthetic. The page should feature a hero section with an elegant header and a dynamic grid of entry point cards. Each card should be defined in a configuration array with properties for icon, title, description, and action. Use Framer Motion for smooth fade-in and hover transitions. Ensure the design is mobile-responsive and follows a professional, corporate layout with subtle shadows and refined typography."

---

## The Code (React + Tailwind + Framer Motion)

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Settings, 
  FileText, 
  ChevronRight, 
  ShieldCheck,
  Activity
} from 'lucide-react';

/**
 * CONFIGURATION: Define your application entry points here.
 * This array drives the dynamic card grid.
 */
interface EntryPoint {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  onClick: () => void;
  colorClass: string; // Tailwind color for accent borders/backgrounds
}

const entryPoints: EntryPoint[] = [
  {
    id: 'dashboard',
    title: 'Data Analytics',
    description: 'Access real-time business intelligence and performance metrics.',
    icon: <LayoutDashboard size={20} />,
    actionLabel: 'View Dashboard',
    onClick: () => console.log('Navigating to Dashboard'),
    colorClass: 'border-blue-600 text-blue-700'
  },
  {
    id: 'reports',
    title: 'Weekly Reports',
    description: 'Review and download historical performance summaries and audits.',
    icon: <FileText size={20} />,
    actionLabel: 'Launch Reports',
    onClick: () => console.log('Navigating to Reports'),
    colorClass: 'border-blue-900 text-blue-900'
  },
  {
    id: 'config',
    title: 'System Config',
    description: 'Configure operational parameters and manage core data feeds.',
    icon: <Settings size={20} />,
    actionLabel: 'Open Config',
    onClick: () => console.log('Navigating to Config'),
    colorClass: 'border-slate-400 text-slate-700'
  }
];

export const ExecutiveLanding: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* 1. HEADER / NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#003876] rounded flex items-center justify-center">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg uppercase text-[#003876]">
              Executive <span className="font-light text-slate-500">Suite</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            <span className="flex items-center gap-1.5">
              <Activity size={14} className="text-emerald-500" />
              System Live
            </span>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#003876] mb-6 leading-tight">
            Strategic Operations <br />
            <span className="text-slate-400 font-light">Management Portal</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            A unified interface for auditing performance, managing data integrity, 
            and driving data-backed decisions across the organization.
          </p>
        </motion.div>

        {/* 3. DYNAMIC ENTRY POINT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {entryPoints.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              onClick={item.onClick}
              className="group cursor-pointer bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Subtle Decorative Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                <div className="w-12 h-12 bg-slate-50 text-[#003876] rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#003876] group-hover:text-white transition-colors shadow-sm">
                  {item.icon}
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-[#003876] transition-colors">
                  {item.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 px-2">
                  {item.description}
                </p>

                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#003876] border-b-2 border-transparent group-hover:border-[#003876] pb-1 transition-all">
                  {item.actionLabel}
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* 4. FOOTER / SYSTEM STATUS */}
      <footer className="py-10 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">
          <div>&copy; 2026 Enterprise Operations. All Rights Reserved.</div>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#003876] cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-[#003876] cursor-pointer transition-colors">Support</span>
            <span className="hover:text-[#003876] cursor-pointer transition-colors">Privacy Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
```
