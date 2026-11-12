# nunseik.github.io

Personal portfolio. Built with [Astro](https://astro.build) and dressed up as a vim buffer.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
```

## Adding a project

Drop a Markdown file in `src/content/projects/`. The frontmatter schema lives in
`src/content.config.ts` (`kind`: flagship | automation | experiment, `order` sets position).
Screenshots go in `public/shots/<project>/`. Resize them first, for example:
`sips -s format jpeg -s formatOptions 72 --resampleWidth 540 in.png --out out.jpg`.

## Deploy

Pushing to `main` deploys through `.github/workflows/deploy.yml`.
The repo must be named `nunseik.github.io`, and Settings → Pages → Source must be set to **GitHub Actions**.

## Keys

`j/k` next/previous link · `Enter` open · `gg/G` · `-` up · `1–4` tabs · `:e <project>` · `:ls` · `?` help
