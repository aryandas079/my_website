import {
  siC,
  siCplusplus,
  siExpress,
  siFigma,
  siGit,
  siGithub,
  siHtml5,
  siJavascript,
  siKotlin,
  siNextdotjs,
  siNodedotjs,
  siNumpy,
  siPandas,
  siPostgresql,
  siPython,
  siReact,
  siScikitlearn,
  siScipy,
  siTailwindcss,
  siTypescript,
} from 'simple-icons';

export interface TechSkillItem {
  id: string;
  name: string;
  cppOutputName: string;
  assetPath: string;
  category: string;
  brandColor: string;
  svgMarkup: string;
}

/**
 * Wraps an official 24x24 Simple Icons vector path into a 256x256 SVG with generous margin.
 */
function wrapSimpleIconPath(pathData: string, fillHex: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.5 -1.5 27 27" width="256" height="256"><path fill="${fillHex}" d="${pathData}"/></svg>`;
}

const wrapCustomSvg = (inner: string, viewBox = '0 0 128 128'): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="256" height="256">${inner}</svg>`;

// Canonical Simple Icons CSS3 shield path (24x24 viewBox)
const SI_CSS3_PATH =
  'M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.414v-.001z';

// Canonical Simple Icons Visual Studio Code ribbon path (24x24 viewBox)
const SI_VSCODE_PATH =
  'M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z';

// Canonical C# Hexagon path matching official C++ hexagon geometry with '#' cutout
const SI_CSHARP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.5 -1.5 27 27" width="256" height="256">
  <path fill="#68217A" d="M22.394 6c-.167-.29-.398-.543-.652-.69L12.926.22c-.509-.294-1.34-.294-1.848 0L2.26 5.31c-.508.293-.923 1.013-.923 1.6v10.18c0 .294.104.62.271.91.167.29.398.543.652.69l8.816 5.09c.508.293 1.34.293 1.848 0l8.816-5.09c.254-.147.485-.4.652-.69.167-.29.27-.616.27-.91V6.91c.003-.294-.1-.62-.268-.91z"/>
  <path fill="#FFFFFF" d="M10.4 19.11c-3.92 0-7.109-3.19-7.109-7.11 0-3.92 3.19-7.11 7.11-7.11a7.133 7.133 0 016.156 3.553l-3.076 1.78a3.567 3.567 0 00-3.08-1.78A3.56 3.56 0 006.844 12 3.56 3.56 0 0010.4 15.555a3.57 3.57 0 003.08-1.778l3.078 1.78A7.135 7.135 0 0110.4 19.11z"/>
  <path fill="#FFFFFF" d="M16.1 8.4h1.15v7.2H16.1zm2.55 0h1.15v7.2h-1.15zM14.9 10.35h5.9v1.15h-5.9zm0 2.25h5.9v1.15h-5.9z"/>
</svg>`;

