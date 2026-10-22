export interface CertificationItem {
  id: string;
  index: string;
  title: string;
  issuer: string;
  category: 'Computer Science' | 'Data Science & ML' | 'Full Stack & AI';
  summary: string;
  focusAreas: string[];
}

export interface ProjectPortfolioItem {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  stack: string;
  description: string;
  url: string;
  linkLabel: string;
}

export interface FocusDomainItem {
  index: string;
  title: string;
  subtitle: string;
  description: string;
  technologies: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  field: string;
  period: string;
  location: string;
}

export interface ExperienceItem {
  role: string;
  organization: string;
  period: string;
  duration: string;
  location: string;
}

export interface LanguageItem {
  language: string;
  proficiency: string;
}

export interface ExternalLinkItem {
  label: string;
  handle: string;
  url: string;
  category: string;
}

export const PROFILE = {
  name: 'Aryan Das',
  headline:
    'EE @ NIT Silchar | Aspiring Data Scientist & ML Engineer | Programmer | Developer | CS50x | GSA 2026',
  shortTagline:
    "C++ | Python | DSA | AI / ML | CS50x — Harvard | Associate Data Scientist | NIT Silchar '29",
  location: 'Silchar, Assam, India',
  email: 'aryandas.original@gmail.com',
  pdfPath: '/assets/resume/Aryan_Das_Resume.pdf',
  summaryParagraphs: [
    "I'm Aryan Das and I'm from India. I just finished my 1st year of engineering majors in Electrical at NIT Silchar. I'm currently learning to code—not an expert yet, but picking up languages to enhance my future vision and prospects.",
    'That includes C++ and Python with libraries like Pandas, NumPy, Scikit-Learn, Matplotlib, and Seaborn, along with HTML, CSS, JavaScript, TypeScript, and frameworks like React, Node, Express, and Next... These languages are helping me a lot in building a strong foundation in Machine Learning, Data Science, and Full Stack Development... I plan to solve real-world problems and build useful solutions with my tech stack, and also create solutions in my core electrical field...',
    'I hold a CS50x certification from Harvard University and an Associate Data Scientist certification from DataCamp. I mention them not to impress, but because they represent a particular quality of attention — the kind that sits with a problem until the problem yields. I do not rush. Consistency, to my mind, is the only strategy that compounds. I am always glad to connect with those who build carefully and think rigorously.',
  ],
  quote:
    'Consistency, to my mind, is the only strategy that compounds. I am always glad to connect with those who build carefully and think rigorously.',
  topSkills: [
    'Data Privacy / Cryptography',
    'Java Native Interface (JNI)',
    'Artificial Intelligence / AI Integration',
  ],
};

export const EXTERNAL_LINKS: ExternalLinkItem[] = [
  {
    label: 'LinkedIn',
    handle: 'linkedin.com/in/iam-aryandas',
    url: 'https://www.linkedin.com/in/iam-aryandas',
    category: 'Professional Network',
  },
  {
    label: 'GitHub',
    handle: 'github.com/aryandas079',
    url: 'https://github.com/aryandas079',
    category: 'Portfolio & Repositories',
  },
  {
    label: 'Personal Website',
    handle: 'aryandas079.github.io/my_website',
    url: 'https://aryandas079.github.io/my_website/',
    category: 'Personal Site',
  },
  {
    label: 'Google Developer Profile',
    handle: 'g.dev/dasaryan',
    url: 'https://g.dev/dasaryan',
    category: 'Developer Profile',
  },
];

export const PORTFOLIO_PROJECTS: ProjectPortfolioItem[] = [
  {
    id: 'github-portfolio',
    index: '01',
    title: 'GitHub Code & Project Portfolio',
    subtitle: 'Open-source repositories, C++ / DSA implementations & Python ML notebooks',
    stack: 'C++ · Python · Pandas · NumPy · Scikit-Learn · Matplotlib · Seaborn',
    description:
      'Central repository of Aryan Das’s programming projects, CS50x problem sets, data science explorations, and full-stack web experiments.',
    url: 'https://github.com/aryandas079',
    linkLabel: 'github.com/aryandas079',
  },
  {
    id: 'personal-web-portal',
    index: '02',
    title: 'Personal Web Portfolio',
    subtitle: 'Full-stack & frontend web development showcase hosted on GitHub Pages',
    stack: 'HTML · CSS · JavaScript · TypeScript · React · Node · Express · Next',
    description:
      'Personal web presence and interactive frontend builds exploring modern web standards and full-stack development.',
    url: 'https://aryandas079.github.io/my_website/',
    linkLabel: 'aryandas079.github.io/my_website',
  },
  {
    id: 'google-dev-profile',
    index: '03',
    title: 'Google Developer & GSA 2026 Profile',
    subtitle: 'Verified Google Developer badges, AI/ML learning pathways & community work',
    stack: 'Artificial Intelligence · AI Integration · Data Privacy / Cryptography',
    description:
      'Official Google Developer profile documenting technical badges, AI fluency credentials, and Google Student Ambassador (GSA 2026) milestones.',
    url: 'https://g.dev/dasaryan',
    linkLabel: 'g.dev/dasaryan',
  },
];

