import React from 'react';

export interface SkillItem {
  id: string;
  name: string;
  category: string;
  Icon: React.FC<{ className?: string }>;
}

/* ============================================================================
   1. PROGRAMMING LANGUAGES (C, C++, C#, Python, Kotlin, JavaScript, TypeScript)
============================================================================ */

export const CIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 2L3.5 7V17L12 22L20.5 17V7L12 2Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <path
      d="M14.8 9.2C14.1 8.3 13.1 7.8 11.9 7.8C9.6 7.8 7.9 9.6 7.9 12C7.9 14.4 9.6 16.2 11.9 16.2C13.1 16.2 14.1 15.7 14.8 14.8"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

export const CppIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 2L3.5 7V17L12 22L20.5 17V7L12 2Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <path
      d="M11.2 9.4C10.6 8.6 9.8 8.2 8.8 8.2C6.9 8.2 5.6 9.8 5.6 12C5.6 14.2 6.9 15.8 8.8 15.8C9.8 15.8 10.6 15.4 11.2 14.6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M13.8 10.4V13.6M12.2 12H15.4M17.6 10.4V13.6M16 12H19.2"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
    />
  </svg>
);

export const CSharpIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 2L3.5 7V17L12 22L20.5 17V7L12 2Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <path
      d="M11.4 9.4C10.8 8.6 9.9 8.2 8.9 8.2C7 8.2 5.7 9.8 5.7 12C5.7 14.2 7 15.8 8.9 15.8C9.9 15.8 10.8 15.4 11.4 14.6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M14.4 9.6L13.8 14.4M17.2 9.6L16.6 14.4M13.1 11.1H18.1M12.9 13H17.9"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
    />
  </svg>
);

export const PythonIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M11.914 0C5.82 0 6.2 2.656 6.2 2.656l.007 2.752h5.814v.826H3.9S0 5.789 0 11.969c0 6.18 3.403 5.96 3.403 5.96h2.03v-2.867s-.109-3.42 3.35-3.42h5.766s3.24.052 3.24-3.148V3.202S18.28 0 11.914 0zM8.708 1.85c.578 0 1.046.47 1.046 1.052 0 .581-.468 1.051-1.046 1.051-.579 0-1.046-.47-1.046-1.051 0-.582.467-1.052 1.046-1.052z" />
    <path d="M12.086 24c6.094 0 5.714-2.656 5.714-2.656l-.007-2.752h-5.814v-.826h8.121S24 18.211 24 12.031c0-6.18-3.403-5.96-3.403-5.96h-2.03v2.867s.109 3.42-3.35 3.42H9.451s-3.24-.052-3.24 3.148v5.292S5.72 24 12.086 24zm3.206-1.85c-.578 0-1.046-.47-1.046-1.052 0-.581.468-1.051 1.046-1.051.579 0 1.046.47 1.046 1.051 0 .582-.467 1.052-1.046 1.052z" />
  </svg>
);

export const KotlinIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M2 2H22L12 12L22 22H2V2Z" />
  </svg>
);

export const JavaScriptIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="2.5" y="2.5" width="19" height="19" rx="3.5" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M11.2 11.2V16.6C11.2 17.8 10.4 18.5 9.2 18.5C8.3 18.5 7.6 18 7.3 17.3"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
    />
    <path
      d="M17.8 12.2C17.4 11.5 16.7 11.1 15.8 11.1C14.7 11.1 13.9 11.7 13.9 12.6C13.9 13.6 14.7 14 16 14.5C17.3 15 18.1 15.5 18.1 16.7C18.1 17.9 17.1 18.6 15.7 18.6C14.5 18.6 13.6 18 13.2 17.1"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
    />
  </svg>
);

export const TypeScriptIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="2.5" y="2.5" width="19" height="19" rx="3.5" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M6.8 11.2H12.2M9.5 11.2V18.4"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
    />
    <path
      d="M18 12.2C17.6 11.5 16.9 11.1 16 11.1C14.9 11.1 14.1 11.7 14.1 12.6C14.1 13.6 14.9 14 16.2 14.5C17.5 15 18.3 15.5 18.3 16.7C18.3 17.9 17.3 18.6 15.9 18.6C14.7 18.6 13.8 18 13.4 17.1"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
    />
  </svg>
);

/* ============================================================================
   2. WEB TECHNOLOGIES (HTML5, CSS3, TailwindCSS)
============================================================================ */

