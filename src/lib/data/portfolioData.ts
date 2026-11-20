export type StackCategory = 'all' | 'languages' | 'fullstack' | 'aiml' | 'foundations';
export type SceneChapterId = 'hero' | 'about' | 'stack' | 'github' | 'works';

export interface TechSkill {
  id: string;
  name: string;
  category: Exclude<StackCategory, 'all'>;
  categoryLabel: string;
  proficiencyPct: number;
  projectsCount: number;
  context: string;
}

export interface SocialLink {
  id: string;
  label: string;
  handle: string;
  href: string;
  category: string;
}

export interface LanguageMetric {
  name: string;
  sharePct: number;
  commits: number;
  primaryUse: string;
}

export const ARYAN_PROFILE = {
  name: 'Aryan Das',
  headline: 'Engineer & Developer',
  degree: 'B.Tech in Electrical Engineering',
  institution: 'National Institute of Technology, Silchar',
  location: 'Silchar, Assam, India',
  role: 'Engineering Student & Developer',
  email: 'dasaryan715@gmail.com',
  githubUser: 'aryandas079',
  orcid: '0009-0009-9012-4034',
  quote: 'The only way to do great work is to love what you do.',
  quoteAuthor: 'Steve Jobs',
  typingLines: [
    'Electrical Engineering Undergraduate',
    'Full Stack Developer',
    'Machine Learning Explorer',
    'Building with AI',
  ],
  currentlyLearning: [
    'Data Structures & Algorithms (C++)',
    'Artificial Intelligence & Machine Learning',
    'Full-Stack Web Development',
    'Software Engineering Principles',
  ],
  gainingExpertiseOn: [
    'Machine Learning',
    'Data Science',
    'Full Stack Development',
  ],
  interests: [
    'Artificial Intelligence',
    'Generative AI',
    'Data Science & Analytics',
    'Full Stack Development',
    'UI/UX & Creative Design',
  ],
};

export const TECH_SKILLS: TechSkill[] = [
  // Programming Languages
  {
    id: 'cpp',
    name: 'C++',
    category: 'languages',
    categoryLabel: 'Programming Languages',
    proficiencyPct: 92,
    projectsCount: 18,
    context: 'Data Structures & Algorithms, competitive problem solving, and low-latency systems.',
  },
  {
    id: 'python',
    name: 'Python',
    category: 'languages',
    categoryLabel: 'Programming Languages',
    proficiencyPct: 90,
    projectsCount: 16,
    context: 'Machine learning pipelines, scientific computing, and data analytics.',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    category: 'languages',
    categoryLabel: 'Programming Languages',
    proficiencyPct: 88,
    projectsCount: 14,
    context: 'Type-safe full-stack web applications, 3D WebGL interfaces, and API design.',
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    category: 'languages',
    categoryLabel: 'Programming Languages',
    proficiencyPct: 91,
    projectsCount: 22,
    context: 'Interactive frontend engineering, asynchronous runtime logic, and DOM choreography.',
  },
  {
    id: 'c',
    name: 'C',
    category: 'languages',
    categoryLabel: 'Programming Languages',
    proficiencyPct: 85,
    projectsCount: 11,
    context: 'Embedded microcontroller programming, memory management, and EE numerical methods.',
  },
  {
    id: 'csharp',
    name: 'C#',
    category: 'languages',
    categoryLabel: 'Programming Languages',
    proficiencyPct: 78,
    projectsCount: 7,
    context: 'Object-oriented application architecture and desktop/simulation tooling.',
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    category: 'languages',
    categoryLabel: 'Programming Languages',
    proficiencyPct: 80,
    projectsCount: 8,
    context: 'Modern Android and cross-platform mobile application development.',
  },

  // Full-Stack & Web Technologies
  {
    id: 'react',
    name: 'React',
    category: 'fullstack',
    categoryLabel: 'Web & Full-Stack',
    proficiencyPct: 90,
    projectsCount: 15,
    context: 'Component-driven UI engineering, state management, and interactive dashboards.',
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    category: 'fullstack',
    categoryLabel: 'Web & Full-Stack',
    proficiencyPct: 87,
    projectsCount: 11,
    context: 'Hybrid SSR/SSG web applications, route handlers, and full-stack product delivery.',
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    category: 'fullstack',
    categoryLabel: 'Web & Full-Stack',
    proficiencyPct: 88,
    projectsCount: 14,
    context: 'Scalable backend services, RESTful APIs, and real-time event pipelines.',
  },
  {
    id: 'expressjs',
    name: 'Express.js',
    category: 'fullstack',
    categoryLabel: 'Web & Full-Stack',
    proficiencyPct: 89,
    projectsCount: 13,
    context: 'Middleware routing, authentication layers, and microservice orchestration.',
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    category: 'fullstack',
    categoryLabel: 'Web & Full-Stack',
    proficiencyPct: 84,
    projectsCount: 10,
    context: 'Relational schema design, indexed analytical queries, and ACID persistence.',
  },
  {
    id: 'tailwindcss',
    name: 'Tailwind CSS',
    category: 'fullstack',
    categoryLabel: 'Web & Full-Stack',
    proficiencyPct: 94,
    projectsCount: 20,
    context: 'Design-system tokens, responsive grid architecture, and minimalist UI styling.',
  },
  {
    id: 'html-css',
    name: 'HTML5 & CSS3',
    category: 'fullstack',
    categoryLabel: 'Web & Full-Stack',
    proficiencyPct: 95,
    projectsCount: 25,
    context: 'Semantic accessibility, modern layout engines, and hardware-accelerated motion.',
  },

  // AI / ML & Data Science Libraries
  {
    id: 'scikit-learn',
    name: 'Scikit-Learn',
    category: 'aiml',
    categoryLabel: 'AI / ML & Data Science',
    proficiencyPct: 86,
    projectsCount: 9,
    context: 'Supervised and unsupervised learning, feature pipelines, and model evaluation.',
  },
  {
    id: 'numpy',
    name: 'NumPy',
    category: 'aiml',
    categoryLabel: 'AI / ML & Data Science',
    proficiencyPct: 91,
    projectsCount: 15,
    context: 'Vectorized matrix computation, linear algebra, and signal processing.',
  },
  {
    id: 'pandas',
    name: 'Pandas',
    category: 'aiml',
    categoryLabel: 'AI / ML & Data Science',
    proficiencyPct: 90,
    projectsCount: 14,
    context: 'Time-series cleaning, tabular data wrangling, and exploratory feature engineering.',
  },
  {
    id: 'scipy',
    name: 'SciPy',
    category: 'aiml',
    categoryLabel: 'AI / ML & Data Science',
    proficiencyPct: 83,
    projectsCount: 8,
    context: 'Differential equations, Fourier transforms, and electrical system optimization.',
  },
  {
    id: 'matplotlib-seaborn',
    name: 'Matplotlib & Seaborn',
    category: 'aiml',
    categoryLabel: 'AI / ML & Data Science',
    proficiencyPct: 89,
    projectsCount: 13,
    context: 'Statistical visualization, correlation heatmaps, and model diagnostics.',
  },

  // Engineering Foundations
  {
    id: 'dsa-cpp',
    name: 'DSA in C++',
    category: 'foundations',
    categoryLabel: 'Core Engineering',
    proficiencyPct: 91,
    projectsCount: 340,
    context: 'Trees, graphs, dynamic programming, and algorithmic complexity optimization.',
  },
  {
    id: 'electrical-eng',
    name: 'Electrical Systems (NIT Silchar)',
    category: 'foundations',
    categoryLabel: 'Core Engineering',
    proficiencyPct: 88,
    projectsCount: 12,
    context: 'Circuit analysis, power systems, signal processing, and control theory.',
  },
  {
    id: 'ui-ux',
    name: 'UI/UX & Creative Design',
    category: 'foundations',
    categoryLabel: 'Core Engineering',
    proficiencyPct: 87,
    projectsCount: 14,
    context: 'Spatial 3D interfaces, typographic hierarchy, and low-latency user flows.',
  },
];

