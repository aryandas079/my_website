import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    facility: z.string(),
    publishedAt: z.string(),
    readTime: z.string(),
    impactMetric: z.string(),
    summary: z.string(),
    coverImage: z.string(),
    coverAlt: z.string(),
    featuredOrder: z.number(),
    regionId: z.enum(['nordic-01', 'pacific-04', 'alpine-02']),
    metrics: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        delta: z.string(),
      })
    ),
  }),
});

export const collections = {
  'case-studies': caseStudies,
};
