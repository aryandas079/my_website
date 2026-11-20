export interface GithubPinCard {
  id: string;
  repoName: string;
  category: string;
  language: string;
  langColor: string;
  license: string;
  stars: number;
  forks: number;
  defaultBranch: string;
  updatedAt: string;
  description: string;
  glowGradient: string;
  url: string;
  homepage?: string;
  readmeMarkdown: string;
}

const LANG_COLORS: Record<string, string> = {
  Kotlin: '#ffffff',
  PowerShell: '#ffffff',
  Python: '#ffffff',
  'C++': '#ffffff',
  C: '#ffffff',
  TypeScript: '#ffffff',
  JavaScript: '#ffffff',
  Rust: '#ffffff',
  Go: '#ffffff',
};

export const FALLBACK_ICON_SVG_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="88" height="88">
    <rect width="120" height="120" rx="18" fill="#ffffff"/>
    <path d="M24 52 C44 38, 76 30, 96 28 C78 39, 48 48, 24 52 Z" fill="#111111"/>
    <path d="M26 68 C48 54, 78 46, 98 44 C80 55, 50 64, 26 68 Z" fill="#555555"/>
    <path d="M30 84 C52 70, 80 62, 96 60 C80 71, 54 80, 30 84 Z" fill="#999999"/>
  </svg>`);

export const INITIAL_GITHUB_PINS: GithubPinCard[] = [
  {
    id: 'haze',
    repoName: 'Haze',
    category: 'Android · C++17 Shield',
    language: 'Kotlin',
    langColor: '#ffffff',
    license: 'Apache-2.0 license',
    stars: 2,
    forks: 0,
    defaultBranch: 'main',
    updatedAt: 'Live on GitHub',
    description:
      'Ultra-fast, minimalist, and privacy-hardened Android web browser powered by a native C++17 shield engine.',
    glowGradient:
      'radial-gradient(circle at 60% 42%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 48%, rgba(10, 10, 10, 0.99) 84%)',
    url: 'https://github.com/aryandas079/Haze',
    readmeMarkdown: `<div align="center">
  <img src="${FALLBACK_ICON_SVG_DATA_URI}" alt="Haze Browser Logo" width="84" height="84" />
  <h1>Haze Browser</h1>
  <h3>The Ultra-Fast, Minimalist and Privacy-Hardened Chromium Web Browser for Android</h3>
  <p>Powered by a custom-compiled dual-ABI Native Chromium Engine (Blink + V8), C++17 native threat filtering, system Notification Media Controller, hybrid local search indexing, and hardware-grade credential encryption.</p>
  <p>
    <img src="https://img.shields.io/badge/PLATFORM-ANDROID-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Platform Android" />
    <img src="https://img.shields.io/badge/PACKAGE-COM.ARYANDAS.HAZE-007ACC?style=for-the-badge" alt="Package" />
    <img src="https://img.shields.io/badge/ENGINE-NATIVE%20CHROMIUM%20(BLINK%20%2B%20V8)-2F74C0?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Engine" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/ABI-ARM64--V8A%20%7C%20ARMEABI--V7A-00A88F?style=for-the-badge" alt="ABI" />
    <img src="https://img.shields.io/badge/MIN%20SDK-24%20(ANDROID%207.0)-007EC6?style=for-the-badge" alt="Min SDK" />
    <img src="https://img.shields.io/badge/TARGET%20SDK-37-7F52FF?style=for-the-badge" alt="Target SDK" />
    <img src="https://img.shields.io/badge/KOTLIN-1.9%2B-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white" alt="Kotlin" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/C%2B%2B-17-00599C?style=for-the-badge&logo=cplusplus&logoColor=white" alt="C++17" />
    <img src="https://img.shields.io/badge/CMAKE-3.22.1-064F8C?style=for-the-badge&logo=cmake&logoColor=white" alt="CMake" />
    <img src="https://img.shields.io/badge/LICENSE-APACHE%202.0-007EC6?style=for-the-badge" alt="License" />
    <img src="https://img.shields.io/badge/OPEN%20SOURCE-YES-4CC61E?style=for-the-badge" alt="Open Source" />
  </p>
</div>

---

## Core Architecture

