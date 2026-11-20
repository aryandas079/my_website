# Aryan Das - Developer Portfolio

Personal website and 3D portfolio for Aryan Das, an Electrical Engineering undergraduate at NIT Silchar developing software across machine learning, web systems, and creative engineering.

Live website: https://aryandas079.github.io/my_website/

---

## Overview

This repository contains the full source code for the personal portfolio of Aryan Das. Built as a high-performance single-page application using Astro, Svelte 5, Three.js, and Tailwind CSS, the site integrates interactive 3D particle systems, binary scanline canvas renderings, live GitHub repository synchronization, and detailed technical project breakdowns.

---

## Key Features

- Single-page 3D narrative architecture with scroll-driven transitions
- Interactive Three.js particle systems, holographic waving flag, and procedural binary rain
- Svelte 5 component islands for high performance and low client runtime overhead
- Hero experience with responsive typography and real-time GPU-accelerated particle morphing
- Live GitHub repository synchronization for active projects and star counts
- Interactive skills drum showcasing languages, frameworks, developer tools, and data science libraries
- Interactive neural network graph representing credentials and certifications
- Responsive layout with support for desktop monitors, laptops, tablets, foldables, and mobile screens
- Automated GitHub Actions deployment to GitHub Pages

---

## Tech Stack

### Core Frameworks and Runtimes
- Astro 5: Static site generator and island architecture orchestrator
- Svelte 5: Reactive UI components and state management (runes)
- TypeScript: Type safety across all modules and data structures

### Graphics and Styling
- Three.js: 3D scene rendering, custom shaders, and particle geometry
- GSAP (GreenSock Animation Platform): Tweening and scroll-linked timeline interpolation
- Tailwind CSS 4: Utility-first styling with responsive design tokens
- Simple Icons & Lucide: Vector brand and UI icons

---

## Project Structure

```text
.
|-- .github/
|   `-- workflows/
|       `-- deploy.yml             # GitHub Actions workflow for automated Pages deployment
|-- public/
|   |-- assets/
|   |   `-- aistudio/              # Profile photographs and resume document
|   `-- favicon.svg                # Custom ArD monogram SVG favicon
|-- src/
|   |-- components/
|   |   `-- islands/               # Svelte islands (Hero, About, Projects, Skills, Finale)
|   |-- content/
|   |   `-- case-studies/          # MDX technical case study documents
|   |-- layouts/
|   |   `-- DashboardLayout.astro  # Base HTML shell with metadata and favicon configuration
|   |-- lib/
|   |   |-- credentials/           # Certification data and graph node layout models
|   |   |-- data/                  # General portfolio profile definitions
|   |   |-- github/                # GitHub API integration and cache layer
|   |   |-- skills/                # Technology catalog and icons mapping
|   |   `-- three/                 # Three.js controllers, particles, and cursor scenes
|   |-- pages/
|   |   |-- index.astro            # Root portfolio landing page
|   |   `-- case-studies/[slug].astro # Dynamic case study route
|   `-- styles/
|       `-- global.css             # Theme variables, typography, and viewport adjustments
|-- astro.config.mjs               # Astro configuration with Vite plugins and GitHub Pages base path
|-- package.json                   # Project dependencies and script declarations
`-- tsconfig.json                  # TypeScript compiler settings
```

---

## Local Development

### Prerequisites

- Node.js 20.x or newer
- npm (Node Package Manager)

### Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/aryandas079/my_website.git
   cd my_website
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open the development server in your browser:
   ```text
   http://localhost:3000
   ```

---

## Available Scripts

| Command | Action |
| --- | --- |
| `npm run dev` | Starts the Astro local development server |
| `npm run build` | Compiles and generates the production static site in `dist/` |
| `npm run preview` | Runs a local server to inspect the built `dist/` bundle |
| `npm run lint` | Runs type checking across TypeScript and Astro files |
| `npm run clean` | Cleans build caches and previous build artifacts |

---

## Deployment

The project is configured for automated deployment via GitHub Actions:

1. Every push to the `main` branch triggers the `.github/workflows/deploy.yml` pipeline.
2. The workflow installs project dependencies, builds the production bundle with Astro, and packages the `dist/` directory.
3. The bundle is published to GitHub Pages using the official GitHub Pages deployment action.

---

## Contact and Links

- Portfolio: https://aryandas079.github.io/my_website/
- GitHub: https://github.com/aryandas079
- LinkedIn: https://www.linkedin.com/in/iam-aryandas
- Email: aryandas.original@gmail.com
- ORCID: https://orcid.org/0009-0009-9012-4034

---

## License

This repository and its contents, including code, design implementations, and personal media assets, are maintained by Aryan Das.
