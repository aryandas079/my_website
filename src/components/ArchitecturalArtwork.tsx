import React, { useState } from 'react';
import { PROFILE, LANGUAGES_SPOKEN } from '../data/portfolioData';

export const HeroProfileSpecimen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stack' | 'skills' | 'languages'>('stack');
  const [showGrid, setShowGrid] = useState<boolean>(true);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
      {/* Subtle architectural grid background */}
      {showGrid && (
        <svg
          className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="aryan-swiss-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#E4E4E7" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#aryan-swiss-grid)" />
        </svg>
      )}

      {/* Top Interactive Controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-zinc-200/80">
        <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('stack')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'stack'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            Tech Stack
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'skills'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            Top Skills
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('languages')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'languages'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            Languages
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowGrid((prev) => !prev)}
          className="px-3 py-1.5 text-xs font-mono text-zinc-600 hover:text-zinc-950 border border-zinc-200 rounded-lg bg-white/90 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Grid: {showGrid ? 'On' : 'Off'}
        </button>
      </div>

      {/* Center Content Area */}
      <div className="relative z-10 my-auto py-6">
        {activeTab === 'stack' && (
          <div className="space-y-5">
            <div className="border-b border-zinc-200/80 pb-4">
              <div className="text-xs font-mono text-zinc-500 mb-1">
                PROGRAMMING &amp; DATA SCIENCE
              </div>
              <p className="text-sm font-medium text-zinc-900 leading-relaxed">
                C++ · Python · DSA · Pandas · NumPy · Scikit-Learn · Matplotlib · Seaborn
              </p>
            </div>

            <div className="border-b border-zinc-200/80 pb-4">
              <div className="text-xs font-mono text-zinc-500 mb-1">
                FULL STACK WEB DEVELOPMENT
              </div>
              <p className="text-sm font-medium text-zinc-900 leading-relaxed">
                HTML · CSS · JavaScript · TypeScript · React · Node · Express · Next
              </p>
            </div>

            <div>
              <div className="text-xs font-mono text-zinc-500 mb-1">
                CORE ENGINEERING MAJOR
              </div>
              <p className="text-sm font-medium text-zinc-900">
                Bachelor of Technology (BTech), Electrical Engineering — NIT Silchar (&apos;29)
              </p>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div className="text-xs font-mono text-zinc-500">
              TOP SKILLS · VERIFIED PROFILE
            </div>

            <div className="divide-y divide-zinc-200 border-y border-zinc-200">
              {PROFILE.topSkills.map((skill, index) => (
                <div
                  key={skill}
                  className="py-3.5 flex items-baseline justify-between gap-4"
                >
                  <span className="font-sans text-sm font-semibold text-zinc-950">
                    {skill}
                  </span>
                  <span className="font-mono text-xs text-zinc-500 tabular-nums">
                    0{index + 1}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed pt-1">
              Focused on building a strong foundation across Machine Learning, Data Science, Full Stack Development, and Electrical Engineering.
            </p>
          </div>
        )}

        {activeTab === 'languages' && (
          <div className="space-y-4">
            <div className="text-xs font-mono text-zinc-500">
              SPOKEN LANGUAGES
            </div>

            <div className="divide-y divide-zinc-200 border-y border-zinc-200">
              {LANGUAGES_SPOKEN.map((item) => (
                <div
                  key={item.language}
                  className="py-3.5 flex items-baseline justify-between gap-4"
                >
                  <span className="font-sans text-sm font-semibold text-zinc-950">
                    {item.language}
                  </span>
                  <span className="font-mono text-xs text-zinc-600">
                    {item.proficiency}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-1 text-xs font-mono text-zinc-500">
              LOCATION: SILCHAR, ASSAM, INDIA
            </div>
          </div>
        )}
      </div>

      {/* Bottom Caption */}
      <div className="relative z-10 pt-4 border-t border-zinc-200/80 flex items-center justify-between text-xs font-mono text-zinc-500 tabular-nums">
        <span>ARYAN DAS · NIT SILCHAR &apos;29</span>
        <span>GSA 2026 · CS50X</span>
      </div>
    </div>
  );
};
