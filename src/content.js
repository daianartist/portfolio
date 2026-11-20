// ─────────────────────────────────────────────────────────────
//  Весь контент сайта. Меняйте только этот файл.
//  Медиа лежат в public/media/ и указываются путём 'media/…'
// ─────────────────────────────────────────────────────────────

const GH = 'https://github.com/daianartist'

export const content = {
  name: 'Daiana Arapbekova',
  role: 'Backend & Game Developer',
  email: 'daianaarapbekova@gmail.com',
  cv: 'media/cv-daiana-arapbekova.pdf',

  // Большие 3D-надписи, которые рендерятся в ASCII
  shapes: {
    hero: 'DA',
    projects: 'Selected projects',
    projectsMobile: ['Selected', 'projects'],
    mail: "Let's talk",
    mailMobile: ["Let's", 'talk'],
  },

  // Орнаменты, которые по очереди крутятся в ASCII рядом с блоком «обо мне»
  ornaments: ['media/ornaments/oyu.png', 'media/ornaments/Vector-2.png', 'media/ornaments/Vector-3.png', 'media/ornaments/ayshyk.png'],

  // Абзацы блока «обо мне» (можно HTML)
  description: [
    "I'm Daiana Arapbekova — a backend engineer and game developer from Astana, crafting resilient distributed backends and atmospheric 3D interactive worlds.",
    'Computer Science undergraduate at Cardiff University Kazakhstan, bridging distributed backend engineering (Go, Python) and interactive 3D game development (Unity, C#, Maya).',
    'Focused on clean architecture, fault-tolerant pipelines, and atmospheric visual storytelling.',
    'Currently automating IT support at KAR Technology — building a fault-tolerant HikCentral API integration for security alarms and CCTV video analytics.',
  ],

  // Короткие факты справа от описания
  facts: [
    'Currently — IT Automation @ KAR Technology',
    'Based in Astana, KZ',
    'Cardiff University Kazakhstan',
    '51.1694° N, 71.4491° E',
  ],

  // Работы. Каждая группа — подзаголовок в списке.
  // media — картинки и видео (.mp4) для окна проекта; links — кнопки-ссылки
  workGroups: [
    {
      label: 'Backend systems',
      works: [
        {
          title: '1337b04rd',
          subtitle: 'Anonymous Imageboard',
          category: 'Backend',
          stack: ['Go', 'PostgreSQL', 'MinIO', 'Hexagonal Architecture'],
          desc: 'Anonymous imageboard built in Go. Visitors receive a Rick and Morty character as a temporary identity and can publish image threads and comments without registration. PostgreSQL stores posts and sessions, MinIO stores images, and expired threads move to a read-only archive.',
          flow: 'HTTP Layer ──▶ Hexagonal Service ──▶ PostgreSQL\n                       │\n             MinIO Image Storage\n                       │\n             Expiring Threads → Archive',
          links: [{ label: 'GitHub', url: `${GH}/1337b04rd` }],
        },
        {
          title: 'Ride Hail',
          subtitle: 'Microservices Taxi Backend',
          category: 'Backend',
          stack: ['Go', 'PostgreSQL', 'PostGIS', 'RabbitMQ', 'WebSockets', 'JWT'],
          desc: 'Go microservices coordinate the ride lifecycle across ride, driver/location, and admin services. RabbitMQ handles ride and driver events; PostGIS supports nearby-driver matching, with WebSockets for offers and live updates.',
          flow: 'Ride API ──▶ RabbitMQ ──▶ Driver Matching\n    │                         │\n PostgreSQL + PostGIS ◀── WebSockets',
          links: [{ label: 'GitHub', url: `${GH}/ride-hail` }],
        },
        {
          title: 'Marketflow',
          subtitle: 'Real-Time Market Data',
          category: 'Backend',
          stack: ['Go', 'PostgreSQL', 'Redis', 'Worker Pools', 'Hexagonal Architecture'],
          desc: 'Concurrent Go service for live or simulated crypto price streams. Aggregates per-minute min/max/average statistics, stores results in PostgreSQL, and caches latest prices in Redis behind a REST API.',
          flow: 'Exchange Streams ──▶ Worker Pools\n       │                 │\n     Redis ◀── Aggregation ──▶ PostgreSQL',
          links: [{ label: 'GitHub', url: `${GH}/marketflow` }],
        },
        {
          title: 'Where’s My Pizza',
          subtitle: 'Distributed Order System',
          category: 'Backend',
          stack: ['Go', 'PostgreSQL', 'RabbitMQ', 'REST API'],
          desc: 'Restaurant order workflow split into an HTTP order service, kitchen workers, and a notification subscriber. RabbitMQ carries order and status events; PostgreSQL persists orders and worker data.',
          flow: 'HTTP Order API ──▶ PostgreSQL\n       │\n   RabbitMQ ──▶ Kitchen Worker ──▶ Notifications',
          links: [{ label: 'GitHub', url: `${GH}/where-is-my-pizza` }],
        },
        {
          title: 'Attendance Control',
          subtitle: 'Campus Attendance Platform',
          category: 'Backend & Mobile',
          year: '2024–25',
          stack: ['C#', '.NET MAUI', 'Python (Flask)', 'PostgreSQL', 'QR', 'Geofencing'],
          desc: 'Campus attendance platform for 900+ users, combining QR check-ins, geofencing validation around campus, a cross-platform .NET MAUI mobile app, and an administrative analytics dashboard.',
          flow: ' .NET MAUI App ──▶ Flask API ──▶ PostgreSQL\n    QR + GPS          │\n               Geofence Validation\n                      │\n             Admin Analytics Dashboard',
          media: ['media/attendance-1.png', 'media/attendance-2.png', 'media/attendance-3.png', 'media/attendance-4.png'],
        },
        {
          title: 'Hot Coffee',
          subtitle: 'Coffee Shop Management API',
          category: 'Backend',
          stack: ['Go', 'REST API', 'Layered Architecture', 'JSON'],
          desc: 'REST API for coffee shop operations: orders, menu, inventory, and sales reports. Uses handler, service, and repository layers with JSON-file persistence and automatic ingredient deduction when orders are fulfilled.',
          flow: 'REST API ──▶ Services ──▶ JSON Repositories\n                 │\n          Inventory Updates',
          links: [{ label: 'GitHub', url: `${GH}/hot-coffee` }],
        },
        {
          title: 'RSSHub',
          subtitle: 'RSS Feed Aggregator',
          category: 'Backend',
          stack: ['Go', 'PostgreSQL', 'Worker Pool', 'CLI'],
          desc: 'CLI RSS aggregator that fetches and parses feeds, stores articles in PostgreSQL, and runs background aggregation with a configurable worker pool. Fetch interval and worker count can be changed while it runs.',
          flow: 'RSS Feeds ──▶ Worker Pool ──▶ PostgreSQL\n                   ▲\n             CLI Controls',
          links: [{ label: 'GitHub', url: `${GH}/RSShub` }],
        },
        {
          title: 'OwnRedis',
          subtitle: 'In-Memory Key-Value Store',
          category: 'Backend',
          stack: ['Go', 'UDP', 'Concurrency', 'TTL'],
          desc: 'Lightweight Redis-inspired key-value server over UDP. Supports PING, SET, and GET, concurrent access with mutexes, PX-based key expiration, and background cleanup.',
          flow: 'UDP Clients ──▶ Command Handler ──▶ In-Memory Store\n                                      │\n                               Expiration Cleanup',
          links: [{ label: 'GitHub', url: `${GH}/OwnRedis` }],
        },
        {
          title: 'triple-s',
          subtitle: 'Simple Storage Service',
          category: 'Backend',
          stack: ['Go', 'REST API', 'File Storage', 'S3-like'],
          desc: 'Standard-library Go server exposing S3-like bucket and object operations. Stores objects on disk and keeps bucket and object metadata in CSV files.',
          flow: 'REST API ──▶ Bucket / Object Operations ──▶ Disk\n                         │\n                   CSV Metadata',
          links: [{ label: 'GitHub', url: `${GH}/Triple_S` }],
        },
        {
          title: 'CreditCard',
          subtitle: 'Card Utility CLI',
          category: 'CLI',
          stack: ['Go', 'CLI', 'Luhn Algorithm'],
          desc: 'Command-line tool to validate card numbers with Luhn, generate candidates from masked templates, inspect brand and issuer data, and issue valid numbers. Accepts arguments or stdin.',
          flow: 'Arguments / stdin ──▶ Luhn & Card Data\n                           │\n              Validate · Generate · Inspect · Issue',
          links: [{ label: 'GitHub', url: `${GH}/creditcard` }],
        },
        {
          title: 'Markov Chain',
          subtitle: 'Text Generator',
          category: 'CLI',
          stack: ['Go', 'CLI', 'Markov Chains'],
          desc: 'Go CLI that builds a word-transition model from stdin and generates text. Supports configurable output length, starting prefix, and prefix length, with input validation and clear errors.',
          flow: 'Text Input ──▶ Markov State Table ──▶ Generated Text\n                      ▲\n             Prefix / Length Options',
          links: [{ label: 'GitHub', url: `${GH}/Markov-chain` }],
        },
        {
          title: 'CSV Parser',
          subtitle: 'A Library for Others',
          category: 'Library',
          stack: ['Go', 'io.Reader', 'CSV Parsing'],
          desc: 'Streaming CSV parser that reads line by line from io.Reader, handles quoted and escaped fields, empty fields, and final lines without a newline, and reports malformed quotes with ErrQuote.',
          flow: 'io.Reader ──▶ Line Parser ──▶ CSV Fields\n                    └──────▶ ErrQuote',
          links: [{ label: 'GitHub', url: `${GH}/aLibraryForOthers` }],
        },
        {
          title: 'Bitmap',
          subtitle: 'Image Processing CLI',
          category: 'CLI',
          stack: ['Go', 'CLI', 'BMP'],
          desc: 'Command-line BMP tool for reading image headers and applying transformations: mirroring, rotation, cropping, and sequential color filters. Supports uncompressed 24-bit BMP files.',
          flow: 'BMP File ──▶ Header / Transform Pipeline ──▶ BMP Output\n                 Mirror · Rotate · Crop · Filters',
          links: [{ label: 'GitHub', url: `${GH}/bit-map` }],
        },
      ],
    },
    {
      label: 'GameDev, rigging & 3D',
      works: [
        {
          title: 'Crunchie Munchie',
          subtitle: 'Playable Indie Release',
          category: 'Game',
          stack: ['Game Design', 'UI/UX', 'Itch.io'],
          desc: 'Stylized playable indie game published on itch.io featuring custom interface art, responsive arcade mechanics, and playful visual direction.',
          links: [{ label: 'Play on itch.io', url: 'https://karadespot.itch.io/crunchie-munchie' }],
          media: ['media/crunchie-1.jpg', 'media/crunchie-2.jpg', 'media/crunchie-3.jpg', 'media/crunchie-4.jpg', 'media/crunchie-5.jpg'],
        },
        {
          title: 'Once Upon A Box',
          subtitle: '3D Fantasy Puzzle',
          category: 'Game',
          stack: ['Unity', 'C#', 'Autodesk Maya', 'Substance 3D'],
          desc: '3D fantasy puzzle game in Unity (3D-Tetris mechanics) combining spatial logic, physics-based interactions, and low-poly stylized environments.',
          links: [{ label: 'GitHub', url: `${GH}/onceuponabox` }],
          media: [
            'media/box-gameplay.jpg',
            'media/box-cover.jpg',
            'media/box-screen-1.jpg',
            'media/box-screen-2.png',
            'media/box-tutor-1.jpg',
            'media/box-tutor-2.jpg',
          ],
        },
        {
          title: 'Zheztyrnaq',
          subtitle: 'Folk-Horror Adventure',
          category: 'Game',
          stack: ['Narrative Design', 'Environment Art', 'Kazakh Folklore'],
          desc: 'Atmospheric mystery adventure set deep in the Altai forests, inspired by Kazakh and Turkic mythology, featuring environmental storytelling and exploration.',
          media: ['media/zheztyrnaq-1.jpg', 'media/zheztyrnaq-2.jpg', 'media/zheztyrnaq-3.jpg', 'media/zheztyrnaq-4.jpg', 'media/zheztyrnaq-5.jpg'],
        },
        {
          title: 'Trash Bin',
          subtitle: 'Mechanical Prop Rigging',
          category: '3D & Rigging',
          stack: ['Autodesk Maya', 'Modeling', 'Rigging', 'Animation'],
          desc: 'Modeled and rigged a mechanical trash bin prop, with its rendered model, UV layout, rig controls, and animation showcase.',
          media: ['media/trash-anim.mp4', 'media/trash-render.jpg', 'media/trash-model.png', 'media/trash-uv.png', 'media/trash-rig.png'],
        },
        {
          title: 'Robot',
          subtitle: 'Character Model & Animation',
          category: '3D & Rigging',
          stack: ['Autodesk Maya', 'Modeling', 'Rigging', 'Animation'],
          desc: 'Stylized robot character modeling, rigging, and animation, with model renders and animation clips.',
          media: ['media/robot-anim.mp4', 'media/robot-attack.mp4', 'media/robot-render.jpg', 'media/robot-model.png', 'media/robot-uv.png'],
        },
        {
          title: 'Cat Character',
          subtitle: 'Character Rigging & Animation',
          category: '3D & Rigging',
          stack: ['Autodesk Maya', 'Character Modeling', 'Rigging', 'Animation'],
          desc: 'Character modeling and skeletal rigging for an articulated human-cat character, with UVs and walk/run animation clips.',
          media: [
            'media/cat-walk.mp4',
            'media/cat-run.mp4',
            'media/cat-model.png',
            'media/cat-rig-1.png',
            'media/cat-rig-2.png',
            'media/cat-rig-3.png',
            'media/cat-uv.png',
          ],
        },
        {
          title: 'Props',
          subtitle: 'Modeling & Texturing',
          category: '3D',
          stack: ['Autodesk Maya', 'Substance 3D', 'Modeling', 'Texturing'],
          desc: 'A collection of stylized environment props and their modeling and texture sheet presentations.',
          media: ['media/props-1.png', 'media/props-2.png'],
        },
        {
          title: 'Once Upon A Box — Props',
          subtitle: 'Game Props',
          category: '3D',
          stack: ['Autodesk Maya', 'Game Props', '3D Modeling'],
          desc: 'A collection of modeled props created for the Once Upon a Box game.',
          media: ['media/box-props.jpg'],
        },
      ],
    },
  ],

  experience: [
    {
      period: '2026 — Present',
      company: 'KAR Technology',
      role: 'IT Support Automation Engineer',
      detail: 'Designed and engineered a fault-tolerant HikCentral API integration pipeline automating security alarm ingestion and CCTV video analytics across subsidiary organizations.',
    },
    {
      period: '2024 — 2025',
      company: 'Horus',
      role: 'Software Developer',
      detail: 'Built a campus attendance system for 900+ users with an analytics dashboard and geofencing perimeter validation.',
    },
    {
      period: '2024',
      company: 'DAX Group',
      role: '1C Data Analyst & Methodologist',
      detail: 'Authored technical specifications (PRDs) for 1C modules and improved client reporting data accuracy.',
    },
  ],

  education: [
    { period: '2025 — 2029', title: 'Cardiff University Kazakhstan', detail: 'BSc Computer Science' },
    { period: '2022 — 2025', title: 'Astana IT University College', detail: 'Software Development' },
  ],

  certifications: [
    { org: 'Alem School', title: 'Backend Development in Go (1-Year Program)', image: 'media/cert/go-backend.jpg' },
    { org: 'OMNIUM', title: 'GAMEDEV TEAMS Incubation Program', image: 'media/cert/gamedev-teams.jpg' },
    { org: 'Game Development Demo Day', title: 'Certificate of Achievement', image: 'media/cert/demo-day-1.jpg' },
    { org: 'Game Development Demo Day', title: 'Certificate of Achievement', image: 'media/cert/demo-day-2.jpg' },
    { org: 'Stepik', title: 'JavaScript', image: 'media/cert/stepik-js.jpg' },
    { org: '1C Kazakhstan', title: '1C:Enterprise 8 Configuration', image: 'media/cert/1c-config.jpg' },
    { org: '1C Kazakhstan', title: '1C:Enterprise 8 Programming', image: 'media/cert/1c-programming.jpg' },
    { org: '1C Kazakhstan', title: '1C Programmer Training & Employment Program', image: 'media/cert/1c-program.jpg' },
  ],

  skills: [
    { label: 'Languages', value: 'Go, Python (FastAPI, Flask, Django), C# (.NET MAUI, Unity), Java, C++, SQL (PostgreSQL, PL/pgSQL)' },
    { label: 'Backend & Infra', value: 'Docker, GitLab CI/CD, Nginx, MinIO (S3), Redis, RabbitMQ, PostGIS, Alembic, Linux VPS' },
    { label: 'GameDev & 3D', value: 'Unity, Autodesk Maya (Modeling, Rigging, Animation), Substance 3D' },
    { label: 'Tools & Methods', value: 'Git/GitLab, Postman, Firebase (FCM), Figma, Agile/Scrum, PRD Authoring' },
  ],

  footerText: 'Let’s build something resilient and memorable. <br>Open to backend, game development and 3D collaborations — drop me a line.',

  socials: [
    { label: 'Email', url: 'mailto:daianaarapbekova@gmail.com' },
    { label: 'GitHub', url: GH },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/daiana-arapbekova-6a0527296/' },
    { label: 'Telegram', url: 'https://t.me/diooryy' },
    { label: 'Instagram', url: 'https://instagram.com/daieeane' },
    { label: 'Itch.io', url: 'https://karadespot.itch.io/crunchie-munchie' },
    { label: 'CV / Résumé', url: 'media/cv-daiana-arapbekova.pdf' },
  ],

  fonts: ['Andale Mono', 'Roboto Flex'],
  design: { label: 'Daiana Arapbekova', url: GH },
}
