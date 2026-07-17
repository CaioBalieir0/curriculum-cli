# Resume CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an English-language Node.js TypeScript CLI that generates Portuguese and English resume PDFs from default data plus optional config and flag overrides.

**Architecture:** The CLI will load language-specific default JSON, validate an optional partial config with Zod, merge defaults/config/flags, render an HTML template with Handlebars, and print a PDF with Puppeteer. The implementation is split into focused modules for schema validation, merge behavior, interactive prompts, rendering, and CLI orchestration.

**Tech Stack:** Node.js, TypeScript, npm, Commander, Zod, Handlebars, Puppeteer, Inquirer.

---

## Files And Responsibilities

- `package.json`: npm metadata, executable mapping, scripts, dependencies.
- `tsconfig.json`: TypeScript compiler configuration.
- `.gitignore`: excludes dependencies, build output, generated PDFs, and local artifacts.
- `bin/resume`: executable shim that runs compiled CLI code.
- `src/schema.ts`: Zod schemas and shared TypeScript types.
- `src/merge.ts`: deep merge and CLI flag override logic.
- `src/render.ts`: Handlebars template loading and Puppeteer PDF generation.
- `src/interactive.ts`: Inquirer prompt flow for simple overrides.
- `src/cli.ts`: Commander commands and end-to-end generation pipeline.
- `templates/pt.html`: Portuguese resume HTML/CSS template.
- `templates/en.html`: English resume HTML/CSS template.
- `data/default-pt.json`: Portuguese default resume content with temporary experience/project bullets.
- `data/default-en.json`: English default resume content with temporary experience/project bullets.
- `README.md`: English usage documentation and manual verification commands.