export const Html5Icon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M4 2L5.6 19.6L12 22L18.4 19.6L20 2H4Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <path
      d="M16 6.5H8.2L8.6 11H15.4L14.9 16.2L12 17.1L9.1 16.2L8.9 14"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Css3Icon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M4 2L5.6 19.6L12 22L18.4 19.6L20 2H4Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <path
      d="M8.2 6.5H15.8L15.4 11H9.2M15.4 11L14.9 16.2L12 17.1L9.1 16.2L8.9 14"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const TailwindIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z" />
  </svg>
);

/* ============================================================================
   3. FRAMEWORKS & LIBRARIES (Node.js, Express.js, React, Next.js)
============================================================================ */

export const NodeJsIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 2L3.5 7V17L12 22L20.5 17V7L12 2Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <path
      d="M9 15V9L15 15V9"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ExpressIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M3.5 12H10.5C10.5 9.5 8.9 8 6.9 8C4.8 8 3.3 9.7 3.3 12C3.3 14.4 4.9 16 7.1 16C8.6 16 9.8 15.3 10.3 14.2"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.5 8.5L20.5 15.5M20.5 8.5L13.5 15.5"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
    />
  </svg>
);

export const ReactIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="2.1" fill="currentColor" />
    <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.65" />
    <ellipse
      cx="12"
      cy="12"
      rx="10"
      ry="4.2"
      transform="rotate(60 12 12)"
      stroke="currentColor"
      strokeWidth="1.65"
    />
    <ellipse
      cx="12"
      cy="12"
      rx="10"
      ry="4.2"
      transform="rotate(120 12 12)"
      stroke="currentColor"
      strokeWidth="1.65"
    />
  </svg>
);

export const NextJsIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M8.5 16V8L16.8 18.8M15.5 8V13.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ============================================================================
   4. PYTHON & ML LIBRARIES (PyTorch, NumPy, Pandas, Matplotlib, Seaborn, SciPy, Scikit-Learn)
============================================================================ */

export const PyTorchIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12.005 0L4.952 7.053a9.865 9.865 0 000 13.952c3.852 3.852 10.104 3.852 13.952 0 3.852-3.852 3.852-10.1 0-13.952l-1.76 1.76c2.88 2.88 2.88 7.55 0 10.43-2.88 2.88-7.55 2.88-10.43 0-2.88-2.88-2.88-7.55 0-10.43l5.291-5.291V0zm3.59 4.148a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" />
  </svg>
);

export const NumPyIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 2.2L3.5 7V17L12 21.8L20.5 17V7L12 2.2Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <path
      d="M3.5 7L12 11.8L20.5 7M12 11.8V21.8"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinejoin="round"
    />
  </svg>
);

export const PandasIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="4.5" y="3" width="2.8" height="18" rx="1" />
    <rect x="9.2" y="3" width="2.8" height="5.5" rx="1" />
    <rect x="9.2" y="10.2" width="2.8" height="3.6" rx="0.8" />
    <rect x="9.2" y="15.5" width="2.8" height="5.5" rx="1" />
    <rect x="14" y="5" width="2.8" height="6" rx="1" />
    <rect x="14" y="13" width="2.8" height="6" rx="1" />
    <rect x="18.2" y="3" width="2.3" height="18" rx="1" />
  </svg>
);

/**
 * Official Matplotlib Polar / Radar Plot Emblem
 */
export const MatplotlibIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Outer and inner concentric polar rings */}
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.65" />
    <circle cx="12" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.15" strokeOpacity="0.65" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.15" strokeOpacity="0.65" />
    {/* Polar axes */}
    <path
      d="M12 2.5V21.5M2.5 12H21.5M5.3 5.3L18.7 18.7M18.7 5.3L5.3 18.7"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeOpacity="0.55"
    />
    {/* Filled radar wedges characteristic of the Matplotlib logo */}
    <path
      d="M12 12L17.8 6.2A8.2 8.2 0 0 1 20.1 10.6L12 12Z"
      fill="currentColor"
    />
    <path
      d="M12 12L5.6 9.2A7 7 0 0 1 8.8 5.8L12 12Z"
      fill="currentColor"
    />
    <path
      d="M12 12L9.2 17.5A6.2 6.2 0 0 1 6.2 14.2L12 12Z"
      fill="currentColor"
    />
  </svg>
);

/**
 * Official Seaborn KDE / Wave Distribution Emblem
 */
