# Aryan Das — Portfolio

Personal portfolio and landing page for Aryan Das, an Electrical Engineering
undergraduate at NIT Silchar who is building toward a career in data science,
machine learning, and software development.

**Live site:** [aryandas079.github.io/my_website](https://aryandas079.github.io/my_website/)

## Highlights

- Responsive single-page portfolio with light and dark themes
- Interactive hero section with portrait artwork and specialty animation
- Skills explorer with categorized technologies
- Interactive projects roadmap with project details, GitHub links, and live demos
- Credential and certification showcase
- Resume download and contact links
- Social links for GitHub, LinkedIn, Instagram, X, Discord, and ORCID
- GitHub Pages deployment through GitHub Actions

## Tech stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Motion
- Lucide React

## Run locally

### Prerequisites

- Node.js 20 or newer
- npm

### Installation

```bash
npm install
npm run dev
```

The development server runs at [http://localhost:3000](http://localhost:3000).

The portfolio does not require an API key for its standard local or production
build. The `.env.example` file is retained for AI Studio integrations.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Run the TypeScript type-checker |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run clean` | Remove generated build output |

Before opening a pull request, run:

```bash
npm run lint
npm run build
```

## Project structure

```text
.
├── public/
│   ├── assets/              # Portfolio images, logos, credentials, and resume
│   └── favicon.svg
├── src/
│   ├── components/          # Interactive portfolio sections and visual components
│   ├── data/                # Portfolio content and metadata
│   ├── utils/               # Shared helpers, including deployment-safe asset paths
│   ├── App.tsx              # Main page layout and navigation
│   └── index.css            # Global styles and theme surfaces
├── .github/workflows/
│   └── deploy.yml           # GitHub Pages build and deployment workflow
└── vite.config.ts           # Vite and GitHub Pages configuration
```

## Updating portfolio content

- Edit personal information, projects, and resume metadata in
  [`src/data/portfolioData.ts`](./src/data/portfolioData.ts).
- Add or replace images under [`public/assets/`](./public/assets/).
- Keep public asset references deployment-safe by using the shared
  [`assetPath`](./src/utils/assetPath.ts) helper for assets used in React code.
- Update social links and navigation in [`src/App.tsx`](./src/App.tsx).

## Deployment

The repository deploys automatically to GitHub Pages whenever changes are
pushed to `main` or `master`. The workflow is defined in
[`deploy.yml`](./.github/workflows/deploy.yml).

The production build automatically uses `/my_website/` as its Vite base path
when running in GitHub Actions, so images, the resume, styles, and JavaScript
bundles work correctly on the project page URL.

To deploy manually:

```bash
npm run build
```

Then publish the generated `dist/` directory using a static hosting provider.

## License

This repository contains personal portfolio content and assets. Please do not
reuse personal images, credentials, or written content without permission.
