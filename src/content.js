// ─────────────────────────────────────────────────────────────
//  Весь контент сайта. Меняйте только этот файл.
// ─────────────────────────────────────────────────────────────

export const content = {
  name: 'Your Name',
  role: 'Creative Developer',
  email: 'hello@example.com',

  // Большие 3D-надписи, которые рендерятся в ASCII
  // (hero — монограмма, projects — заголовок списка работ, mail — футер)
  shapes: {
    hero: 'YN',
    projects: 'Selected projects',
    projectsMobile: ['Selected', 'projects'],
    mail: "Let's talk",
    mailMobile: ["Let's", 'talk'],
  },

  // Абзацы блока «обо мне» (можно HTML)
  description: [
    "I'm Your Name, a creative developer who loves making the web move.",
    'I build interactive websites, WebGL experiences and motion-heavy interfaces, working closely with designers from the first sketch to production.',
    'I care about technical rigor without the jargon, real collaboration, and quality that holds up in production.',
    'Years in, I still get the same kick when something on screen comes alive.',
  ],

  // Работы. awards — список наград; сводка «Awwwards × N» справа от
  // описания считается автоматически по всем проектам
  works: [
    { title: 'Project Aurora', url: 'https://example.com', agency: 'Studio', position: 'Tech lead', awards: ['Awwwards SOTD', 'CssDA'], year: 2026 },
    { title: 'Northwind', url: 'https://example.com', agency: 'Studio', position: 'Developer', awards: ['FWA'], year: 2026 },
    { title: 'Mono Type', url: 'https://example.com', agency: 'Freelance', position: 'Tech lead & Developer', awards: ['Awwwards HM', 'CssDA', 'FWA'], year: 2025 },
    { title: 'Glass House', url: 'https://example.com', agency: 'Studio', position: 'Developer', awards: [], year: 2025 },
    { title: 'Orbit', url: 'https://example.com', agency: 'Agency', with: 'Studio', position: 'Developer', awards: ['CssDA'], year: 2024 },
    { title: 'Field Notes', url: 'https://example.com', agency: 'Agency', position: 'Tech lead', awards: ['Awwwards SOTD'], year: 2024 },
    { title: 'Low Tide', url: 'https://example.com', agency: 'Freelance', position: 'Developer', awards: [], year: 2023 },
    { title: 'Paper Planes', url: 'https://example.com', agency: 'Agency', position: 'Developer', awards: ['FWA'], year: 2023 },
    { title: 'Signal', url: 'https://example.com', agency: 'Studio', position: 'Tech lead & Developer', awards: ['Awwwards HM', 'CssDA'], year: 2022 },
    { title: 'Halftone', url: 'https://example.com', agency: 'Freelance', position: 'Developer', awards: [], year: 2021 },
  ],

  footerText: "Have a project in mind or just want to connect? <br>I'm always up for a good conversation. ...",

  socials: [
    { label: 'Email', url: 'mailto:hello@example.com' },
    { label: 'GitHub', url: 'https://github.com/' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/' },
  ],

  fonts: ['Andale Mono', 'Roboto Flex'],
  design: { label: 'Your Name', url: '#' },
}
