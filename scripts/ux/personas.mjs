// UX reviewer personas for the portfolio. There is no login: a person is defined by where they arrive (`start`),
// what their browser remembers from earlier visits (`localStorage`, the site stores nothing today) and what they
// want (`brief`, read by the reviewer). env.mjs writes one Playwright storage-state per persona; ux.mjs
// `close` + `open` = the same person coming back later.

export const PERSONAS = {
  recruiter: {
    start: '/',
    device: 'iphone',
    brief: 'I am a tech recruiter. I tapped the link on Fabio\'s LinkedIn profile, on my phone, between two calls. '
      + 'I have about two minutes. I want to understand what kind of developer he is, see his best project, and find '
      + 'how to contact him. I have never used vim and I do not know what it is.',
    localStorage: {},
  },
  'hiring-engineer': {
    start: '/',
    device: 'desktop',
    brief: 'I am an engineering lead screening a candidate, on my laptop. I want depth: how the biggest project is '
      + 'architected, what he actually built himself vs. used, how he works with AI agents, and whether I can see '
      + 'any code. I am sceptical of portfolios that are all buzzwords.',
    localStorage: {},
  },
  'vim-user': {
    start: '/',
    device: 'desktop',
    brief: 'I live in vim. The site looks like vim, so I will try to drive it like vim: j/k, gg/G, :e, :ls, :q, '
      + 'maybe / to search, Ctrl-o to go back. I want the keys to behave like I expect, and I will notice when they '
      + 'do not. I also want to find the AI tooling page.',
    localStorage: {},
  },
  'small-business': {
    start: '/projects/personal-finances/',
    device: 'android',
    brief: 'I run a small shop and I am not technical. A friend sent me this link on WhatsApp saying "this guy built '
      + 'a Telegram bot for his finances, he could do one for your shop". I want to understand what it does in plain '
      + 'words, see if he does this kind of work for other people, and message him on WhatsApp.',
    localStorage: {},
  },
};