- **Native C++17 Shield Engine**: JNI-backed ad, tracker, and fingerprinting filter executing in sub-millisecond time per network request.
- **Dual-ABI Native Chromium Engine**: Custom-compiled Blink + V8 rendering pipeline supporting \`arm64-v8a\` and \`armeabi-v7a\`.
- **Zero-Telemetry Privacy Core**: Ephemeral browsing sessions with strict site isolation, HTTPS-Only enforcement, and DNS-over-HTTPS support.
- **Hardware-Grade Credential Vault**: Encrypted local session storage backed by Android Keystore hardware security module.

## Native Shield Pipeline

\`\`\`cpp
// Native C++17 Request Interceptor (JNI Bridge)
bool ShieldEngine::shouldBlockRequest(std::string_view url, std::string_view origin) noexcept {
  return bloomFilter_.mightContain(url) && ruleTrie_.matches(url, origin);
}
\`\`\`

## Build from Source

1. Clone the [Haze Repository](https://github.com/aryandas079/Haze) from GitHub.
2. Install Android NDK (\`r26+\`) and CMake \`3.22.1\`.
3. Execute \`./gradlew assembleRelease\` to compile the native C++17 shield and Kotlin APK.`,
  },
  {
    id: 'idle',
    repoName: 'IDLE',
    category: 'Sensory Firewall',
    language: 'PowerShell',
    langColor: '#ffffff',
    license: 'MIT license',
    stars: 1,
    forks: 0,
    defaultBranch: 'main',
    updatedAt: 'Live on GitHub',
    description:
      'IDLE is an adaptive, privacy-first sensory firewall that detects potentially overwhelming visual and audio stimuli in digital content and applies real-time protective adjustments.',
    glowGradient:
      'radial-gradient(circle at 58% 42%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 48%, rgba(10, 10, 10, 0.99) 84%)',
    url: 'https://github.com/aryandas079/IDLE',
    readmeMarkdown: `# IDLE — Adaptive Sensory Firewall

### Privacy-First Real-Time Visual & Audio Stimulus Protection Engine

IDLE detects potentially overwhelming visual flashes and sudden audio transients in digital content and applies real-time protective adjustments locally on-device. Explore the source on [GitHub — aryandas079/IDLE](https://github.com/aryandas079/IDLE).

---

## Core Capabilities

- **Real-Time Visual Stimulus Dampening**: Detects high-frequency luminance flashes, rapid strobing, and jarring contrast shifts before display output.
- **Audio Peak Normalization**: Continuously monitors system audio streams to attenuate sudden transient spikes while preserving voice clarity.
- **100% Local & Privacy-First**: All frame and audio analysis runs locally on-device with zero cloud telemetry.

## Quick Launch

\`\`\`powershell
# Launch IDLE real-time sensory protection daemon
./IDLE.ps1 -Profile "photosensitive-safe" -AudioLimiter -6dB
\`\`\``,
  },
  {
    id: 'vibes',
    repoName: 'vibes',
    category: 'Jetpack Compose · AI',
    language: 'Kotlin',
    langColor: '#ffffff',
    license: 'GPL-3.0 license',
    stars: 1,
    forks: 0,
    defaultBranch: 'main',
    updatedAt: 'Live on GitHub',
    description:
      'Modern Android music discovery and streaming app built with Kotlin and Jetpack Compose, featuring AI-powered recommendations, local playback, synchronized lyrics, and music recognition.',
    glowGradient:
      'radial-gradient(circle at 60% 44%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 46%, rgba(10, 10, 10, 0.99) 84%)',
    url: 'https://github.com/aryandas079/vibes',
    readmeMarkdown: `# vibes

### Modern AI Music Discovery & Streaming Engine for Android

Built with **Kotlin** and **Jetpack Compose**, featuring AI-powered recommendations, lossless local playback, synchronized time-coded lyrics, and ambient music recognition. View the full repository at [github.com/aryandas079/vibes](https://github.com/aryandas079/vibes).

---

## Key Features

- **Jetpack Compose Spatial UI**: Dynamic palette extraction from album artwork with fluid 120Hz shared-element transitions.
- **Synchronized Time-Coded Lyrics**: Beat-accurate syllable and line highlighting with interactive seek.
- **AI Recommendation Graph**: Personalized mood and acoustic similarity clustering for seamless queue generation.
- **Hybrid Playback Engine**: Media3 / ExoPlayer pipeline supporting lossless local files alongside low-latency streaming.`,
  },
  {
    id: 'youtube-video-download',
    repoName: 'youtube_video_download',
    category: 'Media Engine',
    language: 'Python',
    langColor: '#ffffff',
    license: 'MIT license',
    stars: 1,
    forks: 0,
    defaultBranch: 'main',
    updatedAt: 'Live on GitHub',
    description:
      'This repository is for easing video download in highest quality from YouTube.',
    glowGradient:
      'radial-gradient(circle at 58% 42%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 48%, rgba(10, 10, 10, 0.99) 84%)',
    url: 'https://github.com/aryandas079/youtube_video_download',
    readmeMarkdown: `# youtube_video_download

### High-Throughput Highest-Quality YouTube Media Extraction Utility

Engineered in Python for adaptive 4K/1080p60 video stream extraction and highest-bitrate audio muxing. Source code available at [aryandas079/youtube_video_download](https://github.com/aryandas079/youtube_video_download).

---

## Features

- **Highest Resolution Stream Selection**: Automatically selects adaptive 4K/1080p60 video streams and merges highest-bitrate audio tracks.
- **Batch Playlist & Channel Support**: Resilient retry logic and concurrent chunk downloading.
- **Clean CLI Workflow**: Minimalist command-line interface with real-time throughput and ETA telemetry.

## Usage

\`\`\`bash
git clone https://github.com/aryandas079/youtube_video_download.git
cd youtube_video_download
python main.py --url "https://youtube.com/watch?v=..." --quality best
\`\`\``,
  },
  {
    id: 'haze-desktop',
    repoName: 'Haze_desktop',
    category: 'Chromium · Windows',
    language: 'PowerShell',
    langColor: '#ffffff',
    license: 'Apache-2.0 license',
    stars: 1,
    forks: 0,
    defaultBranch: 'main',
    updatedAt: 'Live on GitHub',
    description:
      'Haze Desktop is a privacy-focused Chromium-based browser for Windows, designed for fast, secure, and seamless browsing with enhanced privacy protection, ad and tracker blocking.',
    glowGradient:
      'radial-gradient(circle at 60% 42%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 48%, rgba(10, 10, 10, 0.99) 84%)',
    url: 'https://github.com/aryandas079/Haze_desktop',
    readmeMarkdown: `<div align="center">
  <img src="${FALLBACK_ICON_SVG_DATA_URI}" alt="Haze Desktop Logo" width="84" height="84" />
  <h1>Haze Desktop</h1>
  <h3>Privacy-Focused Chromium Browser for Windows</h3>
  <p>Designed for fast, secure, and seamless desktop browsing with enhanced privacy protection, native ad and tracker blocking, and zero background telemetry.</p>
</div>

---

## Core Architecture

- **Hardened Chromium Policies**: Strips background telemetry, cohort tracking, and unsolicited network pings out of the box.
- **Native Ad & Tracker Shield**: Blocks third-party tracking scripts, fingerprinting vectors, and invasive ads at the network layer.
- **Hardware-Accelerated Minimalist Shell**: Optimized for low RAM footprint and instant tab restoration on Windows 11. View [Haze_desktop on GitHub](https://github.com/aryandas079/Haze_desktop).`,
  },
  {
    id: 'windows-hello-refined',
    repoName: 'Windows-Hello-Refined',
    category: 'Biometric Auth · CV',
    language: 'Python',
    langColor: '#ffffff',
    license: 'MIT license',
    stars: 1,
    forks: 0,
    defaultBranch: 'main',
    updatedAt: 'Live on GitHub',
    description:
      'Windows Hello Refined adds fast, face-based authentication to Windows using any standard webcam. It provides a Windows Hello-style lock-screen animation, secure PIN auto-unlock, and liveness detection.',
    glowGradient:
      'radial-gradient(circle at 60% 42%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 48%, rgba(10, 10, 10, 0.99) 84%)',
    url: 'https://github.com/aryandas079/Windows-Hello-Refined',
    readmeMarkdown: `# Windows Hello Refined

### Fast Face-Based Biometric Authentication for Windows on Any Standard Webcam

Brings Windows Hello-style lock-screen animation, liveness detection, and encrypted PIN auto-unlock to any RGB webcam—no specialized IR sensor required. Browse the source at [aryandas079/Windows-Hello-Refined](https://github.com/aryandas079/Windows-Hello-Refined).

---

## Core Capabilities

- **Liveness Detection & Anti-Spoofing**: Real-time blink, micro-movement, and depth-cue verification to prevent photo or screen replay attacks.
- **Windows Hello Lock-Screen UI**: Native-feeling lock-screen overlay animation during facial verification.
- **Encrypted Credential Vault**: Securely stores embeddings and triggers automatic PIN unlock upon verified liveness match.

## Quick Start

\`\`\`bash
git clone https://github.com/aryandas079/Windows-Hello-Refined.git
cd Windows-Hello-Refined
pip install -r requirements.txt
python enroll_face.py
\`\`\``,
  },
];

