export type IssuerEmblemId =
  | 'deeplearning'
  | 'datacamp'
  | 'scrimba'
  | 'harvard'
  | 'anthropic'
  | 'microsoft'
  | 'google';

export type ApproachId =
  | 'machine-learning'
  | 'data-science'
  | 'full-stack'
  | 'software-development';

export interface FoundationProfile {
  id: string;
  name: string;
  role: string;
  education: string;
  institutionShort: string;
  location: string;
  orcid: string;
  orcidUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  currentlyLearning: string[];
  gainingExpertiseOn: string[];
  interests: string[];
  languages: string[];
  anchor3D: [number, number, number];
}

export interface ApproachItem {
  id: ApproachId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  accentTone: 'red' | 'white' | 'grey';
  /** 3D anchor coordinates in the neural lattice */
  anchor3D: [number, number, number];
  stackTools: string[];
  focusAreas: string[];
}

export interface CredentialItem {
  id: string;
  title: string;
  shortTitle: string;
  issuer: string;
  issuedLabel: string;
  completionDate: string;
  stampDate: string;
  credentialId?: string;
  verificationUrl: string;
  /** Populate with local image path (e.g. '/assets/certs/ml.png') once actual certificate images are shared */
  certificateImage?: string;
  skills: string;
  skillTags: string[];
  approaches: ApproachId[];
  emblem: IssuerEmblemId;
  inkAccent: string;
  nodeTone: 'red' | 'white' | 'grey';
  /** 3D position within the neural network lattice */
  nodePos3D: [number, number, number];
}

export const FOUNDATION_PROFILE: FoundationProfile = {
  id: 'foundation-nits',
  name: 'Aryan Das',
  role: 'Electrical Engineering Undergraduate · Engineer & Developer',
  education: 'B.Tech in Electrical Engineering, National Institute of Technology (NIT) Silchar',
  institutionShort: 'NIT Silchar · Core',
  location: 'Silchar, Assam, India',
  orcid: '0009-0009-9012-4034',
  orcidUrl: 'https://orcid.org/0009-0009-9012-4034',
  githubUrl: 'https://github.com/aryandas079',
  linkedinUrl: 'https://www.linkedin.com/in/iam-aryandas',
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
    'Creative Softwares',
  ],
  languages: ['C', 'C++', 'C#', 'Python', 'JavaScript', 'TypeScript', 'Kotlin'],
  anchor3D: [0.0, 0.08, 0.38],
};

