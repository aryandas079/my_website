export type GithubStatsCategory =
  | 'overall'
  | 'languages'
  | 'contributions'
  | 'trophies';

export interface GithubLanguageStat {
  name: string;
  percent: number;
  binaryCode: string;
}

export interface GithubTrophyStat {
  id: string;
  category: string;
  rank: 'S' | 'A' | 'B' | 'C';
  title: string;
  points: string;
  fillRatio: number;
}

export interface GithubStatsData {
  username: string;
  displayName: string;
  overall: {
    rank: string;
    rankProgress: number;
    totalStars: number;
    totalCommitsYear: number;
    commitYearLabel: string;
    totalPRs: number;
    totalIssues: number;
    contributedToLastYear: number;
  };
  contributions: {
    totalContributions: number;
    totalRange: string;
    currentStreak: number;
    currentStreakRange: string;
    longestStreak: number;
    longestStreakRange: string;
  };
  languages: GithubLanguageStat[];
  trophies: GithubTrophyStat[];
}

export interface GithubStatsMenuOption {
  id: GithubStatsCategory;
  label: string;
  shortLabel: string;
  metricPreview: string;
  binaryTag: string;
  cppFilename: string;
  cppOutputText: string;
  assetRef: string;
}

export const GITHUB_STATS_OPTIONS: GithubStatsMenuOption[] = [
  {
    id: 'overall',
    label: 'Overall',
    shortLabel: 'Overall',
    metricPreview: 'Rank A+ · 830 Commits',
    binaryTag: '01001111',
    cppFilename: 'github_overall.cpp',
    cppOutputText: 'Overall GitHub Stats · Rank A+',
    assetRef: 'stats/aryandas079_overall.bin',
  },
  {
    id: 'languages',
    label: 'Programming Languages',
    shortLabel: 'Languages',
    metricPreview: 'Kotlin 47.04% · JS 19.23%',
    binaryTag: '01001100',
    cppFilename: 'github_languages.cpp',
    cppOutputText: 'Programming Languages · Top 10',
    assetRef: 'stats/aryandas079_languages.bin',
  },
  {
    id: 'contributions',
    label: 'Contributions',
    shortLabel: 'Contributions',
    metricPreview: '885 Total · 36d Streak',
    binaryTag: '01000011',
    cppFilename: 'github_contributions.cpp',
    cppOutputText: 'Contributions · 885 · 36d Streak',
    assetRef: 'stats/aryandas079_streak.bin',
  },
  {
    id: 'trophies',
    label: 'Trophies',
    shortLabel: 'Trophies',
    metricPreview: '6 Unlocked · S / A / B / C',
    binaryTag: '01010100',
    cppFilename: 'github_trophies.cpp',
    cppOutputText: 'GitHub Trophies · 6 Unlocked',
    assetRef: 'stats/aryandas079_trophies.bin',
  },
];

export const INITIAL_ARYAN_GITHUB_STATS: GithubStatsData = {
  username: 'aryandas079',
  displayName: "Aryan Das' GitHub Stats",
  overall: {
    rank: 'A+',
    rankProgress: 0.84,
    totalStars: 5,
    totalCommitsYear: 830,
    commitYearLabel: '2026',
    totalPRs: 4,
    totalIssues: 1,
    contributedToLastYear: 0,
  },
  contributions: {
    totalContributions: 885,
    totalRange: 'Sep 13, 2023 - Present',
    currentStreak: 36,
    currentStreakRange: 'Oct 13 - Nov 17',
    longestStreak: 36,
    longestStreakRange: 'Oct 13 - Nov 17',
  },
  languages: [
    { name: 'Kotlin', percent: 47.04, binaryCode: '01001011' },
    { name: 'JavaScript', percent: 19.23, binaryCode: '01001010' },
    { name: 'CSS', percent: 8.39, binaryCode: '01000011' },
    { name: 'PowerShell', percent: 7.56, binaryCode: '01010000' },
    { name: 'C#', percent: 5.82, binaryCode: '01000011' },
    { name: 'HTML', percent: 3.6, binaryCode: '01001000' },
    { name: 'Python', percent: 3.29, binaryCode: '01010000' },
    { name: 'C++', percent: 2.41, binaryCode: '01000011' },
    { name: 'TypeScript', percent: 2.36, binaryCode: '01010100' },
    { name: 'Java', percent: 0.3, binaryCode: '01001010' },
  ],
  trophies: [
    {
      id: 'multilang',
      category: 'MultiLanguage',
      rank: 'S',
      title: 'Rainbow Lang User',
      points: '11pt',
      fillRatio: 1.0,
    },
    {
      id: 'commits',
      category: 'Commits',
      rank: 'A',
      title: 'Ultra Committer',
      points: '602pt',
      fillRatio: 0.82,
    },
    {
      id: 'experience',
      category: 'Experience',
      rank: 'A',
      title: 'Intermediate Dev',
      points: '11pt',
      fillRatio: 0.78,
    },
    {
      id: 'repos',
      category: 'Repositories',
      rank: 'B',
      title: 'Middle Repo Creator',
      points: '14pt',
      fillRatio: 0.64,
    },
    {
      id: 'stars',
      category: 'Stars',
      rank: 'C',
      title: 'First Star',
      points: '4pt',
      fillRatio: 0.42,
    },
    {
      id: 'prs',
      category: 'PullRequest',
      rank: 'C',
      title: 'First Pull',
      points: '4pt',
      fillRatio: 0.38,
    },
  ],
};

/**
 * Optionally enriches stars count with live public GitHub repo data for @aryandas079
 * while preserving the verified profile statistics from GitHub.
 */
export async function fetchLiveGithubStatsOverlay(
  base: GithubStatsData
): Promise<GithubStatsData> {
  try {
    const res = await fetch(
      'https://api.github.com/users/aryandas079/repos?per_page=100',
      {
        headers: { Accept: 'application/vnd.github+json' },
      }
    );
    if (!res.ok) return base;
    const repos: Array<Record<string, unknown>> = await res.json();
    if (!Array.isArray(repos)) return base;

    let liveStars = 0;
    for (const r of repos) {
      if (typeof r.stargazers_count === 'number') {
        liveStars += r.stargazers_count;
      }
    }

    return {
      ...base,
      overall: {
        ...base.overall,
        totalStars: Math.max(base.overall.totalStars, liveStars),
      },
    };
  } catch {
    return base;
  }
}