export const SeabornIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.65" />
    {/* Three layered Gaussian / KDE wave curves */}
    <path
      d="M3.5 14.5C5.8 14.5 7.2 8.2 10.2 8.2C13.2 8.2 14.2 13.8 17 13.8C18.5 13.8 19.6 12.6 20.6 11.8"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <path
      d="M4.2 16.8C7.2 16.8 9.2 11.2 12.6 11.2C15.6 11.2 17 15.8 19.8 15.8"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
    />
    <path
      d="M6.2 18.8C9 18.8 11.2 14.6 14.4 14.6C16.5 14.6 17.8 17.2 18.8 17.6"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Official SciPy Circle & S-Curve Snake Logo
 */
export const SciPyIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.75" />
    {/* Characteristic SciPy sinusoidal S-curve from bottom-left to top-right */}
    <path
      d="M5.4 18.2C6.8 14.8 11.8 16.8 13.5 13.6C15.2 10.4 9.2 10.6 10.8 7.5C12.1 5.1 16.2 6.2 18.2 7.2"
      stroke="currentColor"
      strokeWidth="2.15"
      strokeLinecap="round"
    />
    {/* Forked snake tongue / arrow tip at top-right */}
    <path
      d="M17.2 5.4L19 7.5L16.4 8.2"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Official Scikit-Learn Orbital "sk" Logo
 */
export const ScikitLearnIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Large lower-left filled orbital node */}
    <circle cx="7.2" cy="14.6" r="4.2" fill="currentColor" />
    {/* Upper-right secondary orbital node */}
    <circle cx="15.8" cy="7.8" r="2.8" fill="currentColor" />
    {/* Sweeping orbital arc connecting the two nodes */}
    <path
      d="M3.2 11.2C4.8 6.5 11.2 4.2 17.5 5.6C21.2 6.4 21.8 10.6 18.8 14.2C15.8 17.8 9.8 19.8 5.2 18.2"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

/* ============================================================================
   5. DATABASE (PostgreSQL)
============================================================================ */

export const PostgresIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <ellipse cx="12" cy="5.5" rx="7.5" ry="3" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M4.5 5.5V12C4.5 13.66 7.86 15 12 15C16.14 15 19.5 13.66 19.5 12V5.5"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <path
      d="M4.5 12V18.5C4.5 20.16 7.86 21.5 12 21.5C16.14 21.5 19.5 20.16 19.5 18.5V12"
      stroke="currentColor"
      strokeWidth="1.75"
    />
  </svg>
);

/* ============================================================================
   6. TOOLS (Git, GitHub, VS Code — Official Vector Logo)
============================================================================ */

export const GitIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M10.6 2.8C11.4 2 12.6 2 13.4 2.8L21.2 10.6C22 11.4 22 12.6 21.2 13.4L13.4 21.2C12.6 22 11.4 22 10.6 21.2L2.8 13.4C2 12.6 2 11.4 2.8 10.6L10.6 2.8Z"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <path d="M9.2 6.2L15.2 12.2M12 9V15.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <circle cx="12" cy="9" r="1.6" fill="currentColor" />
    <circle cx="15.2" cy="12.2" r="1.6" fill="currentColor" />
    <circle cx="12" cy="15.5" r="1.6" fill="currentColor" />
  </svg>
);

export const GitHubSkillIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

/**
 * Official Visual Studio Code Ribbon Logo
 */
export const VsCodeIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
  </svg>
);

/* ============================================================================
   7. DESIGN & CREATIVE TOOLS (Photoshop, Lightroom, Premiere Pro, Figma — Canva Removed)
============================================================================ */

export const PhotoshopIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="2.5" y="2.5" width="19" height="19" rx="4" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M7 16.5V7.5H10C11.5 7.5 12.4 8.4 12.4 9.8C12.4 11.2 11.5 12.1 10 12.1H7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17.4 11.6C17 11.1 16.4 10.9 15.7 10.9C14.8 10.9 14.1 11.3 14.1 12C14.1 12.8 14.8 13.1 15.8 13.5C16.8 13.8 17.5 14.2 17.5 15.1C17.5 16 16.7 16.6 15.6 16.6C14.7 16.6 14 16.2 13.6 15.6"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

