import type { ProjectBlueprint } from '../../types/blueprint';

export function generateProjectFileTree(project: ProjectBlueprint, componentNames: string[] = []): string {
  const stack = (project.targetStack || '').toLowerCase();

  const extraComponents = componentNames.length > 0 ? componentNames : ['Navbar', 'SearchPill', 'TopControls', 'Sidebar'];

  if (stack.includes('laravel') || stack.includes('blade')) {
    return `my-project/
├── app/
│   └── Http/Controllers/
│       └── PageController.php
├── resources/
│   ├── css/
│   │   └── app.css
│   ├── js/
│   │   └── app.js
│   └── views/
│       ├── layouts/
│       │   └── app.blade.php              # Shared Master Layout
│       ├── components/                    # Modular Components
${extraComponents.map((c) => `│       │   ├── ${toKebabCase(c)}.blade.php`).join('\n')}
│       └── pages/                         # Route Views
${project.pages.map((p) => `│           └── ${p.pathname === '/' ? 'home' : p.pathname.replace(/^\//, '').replace(/\//g, '-')}.blade.php`).join('\n')}
├── routes/
│   └── web.php                            # Routing definitions
├── tailwind.config.js
└── package.json`;
  }

  if (stack.includes('next')) {
    return `my-project/
├── app/
│   ├── layout.tsx                         # Root Layout
│   ├── page.tsx                           # Root Route (/)
${project.pages
  .filter((p) => p.pathname !== '/')
  .map((p) => `│   ├── ${p.pathname.replace(/^\//, '')}/\n│   │   └── page.tsx`)
  .join('\n')}
├── components/
│   ├── layout/                            # Shared Layouts (Header, Nav, Footer)
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   └── ui/                                # Modular Components
${extraComponents.map((c) => `│       ├── ${c}.tsx`).join('\n')}
├── public/
│   └── assets/                            # SVGs & Images
├── tailwind.config.ts
└── package.json`;
  }

  if (stack.includes('vue') || stack.includes('nuxt')) {
    return `my-project/
├── src/
│   ├── assets/
│   ├── components/                        # Modular Components
│   │   ├── layout/
│   │   │   ├── Header.vue
│   │   │   └── Footer.vue
${extraComponents.map((c) => `│   │   ├── ${c}.vue`).join('\n')}
│   ├── views/                             # Route Views
${project.pages.map((p) => `│   │   ├── ${p.pathname === '/' ? 'HomeView' : toPascalCase(p.pathname)}View.vue`).join('\n')}
│   ├── router/
│   │   └── index.ts                       # Routing map
│   ├── App.vue
│   └── main.ts
├── tailwind.config.js
└── package.json`;
  }

  // React + Vite default
  return `my-project/
├── src/
│   ├── assets/
│   ├── components/                        # Modular Components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
${extraComponents.map((c) => `│   │   ├── ${c}.tsx`).join('\n')}
│   ├── pages/                             # Route Pages
${project.pages.map((p) => `│   │   ├── ${p.pathname === '/' ? 'Home' : toPascalCase(p.pathname)}.tsx`).join('\n')}
│   ├── App.tsx                            # Root routing & layout
│   ├── main.tsx
│   └── index.css
├── tailwind.config.js
└── package.json`;
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^([a-z])/, (chr) => chr.toUpperCase());
}

