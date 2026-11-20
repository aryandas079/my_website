import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyUnbundledSrcAssets() {
  return {
    name: 'copy-unbundled-src-assets',
    apply: 'build',
    closeBundle(error) {
      if (error) return;
      const distDir = path.resolve(__dirname, 'dist');
      const srcAssets = path.resolve(__dirname, 'src/assets');
      const distAssets = path.resolve(distDir, 'src/assets');
      if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
        fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
      }
    },
  };
}

function liveGithubPinsProxy() {
  const attachMiddleware = (middlewares) => {
    middlewares.use('/api/github-pins', async (req, res) => {
      try {
        const urlObj = new URL(req.url || '/', 'http://localhost');
        const username = (urlObj.searchParams.get('user') || 'aryandas079').replace(/[^a-zA-Z0-9-]/g, '');

        // 1. Fetch live GitHub profile HTML with zero cache to get exact real-time pinned repo names & order
        let pinnedRefs = [];
        try {
          const profileRes = await fetch(`https://github.com/${encodeURIComponent(username)}`, {
            cache: 'no-store',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; PortfolioPinSync/1.0)',
              Accept: 'text/html',
              'Cache-Control': 'no-cache',
            },
          });
          if (profileRes.ok) {
            const html = await profileRes.text();
            // Extract pinned items strictly inside the pinned-items list container
            const listMatch = html.match(/js-pinned-items-reorder-list[\s\S]*?<\/ol>/i);
            const scopeHtml = listMatch ? listMatch[0] : html;
            const itemRegex = /<a[^>]+href="\/([^"\/]+)\/([^"\/]+)"[^>]*>[\s\S]*?<span[^>]*class="repo"[^>]*>([\s\S]*?)<\/span>/gi;
            let m;
            const seen = new Set();
            while ((m = itemRegex.exec(scopeHtml)) !== null) {
              const owner = m[1].trim();
              const repoName = m[2].trim();
              const key = `${owner}/${repoName}`.toLowerCase();
              if (!seen.has(key)) {
                seen.add(key);
                pinnedRefs.push({ owner, name: repoName });
              }
            }
            // Fallback simpler span.repo match if GitHub markup structure shifts slightly
            if (pinnedRefs.length === 0) {
              const simpleRegex = /class="repo"[^>]*>([^<]+)</gi;
              while ((m = simpleRegex.exec(scopeHtml)) !== null) {
                const repoName = m[1].trim();
                const key = `${username}/${repoName}`.toLowerCase();
                if (repoName && !seen.has(key)) {
                  seen.add(key);
                  pinnedRefs.push({ owner: username, name: repoName });
                }
              }
            }
          }
        } catch {
          // Will fall back to pinned.berrysauce.dev below
        }

        // Fallback to public pinned API if direct HTML scrape returned empty
        if (pinnedRefs.length === 0) {
          try {
            const berryRes = await fetch(`https://pinned.berrysauce.dev/get/${encodeURIComponent(username)}`, {
              cache: 'no-store',
            });
            if (berryRes.ok) {
              const arr = await berryRes.json();
              if (Array.isArray(arr)) {
                pinnedRefs = arr
                  .filter((item) => item && typeof item.name === 'string')
                  .map((item) => ({
                    owner: typeof item.author === 'string' && item.author ? item.author : username,
                    name: item.name,
                    fallbackDescription: typeof item.description === 'string' ? item.description : '',
                    fallbackLanguage: typeof item.language === 'string' ? item.language : '',
                    fallbackLanguageColor: typeof item.languageColor === 'string' ? item.languageColor : '',
                    fallbackStars: typeof item.stars === 'number' ? item.stars : 0,
                    fallbackForks: typeof item.forks === 'number' ? item.forks : 0,
                  }));
              }
            }
          } catch {
            // Handled below
          }
        }

        // 2. Fetch live repository metadata from GitHub REST API for full details
        const repoMetaMap = new Map();
        try {
          const ghHeaders = {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'PortfolioPinSync/1.0',
          };
          if (process.env.GITHUB_TOKEN) {
            ghHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
          }
          const reposRes = await fetch(
            `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
            { cache: 'no-store', headers: ghHeaders }
          );
          if (reposRes.ok) {
            const repos = await reposRes.json();
            if (Array.isArray(repos)) {
              for (const r of repos) {
                if (r && typeof r.name === 'string') {
                  repoMetaMap.set(r.name.toLowerCase(), r);
                }
              }
            }
          }
        } catch {
          // Continue with partial pin metadata
        }

        const pins = pinnedRefs.slice(0, 6).map((ref) => {
          const live = repoMetaMap.get(ref.name.toLowerCase());
          const spdx =
            live && live.license && typeof live.license === 'object' && live.license.spdx_id && live.license.spdx_id !== 'NOASSERTION'
              ? `${live.license.spdx_id} license`
              : '';
          return {
            owner: ref.owner || username,
            name: live && typeof live.name === 'string' ? live.name : ref.name,
            description:
              (live && typeof live.description === 'string' && live.description.trim()) ||
              ref.fallbackDescription ||
              '',
            language:
              (live && typeof live.language === 'string' && live.language.trim()) ||
              ref.fallbackLanguage ||
              '',
            languageColor: ref.fallbackLanguageColor || '',
            stars:
              live && typeof live.stargazers_count === 'number'
                ? live.stargazers_count
                : ref.fallbackStars || 0,
            forks:
              live && typeof live.forks_count === 'number'
                ? live.forks_count
                : ref.fallbackForks || 0,
            defaultBranch: (live && typeof live.default_branch === 'string' && live.default_branch) || 'main',
            license: spdx,
            url:
              (live && typeof live.html_url === 'string' && live.html_url) ||
              `https://github.com/${ref.owner || username}/${ref.name}`,
            homepage: (live && typeof live.homepage === 'string' && live.homepage.trim()) || '',
            pushedAt:
              (live && typeof live.pushed_at === 'string' && live.pushed_at) ||
              (live && typeof live.updated_at === 'string' && live.updated_at) ||
              '',
            topics: live && Array.isArray(live.topics) ? live.topics : [],
          };
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.end(JSON.stringify({ username, pins, fetchedAt: Date.now() }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: String(err), pins: [] }));
      }
    });
  };

  return {
    name: 'live-github-pins-proxy',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  integrations: [svelte(), mdx()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  vite: {
    plugins: [tailwindcss(), copyUnbundledSrcAssets(), liveGithubPinsProxy()],
    server: {
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  },
});