No automated tests will be created. Do not commit anything.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `bin/resume`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "curriculo-cli",
  "version": "0.1.0",
  "description": "English CLI for generating customized resume PDFs in Portuguese or English.",
  "type": "module",
  "bin": {
    "resume": "./bin/resume"
  },
  "scripts": {
    "build": "tsc",
    "start": "node ./dist/cli.js",
    "generate:pt": "npm run build --silent && node ./dist/cli.js generate-pt",
    "generate:en": "npm run build --silent && node ./dist/cli.js generate-en"
  },
  "keywords": [
    "resume",
    "cli",
    "pdf",
    "typescript"
  ],
  "author": "Caio Balieiro Mariano",
  "license": "MIT",
  "dependencies": {
    "commander": "^12.1.0",
    "handlebars": "^4.7.8",
    "inquirer": "^10.2.2",
    "puppeteer": "^23.11.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create `.gitignore`**

```gitignore
node_modules/
dist/
output/
.env
.DS_Store
npm-debug.log*
```

- [ ] **Step 4: Create `bin/resume`**

```js
#!/usr/bin/env node
import '../dist/cli.js';
```

- [ ] **Step 5: Make the binary executable**

Run: `chmod +x bin/resume`

Expected: command exits with status 0.

- [ ] **Step 6: Install dependencies**

Run: `npm install`

Expected: `node_modules/` and `package-lock.json` are created.

---

### Task 2: Schema And Types

**Files:**
- Create: `src/schema.ts`

- [ ] **Step 1: Create `src/schema.ts`**

```ts
import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().min(1),
  linkedin: z.string().min(1),
  github: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1)
});

export const skillGroupSchema = z.object({
  category: z.string().min(1),
  items: z.array(z.string().min(1)).min(1)
});

export const sectionItemSchema = z.object({
  title: z.string().min(1),
  context: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1)
});

export const educationItemSchema = z.object({
  title: z.string().min(1),
  details: z.array(z.string().min(1)).min(1)
});

export const resumeSchema = z.object({
  profile: profileSchema,
  skills: z.array(skillGroupSchema).min(1),
  experience: z.array(sectionItemSchema).min(1),
  projects: z.array(sectionItemSchema).min(1),
  education: z.array(educationItemSchema).min(1),
  languages: z.array(z.string().min(1)).min(1)
});

export const resumeConfigSchema = resumeSchema.deepPartial();

export type ResumeData = z.infer<typeof resumeSchema>;
export type ResumeConfig = z.infer<typeof resumeConfigSchema>;

export type CliOverrides = {
  title?: string;
  summary?: string;
  skills?: string;
  output?: string;
};

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `- ${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('\n');
}
```

- [ ] **Step 2: Build to verify TypeScript accepts the schema**

Run: `npm run build`

Expected: the build fails only if later source files are still missing from `src`; if only this file exists, TypeScript succeeds.

---

### Task 3: Merge Logic

**Files:**
- Create: `src/merge.ts`

- [ ] **Step 1: Create `src/merge.ts`**

```ts
import type { CliOverrides, ResumeConfig, ResumeData } from './schema.js';

const arrayKeys = new Set(['skills', 'experience', 'projects', 'education', 'languages']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeValue(defaultValue: unknown, overrideValue: unknown, key?: string): unknown {
  if (overrideValue === undefined) {
    return defaultValue;
  }

  if (Array.isArray(defaultValue) || Array.isArray(overrideValue)) {
    if (key && arrayKeys.has(key) && Array.isArray(overrideValue) && overrideValue.length === 0) {
      return defaultValue;
    }

    return overrideValue;
  }

  if (isObject(defaultValue) && isObject(overrideValue)) {
    const merged: Record<string, unknown> = { ...defaultValue };

    for (const [childKey, childValue] of Object.entries(overrideValue)) {
      merged[childKey] = mergeValue(merged[childKey], childValue, childKey);
    }

    return merged;
  }

  return overrideValue;
}

export function parseSkillsFlag(value: string): ResumeData['skills'] {
  return value
    .split(';')
    .map((group) => group.trim())
    .filter(Boolean)
    .map((group) => {
      const [category, itemsText] = group.split(':');

      if (!category?.trim() || !itemsText?.trim()) {
        throw new Error('Invalid --skills format. Use "Category: item, item; Category: item".');
      }

      const items = itemsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      if (items.length === 0) {
        throw new Error('Invalid --skills format. Each category must contain at least one item.');
      }

      return {
        category: category.trim(),
        items
      };
    });
}

export function buildFlagConfig(flags: CliOverrides): ResumeConfig {
  const config: ResumeConfig = {};

  if (flags.title || flags.summary) {
    config.profile = {};
  }

  if (flags.title) {
    config.profile = { ...config.profile, title: flags.title };
  }

  if (flags.summary) {
    config.profile = { ...config.profile, summary: flags.summary };
  }

  if (flags.skills) {
    config.skills = parseSkillsFlag(flags.skills);
  }

  return config;
}

export function mergeResumeData(
  defaultData: ResumeData,
  configData: ResumeConfig,
  flagData: ResumeConfig
): ResumeData {
  const configMerged = mergeValue(defaultData, configData) as ResumeData;
  return mergeValue(configMerged, flagData) as ResumeData;
}
```

- [ ] **Step 2: Build to verify merge types**

Run: `npm run build`

Expected: TypeScript succeeds if `src/cli.ts` has not been created yet or fails only for unrelated missing files.

---

### Task 4: Default Data

**Files:**
- Create: `data/default-pt.json`
- Create: `data/default-en.json`

- [ ] **Step 1: Create `data/default-pt.json`**

Use the provided resume facts with temporary bullets where the original full text is not available yet. Content may be Portuguese because this file is generated resume content.

- [ ] **Step 2: Create `data/default-en.json`**

Use translated English content with the same structure and temporary bullets where the original full text is not available yet.

- [ ] **Step 3: Validate both JSON files manually through the CLI later**

Expected: once `src/cli.ts` exists, both files parse and pass `resumeSchema`.

---

### Task 5: HTML Templates And Renderer

**Files:**
- Create: `templates/pt.html`
- Create: `templates/en.html`
- Create: `src/render.ts`

- [ ] **Step 1: Create templates**

Both templates should use the same layout and English field names. Static section labels may be Portuguese in `pt.html` and English in `en.html`.

Include CSS for A4 page size, compact typography, contact row, section headings, two-column skills, and `▸` bullets.

- [ ] **Step 2: Create `src/render.ts`**

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import type { ResumeData } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export type Language = 'pt' | 'en';

export function createOutputName(output?: string): string {
  if (output?.trim()) {
    return output.endsWith('.pdf') ? output : `${output}.pdf`;
  }

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/T/, '-')
    .slice(0, 15);

  return `resume-caio-balieiro-${timestamp}.pdf`;
}

export async function renderPdf(data: ResumeData, language: Language, output?: string): Promise<string> {
  const templatePath = path.join(projectRoot, 'templates', `${language}.html`);
  const outputDirectory = path.join(projectRoot, 'output');
  const outputPath = path.join(outputDirectory, createOutputName(output));

  await fs.mkdir(outputDirectory, { recursive: true });

  const source = await fs.readFile(templatePath, 'utf8');
  const template = Handlebars.compile(source);
  const html = template(data);

  const browser = await puppeteer.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm'
      }
    });
  } finally {
    await browser.close();
  }

  return outputPath;
}
```

- [ ] **Step 3: Build to verify renderer types**

Run: `npm run build`

Expected: TypeScript succeeds if all imported files exist.

---

### Task 6: Interactive Prompt Flow

**Files:**
- Create: `src/interactive.ts`

- [ ] **Step 1: Create `src/interactive.ts`**

```ts
import inquirer from 'inquirer';
import type { CliOverrides } from './schema.js';

export async function collectInteractiveOverrides(initial: CliOverrides): Promise<CliOverrides> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Resume title:',
      default: initial.title
    },
    {
      type: 'input',
      name: 'summary',
      message: 'Professional summary:',
      default: initial.summary
    },
    {
      type: 'input',
      name: 'skills',
      message: 'Skills groups:',
      default: initial.skills,
      suffix: ' Format: Backend: Node.js, Fastify; Cloud: AWS, Docker'
    },
    {
      type: 'input',
      name: 'output',
      message: 'Output filename:',
      default: initial.output
    }
  ]);

  return Object.fromEntries(
    Object.entries({ ...initial, ...answers }).filter(([, value]) => typeof value === 'string' && value.trim())
  ) as CliOverrides;
}
```

- [ ] **Step 2: Build to verify Inquirer import**

Run: `npm run build`

Expected: TypeScript succeeds if all imported files exist.

---

### Task 7: CLI Orchestration

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Create `src/cli.ts`**

Implement Commander commands, JSON loading, config validation, default validation, merge, render, and errors.

Required behavior:

```text
resume generate-pt --title "..." --summary "..." --skills "..." --config ./file.json --output file.pdf
resume generate-en --interactive
```

Errors must be concise and exit with code 1.

- [ ] **Step 2: Build**

Run: `npm run build`

Expected: TypeScript succeeds and creates `dist/`.

---

### Task 8: README Documentation

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create English README**

README must include npm install/build instructions, local usage, command reference, all flags, merge precedence, array replacement behavior, flag-only examples, `--config` example, `--interactive` example, and manual verification commands.

- [ ] **Step 2: Include config example**

Add a complete example showing one custom `experience` section with `title`, `context`, and `bullets`.

---

### Task 9: Manual Verification

**Files:**
- Generated: `output/*.pdf`

- [ ] **Step 1: Build project**

Run: `npm run build`

Expected: TypeScript exits successfully.

- [ ] **Step 2: Generate Portuguese PDF**

Run: `node ./dist/cli.js generate-pt --output pt-check.pdf`

Expected: `output/pt-check.pdf` exists.

- [ ] **Step 3: Generate English PDF**

Run: `node ./dist/cli.js generate-en --output en-check.pdf`

Expected: `output/en-check.pdf` exists.

- [ ] **Step 4: Generate with flag overrides**

Run: `node ./dist/cli.js generate-pt --title "Junior DevOps Engineer" --skills "Backend: Node.js, Fastify; Cloud: AWS, Docker" --output flags-check.pdf`

Expected: `output/flags-check.pdf` exists.

- [ ] **Step 5: Verify invalid config error manually**

Create a temporary invalid config file with `skills` as a string, run with `--config`, and verify the CLI prints a Zod field-path error and exits with code 1.

---

## Self-Review

- Spec coverage: The plan covers English CLI naming, npm, current-folder project structure, TypeScript, Commander, Zod validation, Handlebars templates, Puppeteer PDF output, Inquirer interactive mode, default PT/EN data, deep object merge, whole-array replacement, README usage instructions, no automated tests, and manual verification.
- Placeholder scan: Temporary resume bullets are intentional because the user will provide the full resume text later. No implementation task is left undefined.
- Type consistency: Shared types come from `src/schema.ts`; `src/merge.ts`, `src/render.ts`, `src/interactive.ts`, and `src/cli.ts` use the same `ResumeData`, `ResumeConfig`, and `CliOverrides` names.
