import { LucideIcon } from 'lucide-react';

export interface ExpertiseItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface JourneyItem {
  institution: string;
  degree: string;
  period: string;
  description: string;
}

export interface SkillItem {
  title: string;
  description: string;
}

export interface CertificationItem {
  title: string;
  issuer: string;
}

export interface ContactItem {
  title: string;
  value: string;
  link?: string;
  isEmail?: boolean;
}