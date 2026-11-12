import { getCollection } from 'astro:content';
export async function byKind() {
  const all = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
  return {
    all,
    flagship: all.filter((p) => p.data.kind === 'flagship'),
    automation: all.filter((p) => p.data.kind === 'automation'),
    experiment: all.filter((p) => p.data.kind === 'experiment'),
  };
}