export const APPROACHES_LIST: ApproachItem[] = [
  {
    id: 'machine-learning',
    name: 'Machine Learning',
    shortName: 'Machine Learning',
    tagline: 'AI/ML fundamentals, neural models & generative AI systems',
    description:
      'Exploring core AI/ML algorithms, supervised and unsupervised models, and modern generative AI integration backed by Python scientific computing.',
    accentTone: 'red',
    anchor3D: [-2.65, 1.48, 0.62],
    stackTools: ['Python', 'Scikit-Learn', 'SciPy', 'Generative AI', 'AI Integration'],
    focusAreas: [
      'AI / ML Fundamentals',
      'Supervised & Unsupervised Learning',
      'Generative AI & Multimodal Models',
      'Responsible AI & Safety',
    ],
  },
  {
    id: 'data-science',
    name: 'Data Science',
    shortName: 'Data Science',
    tagline: 'Analytical modeling, statistical pipelines & visualization',
    description:
      'Building end-to-end analytical workflows in Python—combining numerical computing, statistical inference, and clear visual storytelling.',
    accentTone: 'grey',
    anchor3D: [2.62, 1.54, -0.22],
    stackTools: ['Python', 'NumPy', 'Pandas', 'Matplotlib', 'Seaborn', 'SciPy', 'Scikit-Learn'],
    focusAreas: [
      'Data Science & Analytics',
      'Exploratory Data Visualization',
      'Statistical Modeling & Inference',
      'Numerical Python Pipelines',
    ],
  },
  {
    id: 'full-stack',
    name: 'Full Stack',
    shortName: 'Full Stack',
    tagline: 'Interactive web interfaces, backend APIs & relational data',
    description:
      'Designing and shipping complete full-stack web applications—uniting responsive UI/UX design, modern React/Next.js frontends, Node.js APIs, and PostgreSQL.',
    accentTone: 'red',
    anchor3D: [2.82, -1.36, 0.56],
    stackTools: [
      'TypeScript',
      'JavaScript',
      'React',
      'Next.js',
      'Node.js',
      'Express.js',
      'PostgreSQL',
      'Tailwind CSS',
      'HTML5 / CSS3',
    ],
    focusAreas: [
      'Full-Stack Web Applications',
      'UI/UX & Creative Design',
      'REST APIs & Express Services',
      'PostgreSQL Data Modeling',
    ],
  },
  {
    id: 'software-development',
    name: 'Software Development',
    shortName: 'Software Dev',
    tagline: 'DSA in C++, systems foundations & clean architecture',
    description:
      'Strengthening core computer science foundations through Data Structures & Algorithms in C++, multi-paradigm languages, and disciplined engineering principles.',
    accentTone: 'grey',
    anchor3D: [-2.68, -1.38, -0.18],
    stackTools: ['C', 'C++', 'C#', 'Kotlin', 'Python', 'TypeScript', 'DSA (C++)'],
    focusAreas: [
      'Data Structures & Algorithms (C++)',
      'Software Engineering Principles',
      'Low-Level Systems & Memory',
      'Creative Softwares',
    ],
  },
];