export const LANGUAGE_METRICS: LanguageMetric[] = [
  { name: 'C++', sharePct: 31.4, commits: 418, primaryUse: 'Algorithms & Systems' },
  { name: 'Python', sharePct: 26.8, commits: 356, primaryUse: 'Machine Learning & Data Science' },
  { name: 'TypeScript', sharePct: 19.2, commits: 254, primaryUse: 'Full-Stack Web & 3D UI' },
  { name: 'JavaScript', sharePct: 12.6, commits: 168, primaryUse: 'Node.js & Frontend' },
  { name: 'Kotlin & C#', sharePct: 6.2, commits: 82, primaryUse: 'Mobile & Desktop Tooling' },
  { name: 'C', sharePct: 3.8, commits: 51, primaryUse: 'Embedded & EE Labs' },
];

export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'portfolio',
    label: 'Web Portfolio',
    handle: 'aryandas079.github.io',
    href: 'https://aryandas079.github.io/my_website/',
    category: 'Primary Site',
  },
  {
    id: 'github',
    label: 'GitHub',
    handle: '@aryandas079',
    href: 'https://github.com/aryandas079',
    category: 'Code Repositories',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    handle: 'in/iam-aryandas',
    href: 'https://www.linkedin.com/in/iam-aryandas',
    category: 'Professional Network',
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    handle: '@iam_aryandas',
    href: 'https://x.com/iam_aryandas',
    category: 'Updates & Thoughts',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@iam_aryandas',
    href: 'https://www.instagram.com/iam_aryandas/',
    category: 'Creative Visuals',
  },
  {
    id: 'discord',
    label: 'Discord',
    handle: 'iam_aryandas',
    href: 'https://discord.com/users/iam_aryandas',
    category: 'Direct Community',
  },
  {
    id: 'orcid',
    label: 'ORCID Registry',
    handle: '0009-0009-9012-4034',
    href: 'https://orcid.org/0009-0009-9012-4034',
    category: 'Academic Research',
  },
  {
    id: 'email',
    label: 'Direct Email',
    handle: 'dasaryan715@gmail.com',
    href: 'mailto:dasaryan715@gmail.com',
    category: 'Inquiries',
  },
];
