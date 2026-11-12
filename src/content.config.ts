import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    kind: z.enum(['flagship', 'automation', 'experiment']),
    order: z.number(),
    started: z.string(), // YYYY-MM
    status: z.enum(['live', 'beta', 'wip', 'local', 'done']),
    stack: z.array(z.string()),
    stats: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    shots: z.array(z.object({ src: z.string(), alt: z.string() })).default([]),
    repo: z.string().default('private'), // 'private' or a public URL
    note: z.string().optional(),
  }),
});

export const collections = { projects };
