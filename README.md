# Aryan Das — Personal Portfolio

A minimalist, high-performance personal landing page and portfolio for **Aryan Das** (Electrical Engineering undergraduate at NIT Silchar, Aspiring Data Scientist & ML Engineer).

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Bundler & Tooling:** Vite
- **Styling:** Tailwind CSS + Lucide Icons
- **Animation:** Motion (Framer Motion)

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
If you're using API-dependent features, copy the `.env.example` file:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scripts

- `npm run dev` - Starts the local development server at port 3000
- `npm run build` - Generates optimized production build in `dist/`
- `npm run preview` - Locally preview the production build
- `npm run lint` - Runs TypeScript type-checking

---

## Deployment to GitHub Pages

This repository is set up with an automated GitHub Actions deployment workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Configure GitHub Pages deployment"
   git push origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. Every push to `main` will automatically build and deploy your site to `https://aryandas079.github.io/my_website/`.