export const CREDENTIALS_LIST: CredentialItem[] = [
  {
    id: 'ml-specialization',
    title: 'Machine Learning Specialization',
    shortTitle: 'ML Specialization',
    issuer: 'DeepLearning.AI, Stanford Online',
    issuedLabel: 'Issued Aug 2026',
    completionDate: 'August 2026',
    stampDate: 'AUG 2026',
    credentialId: 'XKX383ZHB6N5',
    verificationUrl: 'https://www.coursera.org/account/accomplishments/specialization/XKX383ZHB6N5',
    skills: 'Unsupervised Learning, Supervised ML, Neural Networks, AI Integration',
    skillTags: ['Unsupervised Learning', 'Neural Networks', 'Supervised ML', 'AI Integration'],
    approaches: ['machine-learning', 'data-science'],
    emblem: 'deeplearning',
    inkAccent: '#2b4c7e',
    nodeTone: 'white',
    nodePos3D: [-0.32, 2.24, 0.85],
  },
  {
    id: 'data-scientist-associate',
    title: 'Data Scientist Associate',
    shortTitle: 'Data Scientist Assoc.',
    issuer: 'DataCamp',
    issuedLabel: 'Issued Apr 2026 · Expires Apr 2028',
    completionDate: 'April 2026',
    stampDate: 'APR 2026',
    credentialId: 'DSA0010107575598',
    verificationUrl: 'https://www.datacamp.com/certificate/DSA0010107575598',
    skills: 'Machine Learning, Data Science, Python, NumPy, Pandas, Scikit-Learn',
    skillTags: ['Data Science', 'Machine Learning', 'NumPy & Pandas', 'Scikit-Learn'],
    approaches: ['data-science', 'machine-learning'],
    emblem: 'datacamp',
    inkAccent: '#03a84e',
    nodeTone: 'red',
    nodePos3D: [4.45, 0.36, 0.34],
  },
  {
    id: 'fullstack-scrimba',
    title: 'Full Stack Development Certification',
    shortTitle: 'Full Stack Dev',
    issuer: 'Scrimba',
    issuedLabel: 'Issued Jun 2026',
    completionDate: 'June 2026',
    stampDate: 'JUN 2026',
    verificationUrl: 'https://scrimba.com/@aryandas079:certs;cert23wfboWopVEBuf1Ve3KMAgUyUpurY5whpYgn8BoQr2sspJac',
    skills: 'REST API Integration, Full-Stack Development, React, Node.js',
    skillTags: ['Full-Stack Development', 'REST API Integration', 'React & Node.js'],
    approaches: ['full-stack', 'software-development'],
    emblem: 'scrimba',
    inkAccent: '#5046e5',
    nodeTone: 'grey',
    nodePos3D: [0.58, -2.26, 0.78],
  },
  {
    id: 'harvard-cs50x',
    title: 'CS50x: Introduction to Computer Science',
    shortTitle: 'Harvard CS50x',
    issuer: 'Harvard University',
    issuedLabel: 'Issued Feb 2026',
    completionDate: 'February 2026',
    stampDate: 'FEB 2026',
    verificationUrl: 'https://cs50.harvard.edu/certificates',
    skills: 'Data Structures, C Programming, Algorithms, Web & SQL Foundations',
    skillTags: ['Data Structures', 'C Programming', 'Algorithms', 'Web Systems'],
    approaches: ['software-development', 'full-stack', 'data-science'],
    emblem: 'harvard',
    inkAccent: '#a51c30',
    nodeTone: 'red',
    nodePos3D: [-4.42, -0.18, 0.42],
  },
  {
    id: 'anthropic-ai-fluency',
    title: 'AI Fluency for Students',
    shortTitle: 'AI Fluency',
    issuer: 'Anthropic',
    issuedLabel: 'Issued Mar 2026',
    completionDate: 'March 2026',
    stampDate: 'MAR 2026',
    credentialId: '56hptudysjgm',
    verificationUrl: 'https://verify.skilljar.com/c/56hptudysjgm',
    skills: 'AI Ethics, AI Integration, Applied Reasoning, Responsible AI',
    skillTags: ['AI Ethics', 'AI Integration', 'Applied Reasoning'],
    approaches: ['machine-learning', 'software-development'],
    emblem: 'anthropic',
    inkAccent: '#181816',
    nodeTone: 'white',
    nodePos3D: [-1.72, 0.16, 1.48],
  },
  {
    id: 'microsoft-genai',
    title: 'Career Essentials in Generative AI',
    shortTitle: 'Generative AI Essentials',
    issuer: 'Microsoft & LinkedIn',
    issuedLabel: 'Issued Dec 2025',
    completionDate: 'December 2025',
    stampDate: 'DEC 2025',
    verificationUrl: 'https://www.linkedin.com/learning/certificates/d8cb877f1de1e8ff59425ac0d64730479a57e5d63e11b0ae8956dff4ddc68443',
    skills: 'Generative AI, AI Ethics, Applied ML Workflows, Productivity Systems',
    skillTags: ['Generative AI', 'AI Ethics', 'ML Workflows', 'AI Integration'],
    approaches: ['machine-learning', 'data-science', 'full-stack'],
    emblem: 'microsoft',
    inkAccent: '#0078d4',
    nodeTone: 'red',
    nodePos3D: [1.56, 0.44, -0.88],
  },
  {
    id: 'google-gemini-student',
    title: 'Gemini Certified University Student',
    shortTitle: 'Gemini Certified',
    issuer: 'Google',
    issuedLabel: 'Issued Nov 2025 · Expires Nov 2028',
    completionDate: 'November 2025',
    stampDate: 'NOV 2025',
    credentialId: '167718799',
    verificationUrl: 'https://edu.google.accredible.com/fd9abc64-8bdc-422d-982d-5c0393b3356f#acc.PjBcLVXd',
    skills: 'AI Ethics, Multimodal AI Integration, Applied Engineering',
    skillTags: ['Multimodal AI', 'AI Ethics', 'AI Integration'],
    approaches: ['machine-learning', 'full-stack', 'software-development'],
    emblem: 'google',
    inkAccent: '#1a73e8',
    nodeTone: 'grey',
    nodePos3D: [1.46, -0.58, 1.42],
  },
];