export const EXPERIENCE_LIST: ExperienceItem[] = [
  {
    role: 'Google Student Ambassador',
    organization: 'Google Student Ambassador',
    period: 'July 2026 — October 2026',
    duration: '4 months',
    location: 'India',
  },
];

export const EDUCATION_LIST: EducationItem[] = [
  {
    institution: 'National Institute of Technology Silchar',
    degree: 'Bachelor of Technology - BTech',
    field: 'Electrical Engineering',
    period: 'August 2025 — September 2029',
    location: 'Silchar, Assam, India',
  },
  {
    institution: 'Gurucharan College (GC College), Silchar',
    degree: 'Higher Secondary (Class 11 & 12)',
    field: 'Science, Physics, Chemistry and Mathematics',
    period: 'August 2023 — March 2025',
    location: 'Silchar, Assam, India',
  },
];

export const CERTIFICATIONS: CertificationItem[] = [
  {
    id: 'cs50x-harvard',
    index: '01',
    title: 'CS50x',
    issuer: 'Harvard University',
    category: 'Computer Science',
    summary:
      'Foundational computer science certification from Harvard University representing rigorous problem-solving, algorithmic thinking, and low-level to web programming.',
    focusAreas: ['C++ & C Fundamentals', 'Data Structures & Algorithms (DSA)', 'Problem Solving'],
  },
  {
    id: 'data-scientist-associate',
    index: '02',
    title: 'Data Scientist Associate',
    issuer: 'DataCamp',
    category: 'Data Science & ML',
    summary:
      'Associate Data Scientist certification validating foundations in statistical analysis, exploratory data analysis, and predictive modeling in Python.',
    focusAreas: ['Python', 'Pandas & NumPy', 'Scikit-Learn', 'Matplotlib & Seaborn'],
  },
  {
    id: 'ml-specialization',
    index: '03',
    title: 'Machine Learning Specialization',
    issuer: 'Verified Certification',
    category: 'Data Science & ML',
    summary:
      'Comprehensive training in supervised and unsupervised machine learning workflows, model evaluation, and applied AI.',
    focusAreas: ['Machine Learning', 'Scikit-Learn', 'Artificial Intelligence / AI Integration'],
  },
  {
    id: 'full-stack-certification',
    index: '04',
    title: 'Full Stack Development Certification',
    issuer: 'Verified Certification',
    category: 'Full Stack & AI',
    summary:
      'End-to-end web application development across modern frontend and backend JavaScript and TypeScript ecosystems.',
    focusAreas: ['HTML, CSS, JavaScript, TypeScript', 'React & Next.js', 'Node.js & Express'],
  },
  {
    id: 'ai-fluency-students',
    index: '05',
    title: 'AI Fluency for students',
    issuer: 'Verified Certification',
    category: 'Full Stack & AI',
    summary:
      'Foundational fluency in modern artificial intelligence concepts, responsible AI integration, and practical student applications.',
    focusAreas: ['Artificial Intelligence', 'AI Integration'],
  },
];

export const FOCUS_DOMAINS: FocusDomainItem[] = [
  {
    index: '01',
    title: 'Data Science & Machine Learning',
    subtitle: 'Analytical modeling & visual data exploration in Python',
    description:
      'Building a strong foundation in Machine Learning and Data Science using Python and its core scientific ecosystem to analyze data and solve real-world problems.',
    technologies: [
      'Python',
      'Pandas',
      'NumPy',
      'Scikit-Learn',
      'Matplotlib',
      'Seaborn',
      'AI / ML',
    ],
  },
  {
    index: '02',
    title: 'Full Stack Web Development',
    subtitle: 'Modern frontend interfaces & server-side web frameworks',
    description:
      'Developing clean, functional web applications using core web standards, strongly typed JavaScript, and modern full-stack frameworks.',
    technologies: [
      'HTML',
      'CSS',
      'JavaScript',
      'TypeScript',
      'React',
      'Node',
      'Express',
      'Next',
    ],
  },
  {
    index: '03',
    title: 'Core Programming, Systems & Electrical Engineering',
    subtitle: 'EE @ NIT Silchar · Algorithmic rigor & specialized top skills',
    description:
      'Combining core Electrical Engineering studies at NIT Silchar (Batch of 2029) with C++, Data Structures & Algorithms, and specialized exploration in cryptography and native interfaces.',
    technologies: [
      'Electrical Engineering (NIT Silchar)',
      'C++',
      'DSA',
      'Data Privacy / Cryptography',
      'Java Native Interface (JNI)',
      'Artificial Intelligence / AI Integration',
    ],
  },
];

export const LANGUAGES_SPOKEN: LanguageItem[] = [
  {
    language: 'Bengali',
    proficiency: 'Native or Bilingual',
  },
  {
    language: 'English',
    proficiency: 'Full Professional',
  },
  {
    language: 'German',
    proficiency: 'Elementary',
  },
];