function formatRelativeDate(isoDate?: string): string {
  if (!isoDate) return 'Updated recently';
  try {
    const date = new Date(isoDate);
    return `Updated ${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  } catch {
    return 'Updated recently';
  }
}

interface LivePinPayloadItem {
  owner?: string;
  name: string;
  description?: string;
  language?: string;
  languageColor?: string;
  stars?: number;
  forks?: number;
  defaultBranch?: string;
  license?: string;
  url?: string;
  homepage?: string;
  pushedAt?: string;
  topics?: string[];
}

function slugifyRepoId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || name.toLowerCase();
}

const KNOWN_SEED_BY_REPO = new Map<string, GithubPinCard>(
  INITIAL_GITHUB_PINS.map((p) => [p.repoName.toLowerCase(), p])
);

function buildPinCardFromLive(
  item: LivePinPayloadItem,
  existingByName: Map<string, GithubPinCard>,
  index: number
): GithubPinCard {
  const key = item.name.toLowerCase();
  const prev = existingByName.get(key) ?? KNOWN_SEED_BY_REPO.get(key);
  const owner = item.owner || 'aryandas079';
  const language =
    (item.language && item.language.trim()) || prev?.language || 'Code';
  const description =
    (item.description && item.description.trim()) ||
    prev?.description ||
    `Open-source repository ${item.name} by @${owner}.`;
  const stars = typeof item.stars === 'number' ? item.stars : prev?.stars ?? 0;
  const forks = typeof item.forks === 'number' ? item.forks : prev?.forks ?? 0;
  const defaultBranch =
    (item.defaultBranch && item.defaultBranch.trim()) ||
    prev?.defaultBranch ||
    'main';
  const license =
    (item.license && item.license.trim()) || prev?.license || 'Open Source';
  const url =
    (item.url && item.url.trim()) ||
    prev?.url ||
    `https://github.com/${owner}/${item.name}`;
  const homepage =
    (item.homepage && item.homepage.trim()) || prev?.homepage || undefined;
  const updatedAt = item.pushedAt
    ? formatRelativeDate(item.pushedAt)
    : prev?.updatedAt || 'Live on GitHub';

  const topicCategory =
    item.topics && item.topics.length > 0
      ? item.topics
          .slice(0, 2)
          .map((t) => t.replace(/-/g, ' '))
          .join(' · ')
      : language;

  const glowX = index % 2 === 0 ? 60 : 58;
  const glowY = index % 3 === 0 ? 44 : 42;

  // Invalidate cached README when the repo has new commits pushed
  if (prev && prev.updatedAt !== updatedAt) {
    readmeCache.delete(key);
  }

  return {
    id: prev?.id ?? slugifyRepoId(item.name),
    repoName: item.name,
    category: prev?.category ?? topicCategory,
    language,
    langColor: LANG_COLORS[language] ?? prev?.langColor ?? '#ffffff',
    license,
    stars,
    forks,
    defaultBranch,
    updatedAt,
    description,
    glowGradient:
      prev?.glowGradient ??
      `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 48%, rgba(10, 10, 10, 0.99) 84%)`,
    url,
    homepage,
    readmeMarkdown:
      prev?.readmeMarkdown ??
      `# ${item.name}\n\n${description}\n\nExplore the repository on [GitHub — ${owner}/${item.name}](${url}).`,
  };
}

export function areGithubPinsEqual(
  a: GithubPinCard[],
  b: GithubPinCard[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.repoName !== y.repoName ||
      x.description !== y.description ||
      x.language !== y.language ||
      x.stars !== y.stars ||
      x.forks !== y.forks ||
      x.updatedAt !== y.updatedAt ||
      x.url !== y.url
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Fetches the REAL-TIME pinned repositories for @aryandas079 from GitHub.
 * Uses the zero-cache /api/github-pins proxy first so pin additions, removals,
 * reordering, and metadata edits reflect immediately; falls back to the public
 * CORS pinned endpoint + GitHub REST API if running on static-only hosting.
 */
export async function fetchLiveGithubPins(
  currentPins: GithubPinCard[]
): Promise<GithubPinCard[]> {
  const existingByName = new Map<string, GithubPinCard>(
    currentPins.map((p) => [p.repoName.toLowerCase(), p])
  );

  // 1. Primary: Real-time zero-cache /api/github-pins server proxy
  try {
    const proxyRes = await fetch(
      `/api/github-pins?user=aryandas079&t=${Date.now()}`,
      { cache: 'no-store' }
    );
    if (proxyRes.ok) {
      const data = (await proxyRes.json()) as { pins?: LivePinPayloadItem[] };
      if (Array.isArray(data.pins) && data.pins.length > 0) {
        return data.pins.map((item, idx) =>
          buildPinCardFromLive(item, existingByName, idx)
        );
      }
    }
  } catch {
    // Fall through to direct browser CORS endpoints
  }

  // 2. Fallback: Public CORS pinned repos API + official GitHub REST repos metadata
  try {
    const [pinnedRes, reposRes] = await Promise.all([
      fetch('https://pinned.berrysauce.dev/get/aryandas079', {
        cache: 'no-store',
      }).catch(() => null),
      fetch(
        'https://api.github.com/users/aryandas079/repos?per_page=100&sort=updated',
        {
          cache: 'no-store',
          headers: { Accept: 'application/vnd.github+json' },
        }
      ).catch(() => null),
    ]);

    const repoMap = new Map<string, Record<string, unknown>>();
    if (reposRes && reposRes.ok) {
      const repos = (await reposRes.json()) as Array<Record<string, unknown>>;
      if (Array.isArray(repos)) {
        for (const r of repos) {
          if (typeof r.name === 'string') {
            repoMap.set(r.name.toLowerCase(), r);
          }
        }
      }
    }

    if (pinnedRes && pinnedRes.ok) {
      const pinnedArr = (await pinnedRes.json()) as Array<Record<string, unknown>>;
      if (Array.isArray(pinnedArr) && pinnedArr.length > 0) {
        const merged: LivePinPayloadItem[] = pinnedArr
          .filter((p) => typeof p.name === 'string')
          .slice(0, 6)
          .map((p) => {
            const repoName = String(p.name);
            const live = repoMap.get(repoName.toLowerCase());
            const spdx =
              live?.license &&
              typeof live.license === 'object' &&
              'spdx_id' in live.license &&
              typeof (live.license as Record<string, unknown>).spdx_id === 'string' &&
              (live.license as Record<string, string>).spdx_id !== 'NOASSERTION'
                ? `${(live.license as Record<string, string>).spdx_id} license`
                : '';

            return {
              owner:
                typeof p.author === 'string' && p.author
                  ? p.author
                  : 'aryandas079',
              name:
                typeof live?.name === 'string' ? live.name : repoName,
              description:
                (typeof live?.description === 'string' && live.description.trim()) ||
                (typeof p.description === 'string' ? p.description.trim() : ''),
              language:
                (typeof live?.language === 'string' && live.language.trim()) ||
                (typeof p.language === 'string' ? p.language.trim() : ''),
              stars:
                typeof live?.stargazers_count === 'number'
                  ? live.stargazers_count
                  : typeof p.stars === 'number'
                    ? p.stars
                    : 0,
              forks:
                typeof live?.forks_count === 'number'
                  ? live.forks_count
                  : typeof p.forks === 'number'
                    ? p.forks
                    : 0,
              defaultBranch:
                typeof live?.default_branch === 'string'
                  ? live.default_branch
                  : 'main',
              license: spdx,
              url:
                typeof live?.html_url === 'string'
                  ? live.html_url
                  : `https://github.com/aryandas079/${repoName}`,
              homepage:
                typeof live?.homepage === 'string' ? live.homepage.trim() : '',
              pushedAt:
                typeof live?.pushed_at === 'string'
                  ? live.pushed_at
                  : typeof live?.updated_at === 'string'
                    ? live.updated_at
                    : '',
              topics: Array.isArray(live?.topics)
                ? (live.topics as string[])
                : [],
            };
          });

        if (merged.length > 0) {
          return merged.map((item, idx) =>
            buildPinCardFromLive(item, existingByName, idx)
          );
        }
      }
    }

    // 3. Final fallback: enrich currentPins in place from REST repos map
    if (repoMap.size > 0) {
      return currentPins.map((pin, idx) => {
        const live = repoMap.get(pin.repoName.toLowerCase());
        if (!live) return pin;
        const spdx =
          live.license &&
          typeof live.license === 'object' &&
          'spdx_id' in live.license &&
          typeof (live.license as Record<string, unknown>).spdx_id === 'string' &&
          (live.license as Record<string, string>).spdx_id !== 'NOASSERTION'
            ? `${(live.license as Record<string, string>).spdx_id} license`
            : pin.license;

        return buildPinCardFromLive(
          {
            owner: 'aryandas079',
            name: typeof live.name === 'string' ? live.name : pin.repoName,
            description:
              typeof live.description === 'string'
                ? live.description
                : pin.description,
            language:
              typeof live.language === 'string' ? live.language : pin.language,
            stars:
              typeof live.stargazers_count === 'number'
                ? live.stargazers_count
                : pin.stars,
            forks:
              typeof live.forks_count === 'number' ? live.forks_count : pin.forks,
            defaultBranch:
              typeof live.default_branch === 'string'
                ? live.default_branch
                : pin.defaultBranch,
            license: spdx,
            url: typeof live.html_url === 'string' ? live.html_url : pin.url,
            homepage:
              typeof live.homepage === 'string' ? live.homepage : pin.homepage,
            pushedAt:
              typeof live.pushed_at === 'string'
                ? live.pushed_at
                : typeof live.updated_at === 'string'
                  ? live.updated_at
                  : undefined,
          },
          existingByName,
          idx
        );
      });
    }

    return currentPins;
  } catch {
    return currentPins;
  }
}

const readmeCache = new Map<string, string>();

/**
 * Fetches the live README.md content for a given @aryandas079 repository from GitHub.
 */
export async function fetchLiveRepoReadme(
  pin: GithubPinCard
): Promise<string> {
  const cacheKey = pin.repoName.toLowerCase();
  if (readmeCache.has(cacheKey)) {
    return readmeCache.get(cacheKey)!;
  }

  try {
    const apiRes = await fetch(
      `https://api.github.com/repos/aryandas079/${encodeURIComponent(pin.repoName)}/readme`,
      {
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github.raw+json',
        },
      }
    );
    if (apiRes.ok) {
      const text = await apiRes.text();
      if (text && text.trim().length > 10) {
        readmeCache.set(cacheKey, text);
        return text;
      }
    }
  } catch {
    // Fallback to raw.githubusercontent.com below
  }

  for (const branch of [pin.defaultBranch, 'main', 'master']) {
    try {
      const rawRes = await fetch(
        `https://raw.githubusercontent.com/aryandas079/${encodeURIComponent(pin.repoName)}/${branch}/README.md`,
        { cache: 'no-store' }
      );
      if (rawRes.ok) {
        const text = await rawRes.text();
        if (text && text.trim().length > 10) {
          readmeCache.set(cacheKey, text);
          return text;
        }
      }
    } catch {
      // Ignore and try next branch
    }
  }

  return pin.readmeMarkdown;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveRepoAssetUrl(src: string, pin: GithubPinCard): string {
  const trimmed = src.trim().replace(/\s+/g, '%20');
  if (
    !trimmed ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    if (
      trimmed.startsWith('https://github.com/') &&
      trimmed.includes('/blob/')
    ) {
      return trimmed
        .replace('https://github.com/', 'https://raw.githubusercontent.com/')
        .replace('/blob/', '/');
    }
    return trimmed;
  }
  const cleanPath = trimmed.replace(/^\.?\//, '');
  return `https://raw.githubusercontent.com/aryandas079/${encodeURIComponent(
    pin.repoName
  )}/${encodeURIComponent(pin.defaultBranch || 'main')}/${cleanPath}`;
}

function resolveRepoLinkUrl(href: string, pin: GithubPinCard): string {
  const trimmed = href.trim();
  if (
    !trimmed ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('#')
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.replace(/^\.?\//, '');
  return `${pin.url}/blob/${encodeURIComponent(
    pin.defaultBranch || 'main'
  )}/${cleanPath}`;
}

/**
 * Pre-processes raw README Markdown to strip unwanted metadata:
 * - YAML frontmatter (--- ... ---)
 * - HTML comments (<!-- ... -->)
 * - Unwanted script/style/meta/link/iframe blocks
 * - Inline color/style attributes that would violate the Black & White aesthetic
 * Preserves all icons, logos, and badge images while normalizing balanced parentheses in image URLs.
 */
export function stripUnwantedReadmeMetadata(rawMd: string): string {
  let cleaned = rawMd.replace(/\r\n/g, '\n');

  // 1. Strip YAML frontmatter at top of README
  cleaned = cleaned.replace(/^---\n[\s\S]*?\n---\n+/, '');

  // 2. Strip HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // 3. Strip unsafe or metadata HTML blocks
  cleaned = cleaned
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<(meta|link)\b[^>]*>/gi, '');

  // 4. Strip inline style/color/bgcolor attributes from raw HTML tags to enforce strict Black & White
  cleaned = cleaned.replace(
    /\s+(style|color|bgcolor)=["'][^"']*["']/gi,
    ''
  );

  return cleaned.trim();
}

function formatInlineGithubMarkdown(line: string, pin: GithubPinCard): string {
  // Tokenize inline code spans first so Markdown inside `code` is never altered
  const codeSegments: string[] = [];
  let out = line.replace(/`([^`]+)`/g, (_m, code) => {
    const idx = codeSegments.length;
    codeSegments.push(`<code class="gh-inline-code">${escapeHtml(code)}</code>`);
    return `@@INLINE_CODE_${idx}@@`;
  });

  // Tokenize generated <img> tags so subsequent link/text regexes never corrupt image URLs
  const imgSegments: string[] = [];
  const pushImgToken = (html: string): string => {
    const idx = imgSegments.length;
    imgSegments.push(html);
    return `@@IMG_TOKEN_${idx}@@`;
  };

  // 1. Raw HTML <img> tags: resolve relative repo paths and attach monochrome fallback icon on error
  out = out.replace(
    /<img\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>/gi,
    (_fullMatch, beforeSrc, src, afterSrc) => {
      const resolved = resolveRepoAssetUrl(src, pin);
      const isBadge =
        resolved.includes('shields.io') ||
        resolved.includes('badge') ||
        resolved.includes('badgen.net');
      return pushImgToken(
        `<img src="${resolved}" ${beforeSrc} ${afterSrc} loading="lazy" class="${
          isBadge ? 'gh-inline-badge' : 'gh-content-img'
        }" onerror="this.onerror=null;this.src='${FALLBACK_ICON_SVG_DATA_URI}';" />`
      );
    }
  );

  // 2. Linked Markdown images supporting balanced parentheses inside URLs (e.g. (Blink_+_V8) or (Android_7.0)):
  // [![alt](imgUrl)](linkUrl)
  out = out.replace(
    /\[!\[([^\]]*)\]\(((?:[^()]|\([^()]*\))+)\)\]\(((?:[^()]|\([^()]*\))+)\)/g,
    (_m, alt, imgUrl, linkUrl) => {
      const resolvedImg = resolveRepoAssetUrl(imgUrl, pin);
      const resolvedLink = resolveRepoLinkUrl(linkUrl, pin);
      const isBadge =
        resolvedImg.includes('shields.io') ||
        resolvedImg.includes('badge') ||
        resolvedImg.includes('badgen.net');
      return pushImgToken(
        `<a href="${resolvedLink}" target="_blank" rel="noopener noreferrer" class="gh-readme-link"><img src="${resolvedImg}" alt="${escapeHtml(
          alt
        )}" loading="lazy" class="${
          isBadge ? 'gh-inline-badge' : 'gh-content-img'
        }" onerror="this.onerror=null;this.src='${FALLBACK_ICON_SVG_DATA_URI}';" /></a>`
      );
    }
  );

  // 3. Standalone Markdown images supporting balanced parentheses inside URLs:
  // ![alt](imgUrl)
  out = out.replace(
    /!\[([^\]]*)\]\(((?:[^()]|\([^()]*\))+)\)/g,
    (_m, alt, imgUrl) => {
      const resolvedImg = resolveRepoAssetUrl(imgUrl, pin);
      const isBadge =
        resolvedImg.includes('shields.io') ||
        resolvedImg.includes('badge') ||
        resolvedImg.includes('badgen.net');
      return pushImgToken(
        `<img src="${resolvedImg}" alt="${escapeHtml(
          alt
        )}" loading="lazy" class="${
          isBadge ? 'gh-inline-badge' : 'gh-content-img'
        }" onerror="this.onerror=null;this.src='${FALLBACK_ICON_SVG_DATA_URI}';" />`
      );
    }
  );

  // 4. Raw HTML <a> tags -> apply Red Accent link class
  out = out.replace(
    /<a\b([^>]*?)\bhref=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi,
    (_m, beforeHref, href, afterHref, inner) => {
      const resolved = resolveRepoLinkUrl(href, pin);
      return `<a href="${resolved}" target="_blank" rel="noopener noreferrer" class="gh-readme-link" ${beforeHref} ${afterHref}>${inner}</a>`;
    }
  );

  // 5. Standard Markdown links supporting balanced parentheses inside URLs: [label](url) -> Red Accent Link (#ff261b)
  out = out.replace(
    /\[([^\]]+)\]\(((?:[^()]|\([^()]*\))+)\)/g,
    (_m, label, url) => {
      const resolvedUrl = resolveRepoLinkUrl(url, pin);
      return `<a href="${resolvedUrl}" target="_blank" rel="noopener noreferrer" class="gh-readme-link">${label}</a>`;
    }
  );

  // 6. Bare autolinks: <https://...>
  out = out.replace(
    /<(https?:\/\/[^>\s]+)>/g,
    (_m, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="gh-readme-link">${escapeHtml(
        url
      )}</a>`
  );

  // Bold + Italic: ***text***
  out = out.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');

  // Bold: **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  out = out.replace(/(^|\s)\*([^*\n]+)\*(?=\s|$|[.,;:!?])/g, '$1<em>$2</em>');

  // Strikethrough: ~~text~~
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Restore image tokens
  out = out.replace(/@@IMG_TOKEN_(\d+)@@/g, (_m, idxStr) => {
    return imgSegments[Number(idxStr)] ?? '';
  });

  // Restore inline code tokens
  out = out.replace(/@@INLINE_CODE_(\d+)@@/g, (_m, idxStr) => {
    return codeSegments[Number(idxStr)] ?? '';
  });

  return out;
}

/**
 * Dedicated Markdown-to-HTML parser for project README content:
 * 1. Strips unwanted metadata, YAML frontmatter, and HTML comments.
 * 2. Properly parses image/badge URLs containing balanced parentheses so all icons load cleanly.
 * 3. Emits semantic HTML styled in a strictly Black & White monospaced aesthetic with
 *    Red (#ff261b) accent styling for all links (.gh-readme-link).
 */
export function renderGithubReadmeHtml(md: string, pin: GithubPinCard): string {
  const cleanedMd = stripUnwantedReadmeMetadata(md);
  const lines = cleanedMd.split('\n');
  const htmlParts: string[] = [];

  let inCode = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];
  let tableRows: string[][] = [];
  let quoteLines: string[] = [];
  let paraLines: string[] = [];

  const flushPara = () => {
    if (paraLines.length > 0) {
      const content = paraLines.join(' ').trim();
      if (content) {
        const formatted = formatInlineGithubMarkdown(content, pin).trim();
        if (formatted) {
          htmlParts.push(`<p>${formatted}</p>`);
        }
      }
      paraLines = [];
    }
  };

  const flushList = () => {
    if (listType && listItems.length > 0) {
      const itemsHtml = listItems
        .map((item) => `<li>${formatInlineGithubMarkdown(item, pin)}</li>`)
        .join('');
      htmlParts.push(`<${listType}>${itemsHtml}</${listType}>`);
      listItems = [];
      listType = null;
    }
  };

  const flushQuote = () => {
    if (quoteLines.length > 0) {
      const joined = quoteLines.join(' ').trim();
      if (joined) {
        htmlParts.push(
          `<blockquote>${formatInlineGithubMarkdown(joined, pin)}</blockquote>`
        );
      }
      quoteLines = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const header = tableRows[0];
      const bodyRows = tableRows
        .slice(1)
        .filter((r) => !r.every((c) => /^[-:\s]+$/.test(c)));
      const thead = `<thead><tr>${header
        .map((c) => `<th>${formatInlineGithubMarkdown(c.trim(), pin)}</th>`)
        .join('')}</tr></thead>`;
      const tbody =
        bodyRows.length > 0
          ? `<tbody>${bodyRows
              .map(
                (r) =>
                  `<tr>${r
                    .map(
                      (c) =>
                        `<td>${formatInlineGithubMarkdown(c.trim(), pin)}</td>`
                    )
                    .join('')}</tr>`
              )
              .join('')}</tbody>`
          : '';
      htmlParts.push(
        `<div class="gh-table-wrap"><table>${thead}${tbody}</table></div>`
      );
      tableRows = [];
    }
  };

  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
    flushTable();
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Fenced code blocks
    if (trimmed.startsWith('```')) {
      flushAll();
      if (!inCode) {
        inCode = true;
        codeLang = trimmed.slice(3).trim() || 'code';
        codeLines = [];
      } else {
        inCode = false;
        htmlParts.push(
          `<div class="gh-code-block"><div class="gh-code-header"><span>${escapeHtml(
            codeLang
          )}</span></div><pre><code>${escapeHtml(
            codeLines.join('\n')
          )}</code></pre></div>`
        );
        codeLines = [];
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    // Markdown table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      flushPara();
      flushList();
      flushQuote();
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    } else if (tableRows.length > 0) {
      flushTable();
    }

    if (!trimmed) {
      flushAll();
      continue;
    }

    // Structural HTML lines (<div align="center">, <p>, <img>, <h1..h4>, etc.)
    if (
      /^<\/?(div|p|img|h[1-6]|a|span|br|hr|picture|source|details|summary|table|thead|tbody|tr|th|td|ul|ol|li|b|strong|i|em)\b/i.test(
        trimmed
      )
    ) {
      flushAll();
      const formattedHtmlLine = formatInlineGithubMarkdown(rawLine, pin).trim();
      if (formattedHtmlLine) {
        htmlParts.push(formattedHtmlLine);
      }
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushAll();
      htmlParts.push('<hr />');
      continue;
    }

    // Headings (# .. ######)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushAll();
      const level = Math.min(4, headingMatch[1].length);
      const text = formatInlineGithubMarkdown(headingMatch[2].trim(), pin);
      htmlParts.push(`<h${level}>${text}</h${level}>`);
      continue;
    }

    // Unordered list items
    if (/^[-*+]\s+/.test(trimmed)) {
      flushPara();
      flushQuote();
      if (listType === 'ol') flushList();
      listType = 'ul';
      const itemText = trimmed
        .replace(/^[-*+]\s+/, '')
        .replace(/^\[x\]\s*/i, '<span class="gh-check checked">✓</span> ')
        .replace(/^\[ \]\s*/, '<span class="gh-check">○</span> ');
      listItems.push(itemText);
      continue;
    }

    // Ordered list items
    if (/^\d+\.\s+/.test(trimmed)) {
      flushPara();
      flushQuote();
      if (listType === 'ul') flushList();
      listType = 'ol';
      listItems.push(trimmed.replace(/^\d+\.\s+/, ''));
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith('>')) {
      flushPara();
      flushList();
      quoteLines.push(trimmed.replace(/^>\s*/, ''));
      continue;
    } else if (quoteLines.length > 0) {
      flushQuote();
    }

    paraLines.push(trimmed);
  }

  if (inCode && codeLines.length > 0) {
    htmlParts.push(
      `<div class="gh-code-block"><div class="gh-code-header"><span>${escapeHtml(
        codeLang
      )}</span></div><pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre></div>`
    );
  }
  flushAll();

  return htmlParts.join('\n');
}