export const LightroomIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="2.5" y="2.5" width="19" height="19" rx="4" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M7.2 7.5V16.5H12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.2 16.5V11M14.2 12.6C14.7 11.4 15.6 10.9 16.8 10.9"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const PremiereProIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="2.5" y="2.5" width="19" height="19" rx="4" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M7.2 16.5V7.5H10.2C11.7 7.5 12.6 8.4 12.6 9.8C12.6 11.2 11.7 12.1 10.2 12.1H7.2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.6 16.5V11M14.6 12.6C15.1 11.4 16 10.9 17.2 10.9"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const FigmaIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M9 2.5H12V8.5H9C7.34 8.5 6 7.16 6 5.5C6 3.84 7.34 2.5 9 2.5Z"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <path
      d="M12 2.5H15C16.66 2.5 18 3.84 18 5.5C18 7.16 16.66 8.5 15 8.5H12V2.5Z"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <path
      d="M9 8.5H12V14.5H9C7.34 14.5 6 13.16 6 11.5C6 9.84 7.34 8.5 9 8.5Z"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <circle cx="15" cy="11.5" r="3" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M9 14.5H12V17.5C12 19.16 10.66 20.5 9 20.5C7.34 20.5 6 19.16 6 17.5C6 15.84 7.34 14.5 9 14.5Z"
      stroke="currentColor"
      strokeWidth="1.75"
    />
  </svg>
);

export const ALL_SKILLS: SkillItem[] = [
  // Programming Languages (7)
  { id: 'c', name: 'C', category: 'Programming Languages', Icon: CIcon },
  { id: 'cpp', name: 'C++', category: 'Programming Languages', Icon: CppIcon },
  { id: 'csharp', name: 'C#', category: 'Programming Languages', Icon: CSharpIcon },
  { id: 'python', name: 'Python', category: 'Programming Languages', Icon: PythonIcon },
  { id: 'kotlin', name: 'Kotlin', category: 'Programming Languages', Icon: KotlinIcon },
  { id: 'javascript', name: 'JavaScript', category: 'Programming Languages', Icon: JavaScriptIcon },
  { id: 'typescript', name: 'TypeScript', category: 'Programming Languages', Icon: TypeScriptIcon },

  // Web Technologies (3)
  { id: 'html5', name: 'HTML5', category: 'Web Technologies', Icon: Html5Icon },
  { id: 'css3', name: 'CSS3', category: 'Web Technologies', Icon: Css3Icon },
  { id: 'tailwindcss', name: 'TailwindCSS', category: 'Web Technologies', Icon: TailwindIcon },

  // Frameworks & Libraries (4)
  { id: 'nodejs', name: 'Node.js', category: 'Frameworks & Libraries', Icon: NodeJsIcon },
  { id: 'expressjs', name: 'Express.js', category: 'Frameworks & Libraries', Icon: ExpressIcon },
  { id: 'react', name: 'React', category: 'Frameworks & Libraries', Icon: ReactIcon },
  { id: 'nextjs', name: 'Next.js', category: 'Frameworks & Libraries', Icon: NextJsIcon },

  // Python Libraries (7)
  { id: 'pytorch', name: 'PyTorch', category: 'Python Libraries', Icon: PyTorchIcon },
  { id: 'numpy', name: 'NumPy', category: 'Python Libraries', Icon: NumPyIcon },
  { id: 'pandas', name: 'Pandas', category: 'Python Libraries', Icon: PandasIcon },
  { id: 'matplotlib', name: 'Matplotlib', category: 'Python Libraries', Icon: MatplotlibIcon },
  { id: 'seaborn', name: 'Seaborn', category: 'Python Libraries', Icon: SeabornIcon },
  { id: 'scipy', name: 'SciPy', category: 'Python Libraries', Icon: SciPyIcon },
  { id: 'scikitlearn', name: 'Scikit-Learn', category: 'Python Libraries', Icon: ScikitLearnIcon },

  // Database (1)
  { id: 'postgresql', name: 'PostgreSQL', category: 'Database', Icon: PostgresIcon },

  // Tools (3)
  { id: 'git', name: 'Git', category: 'Tools', Icon: GitIcon },
  { id: 'github', name: 'GitHub', category: 'Tools', Icon: GitHubSkillIcon },
  { id: 'vscode', name: 'VS Code', category: 'Tools', Icon: VsCodeIcon },

  // Design & Creative Tools (4 — Canva Removed)
  { id: 'photoshop', name: 'Photoshop', category: 'Design & Creative Tools', Icon: PhotoshopIcon },
  { id: 'lightroom', name: 'Lightroom', category: 'Design & Creative Tools', Icon: LightroomIcon },
  { id: 'premierepro', name: 'Premiere Pro', category: 'Design & Creative Tools', Icon: PremiereProIcon },
  { id: 'figma', name: 'Figma', category: 'Design & Creative Tools', Icon: FigmaIcon },
];
