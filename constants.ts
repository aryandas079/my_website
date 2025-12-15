import { Brain, Code, Cpu, Globe } from 'lucide-react';
import { ExpertiseItem, JourneyItem, SkillItem, CertificationItem, ContactItem } from './types';

export const HERO_DATA = {
  name: "Aryan Das",
  role: "Electrical Engineering Student @ NIT Silchar | Full-Stack Learner: Python, AI/ML, MATLAB & Web Dev",
  image: "aryan.jpg" // Assuming the image file is named this and placed in the public/root directory
};

export const ABOUT_DATA = {
  title: "Building Tomorrow's Solutions",
  description: "Second Year Electrical Engineering student at NIT Silchar. Passionate about programming and emerging technologies. Building foundations in Python, C, and foundational concepts.",
  coreFocus: [
    "Problem-solving through code",
    "Understanding intelligent systems",
    "Real-world solution development"
  ]
};

export const EXPERTISE_DATA: ExpertiseItem[] = [
  {
    title: "Machine Learning",
    description: "Exploring intelligent algorithms and data science. Certified in Generative AI fundamentals.",
    icon: Brain
  },
  {
    title: "Programming",
    description: "Building strong foundations in Python and C. Developing computational thinking skills.",
    icon: Code
  },
  {
    title: "Engineering Tools",
    description: "MATLAB proficiency for technical computing. Understanding electrical circuits and systems.",
    icon: Cpu
  },
  {
    title: "Web Development",
    description: "Full-stack learning journey. Creating digital solutions with modern technologies.",
    icon: Globe
  }
];

export const JOURNEY_DATA: JourneyItem[] = [
  {
    institution: "NIT Silchar",
    degree: "Bachelor of Technology - Electrical Engineering",
    period: "August 2025 - September 2029",
    description: "Developing technical expertise in electrical systems and computational methods."
  },
  {
    institution: "Gurucharan College",
    degree: "Higher Secondary - Science Stream",
    period: "August 2023 - March 2025",
    description: "Physics, Chemistry, and Mathematics foundation. Prepared for engineering excellence."
  }
];

export const SKILLS_DATA: SkillItem[] = [
  {
    title: "Artificial Intelligence",
    description: "Smart engineering and AI fundamentals"
  },
  {
    title: "Technical Computing",
    description: "MATLAB for engineering applications"
  },
  {
    title: "Languages",
    description: "English: Native proficiency\nBengali: Full professional\nHindi: Professional working"
  }
];

export const CERTIFICATIONS_DATA: CertificationItem[] = [
  {
    title: "Gemini Certified",
    issuer: "University Student certification in AI technologies"
  },
  {
    title: "Career Essentials in Generative AI",
    issuer: "Microsoft and LinkedIn partnership program"
  }
];

export const CONTACT_DATA: ContactItem[] = [
  {
    title: "Location",
    value: "Silchar, Assam, India"
  },
  {
    title: "Email",
    value: "dasaryan715@gmail.com",
    isEmail: true
  },
  {
    title: "LinkedIn",
    value: "iam-aryandas",
    link: "https://linkedin.com/in/iam-aryandas"
  }
];