export const TECH_STACK_SKILLS: TechSkillItem[] = [
  {
    id: 'c',
    name: 'C',
    cppOutputName: 'C',
    assetPath: 'assets/C.png',
    category: 'Programming Languages',
    brandColor: '#283593',
    svgMarkup: wrapSimpleIconPath(siC.path, '#283593'),
  },
  {
    id: 'cpp',
    name: 'C++',
    cppOutputName: 'C++',
    assetPath: 'assets/C++.png',
    category: 'Programming Languages',
    brandColor: '#00599C',
    svgMarkup: wrapSimpleIconPath(siCplusplus.path, '#00599C'),
  },
  {
    id: 'csharp',
    name: 'C#',
    cppOutputName: 'C#',
    assetPath: 'assets/CSharp.png',
    category: 'Programming Languages',
    brandColor: '#68217A',
    svgMarkup: SI_CSHARP_SVG,
  },
  {
    id: 'python',
    name: 'Python',
    cppOutputName: 'Python',
    assetPath: 'assets/Python.png',
    category: 'Programming Languages',
    brandColor: '#3776AB',
    svgMarkup: wrapSimpleIconPath(siPython.path, '#3776AB'),
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    cppOutputName: 'JavaScript',
    assetPath: 'assets/JavaScript.png',
    category: 'Programming Languages',
    brandColor: '#C69F00',
    svgMarkup: wrapSimpleIconPath(siJavascript.path, '#C69F00'),
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    cppOutputName: 'TypeScript',
    assetPath: 'assets/TypeScript.png',
    category: 'Programming Languages',
    brandColor: '#3178C6',
    svgMarkup: wrapSimpleIconPath(siTypescript.path, '#3178C6'),
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    cppOutputName: 'Kotlin',
    assetPath: 'assets/Kotlin.png',
    category: 'Programming Languages',
    brandColor: '#7F52FF',
    svgMarkup: wrapSimpleIconPath(siKotlin.path, '#7F52FF'),
  },
  {
    id: 'html5',
    name: 'HTML5',
    cppOutputName: 'HTML5',
    assetPath: 'assets/HTML5.png',
    category: 'Web Technologies',
    brandColor: '#E34F26',
    svgMarkup: wrapSimpleIconPath(siHtml5.path, '#E34F26'),
  },
  {
    id: 'css3',
    name: 'CSS3',
    cppOutputName: 'CSS3',
    assetPath: 'assets/CSS3.png',
    category: 'Web Technologies',
    brandColor: '#1572B6',
    svgMarkup: wrapSimpleIconPath(SI_CSS3_PATH, '#1572B6'),
  },
  {
    id: 'tailwind',
    name: 'Tailwind',
    cppOutputName: 'Tailwind CSS',
    assetPath: 'assets/Tailwind.png',
    category: 'Web Technologies',
    brandColor: '#0891B2',
    svgMarkup: wrapSimpleIconPath(siTailwindcss.path, '#0891B2'),
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    cppOutputName: 'PostgreSQL',
    assetPath: 'assets/PostgreSQL.png',
    category: 'Database',
    brandColor: '#336791',
    svgMarkup: wrapSimpleIconPath(siPostgresql.path, '#336791'),
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    cppOutputName: 'Node.js',
    assetPath: 'assets/Nodejs.png',
    category: 'Frameworks & Libraries',
    brandColor: '#339933',
    svgMarkup: wrapSimpleIconPath(siNodedotjs.path, '#339933'),
  },
  {
    id: 'express',
    name: 'Express',
    cppOutputName: 'Express',
    assetPath: 'assets/Express.png',
    category: 'Frameworks & Libraries',
    brandColor: '#181816',
    svgMarkup: wrapSimpleIconPath(siExpress.path, '#181816'),
  },
  {
    id: 'react',
    name: 'React',
    cppOutputName: 'React',
    assetPath: 'assets/React.png',
    category: 'Frameworks & Libraries',
    brandColor: '#0284C7',
    svgMarkup: wrapSimpleIconPath(siReact.path, '#0284C7'),
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    cppOutputName: 'Next.js',
    assetPath: 'assets/Nextjs.png',
    category: 'Frameworks & Libraries',
    brandColor: '#181816',
    svgMarkup: wrapSimpleIconPath(siNextdotjs.path, '#181816'),
  },
  {
    id: 'numpy',
    name: 'NumPy',
    cppOutputName: 'NumPy',
    assetPath: 'assets/NumPy.png',
    category: 'Python Libraries',
    brandColor: '#013243',
    svgMarkup: wrapSimpleIconPath(siNumpy.path, '#013243'),
  },
  {
    id: 'pandas',
    name: 'Pandas',
    cppOutputName: 'Pandas',
    assetPath: 'assets/Pandas.png',
    category: 'Python Libraries',
    brandColor: '#150458',
    svgMarkup: wrapSimpleIconPath(siPandas.path, '#150458'),
  },
  {
    id: 'matplotlib',
    name: 'Matplotlib',
    cppOutputName: 'Matplotlib',
    assetPath: 'assets/Matplotlib.png',
    category: 'Python Libraries',
    brandColor: '#11557C',
    svgMarkup: wrapCustomSvg(`
      <circle cx="64" cy="64" r="52" fill="none" stroke="#11557C" stroke-width="7"/>
      <circle cx="64" cy="64" r="32" fill="none" stroke="#11557C" stroke-width="4" stroke-dasharray="9 6"/>
      <path fill="#11557C" d="M64 60L38 18a49 49 0 0 1 28-6z"/>
      <path fill="#2CA02C" d="M68 62l34-24a42 42 0 0 1 10 22z"/>
      <path fill="#E65100" d="M68 66l42 12a44 44 0 0 1-16 24z"/>
      <path fill="#C62828" d="M62 68l-10 44a45 45 0 0 1-26-14z"/>
      <path fill="#6A1B9A" d="M58 64L20 70a40 40 0 0 1 4-26z"/>
      <circle cx="64" cy="64" r="7" fill="#FFFFFF"/>
    `),
  },
  {
    id: 'seaborn',
    name: 'Seaborn',
    cppOutputName: 'Seaborn',
    assetPath: 'assets/Seaborn.png',
    category: 'Python Libraries',
    brandColor: '#36558A',
    svgMarkup: wrapCustomSvg(`
      <circle cx="64" cy="64" r="52" fill="none" stroke="#36558A" stroke-width="7"/>
      <path fill="#4C72B0" d="M16 56c16-16 32-16 48 0s32 16 48-4v14c-16 18-32 18-48 2S32 52 16 68z"/>
      <path fill="#2E4C7D" d="M18 78c16-14 32-12 48 2s30 14 44-4v15c-14 16-30 16-46 2S34 80 18 92z"/>
      <circle cx="44" cy="34" r="6" fill="#4C72B0"/>
      <circle cx="66" cy="28" r="4.5" fill="#4C72B0"/>
      <circle cx="84" cy="36" r="5.5" fill="#4C72B0"/>
    `),
  },
  {
    id: 'scipy',
    name: 'SciPy',
    cppOutputName: 'SciPy',
    assetPath: 'assets/SciPy.png',
    category: 'Python Libraries',
    brandColor: '#0054A6',
    svgMarkup: wrapSimpleIconPath(siScipy.path, '#0054A6'),
  },
  {
    id: 'scikit-learn',
    name: 'Scikit-learn',
    cppOutputName: 'Scikit-learn',
    assetPath: 'assets/ScikitLearn.png',
    category: 'Python Libraries',
    brandColor: '#E67700',
    svgMarkup: wrapSimpleIconPath(siScikitlearn.path, '#E67700'),
  },
  {
    id: 'git',
    name: 'Git',
    cppOutputName: 'Git',
    assetPath: 'assets/Git.png',
    category: 'Tools',
    brandColor: '#F05032',
    svgMarkup: wrapSimpleIconPath(siGit.path, '#F05032'),
  },
  {
    id: 'github',
    name: 'GitHub',
    cppOutputName: 'GitHub',
    assetPath: 'assets/GitHub.png',
    category: 'Tools',
    brandColor: '#181717',
    svgMarkup: wrapSimpleIconPath(siGithub.path, '#181717'),
  },
  {
    id: 'vscode',
    name: 'VS Code',
    cppOutputName: 'VS Code',
    assetPath: 'assets/VSCode.png',
    category: 'Tools',
    brandColor: '#007ACC',
    svgMarkup: wrapSimpleIconPath(SI_VSCODE_PATH, '#007ACC'),
  },
  {
    id: 'photoshop',
    name: 'Photoshop',
    cppOutputName: 'Photoshop',
    assetPath: 'assets/Photoshop.png',
    category: 'Design & Creative Tools',
    brandColor: '#001E36',
    svgMarkup: wrapCustomSvg(`
      <rect x="10" y="10" width="108" height="108" rx="22" fill="#001E36"/>
      <path fill="#FFFFFF" d="M34 89V39h19c11.2 0 18 5.9 18 15.6 0 10-7.1 16.2-18.6 16.2H44.5V89H34zm10.5-25.8h7.5c5.6 0 8.8-2.8 8.8-7.7 0-4.8-3.2-7.3-8.8-7.3h-7.5v15zm45.2 26.6c-7 0-12.8-2.7-16-6.4l5-6.6c2.9 3 6.8 4.8 11 4.8 4.1 0 6.4-1.6 6.4-4.1 0-2.6-2.3-3.6-6.8-5l-3.5-1.1c-6.5-2.1-10.6-5.3-10.6-11.5 0-7 5.8-11.8 14.4-11.8 6.2 0 11.3 2.3 14.5 5.6l-4.6 6.3c-2.6-2.4-6-3.9-9.7-3.9-3.6 0-5.8 1.4-5.8 3.6 0 2.3 2 3.2 6.3 4.5l3.5 1.1c7.1 2.2 11.3 5.5 11.3 12 0 7.5-6 12.5-15.4 12.5z"/>
    `),
  },
  {
    id: 'lightroom',
    name: 'Lightroom',
    cppOutputName: 'Lightroom',
    assetPath: 'assets/Lightroom.png',
    category: 'Design & Creative Tools',
    brandColor: '#001E36',
    svgMarkup: wrapCustomSvg(`
      <rect x="10" y="10" width="108" height="108" rx="22" fill="#001E36"/>
      <path fill="#FFFFFF" d="M34 89V39h10.6v40h21V89H34zm40.5 0V52.5h10v5.9c2.2-4.2 5.8-6.6 10.7-6.6 1.3 0 2.4.2 3.2.4v9.7c-1-.3-2.2-.4-3.7-.4-5.6 0-9.9 3.6-9.9 10.7V89H74.5z"/>
    `),
  },
  {
    id: 'premiere',
    name: 'Premiere Pro',
    cppOutputName: 'Premiere Pro',
    assetPath: 'assets/PremierePro.png',
    category: 'Design & Creative Tools',
    brandColor: '#00005B',
    svgMarkup: wrapCustomSvg(`
      <rect x="10" y="10" width="108" height="108" rx="22" fill="#00005B"/>
      <path fill="#FFFFFF" d="M35 89V39h19c11.2 0 18 5.9 18 15.6 0 10-7.1 16.2-18.6 16.2H45.5V89H35zm10.5-25.8H53c5.6 0 8.8-2.8 8.8-7.7 0-4.8-3.2-7.3-8.8-7.3h-7.5v15zM78 89V52.5h10v5.9c2.2-4.2 5.8-6.6 10.7-6.6 1.3 0 2.4.2 3.2.4v9.7c-1-.3-2.2-.4-3.7-.4-5.6 0-9.9 3.6-9.9 10.7V89H78z"/>
    `),
  },
  {
    id: 'figma',
    name: 'Figma',
    cppOutputName: 'Figma',
    assetPath: 'assets/Figma.png',
    category: 'Design & Creative Tools',
    brandColor: '#181816',
    svgMarkup: wrapSimpleIconPath(siFigma.path, '#181816'),
  },
  {
    id: 'canva',
    name: 'Canva',
    cppOutputName: 'Canva',
    assetPath: 'assets/Canva.png',
    category: 'Design & Creative Tools',
    brandColor: '#008B94',
    svgMarkup: wrapCustomSvg(`
      <circle cx="64" cy="64" r="54" fill="#008B94"/>
      <path fill="#FFFFFF" d="M82.5 75.5c-3.1 5.6-9.1 10-16.4 10-10.4 0-17-8.2-17-20.3 0-14.8 9.5-26.2 21-26.2 6.4 0 10.8 3.3 10.8 7.9 0 3.6-2.1 6.1-5.4 6.1-2.6 0-4.1-1.8-4.1-4 0-1.7.9-2.8 1.9-3.7-.9-.7-2.4-1.1-3.9-1.1-7.1 0-12.2 8.1-12.2 19.4 0 9.1 4.4 14.9 11.6 14.9 5.5 0 10-3.2 12.5-7.3l1.2 4.3z"/>
    `),
  },
];

const logoImageCache = new Map<string, HTMLImageElement>();

export function getSkillLogoImage(skill: TechSkillItem): Promise<HTMLImageElement> {
  const cached = logoImageCache.get(skill.id);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      logoImageCache.set(skill.id, img);
      resolve(img);
    };
    img.onerror = (err) => reject(err);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(skill.svgMarkup)}`;
  });
}

export function preloadAllSkillLogos(): void {
  if (typeof window === 'undefined') return;
  for (const skill of TECH_STACK_SKILLS) {
    void getSkillLogoImage(skill).catch(() => {});
  }
}
