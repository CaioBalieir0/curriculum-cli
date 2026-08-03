import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import type { CvData, Profile } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function normalizeUrl(value: unknown): string {
  return String(value).trim().replace(/\s/g, '');
}

function normalizeProfileUrl(value: unknown): string {
  const url = normalizeUrl(value);

  if (!url || /^https?:\/\//i.test(url)) {
    return url;
  }

  return `https://${url}`;
}

Handlebars.registerHelper('uppercase', (value: unknown) => String(value).toUpperCase());
Handlebars.registerHelper('mailTo', (value: unknown) => `mailto:${normalizeUrl(value)}`);
Handlebars.registerHelper('profileUrl', (value: unknown) => normalizeProfileUrl(value));
Handlebars.registerHelper('formatExperienceTitle', (value: unknown) => {
  const parts = String(value).split('|').map((part) => part.trim());
  const [company, role, contract, dates] = parts;
  const segments = [
    `<strong>${Handlebars.escapeExpression(company ?? '')}</strong>`,
    role ? `<span class="muted italic">${Handlebars.escapeExpression(role)}</span>` : undefined,
    contract ? `<span class="muted italic">${Handlebars.escapeExpression(contract)}</span>` : undefined,
    dates ? `<span class="muted">${Handlebars.escapeExpression(dates)}</span>` : undefined
  ].filter(Boolean);

  return new Handlebars.SafeString(segments.join(' <span class="separator">|</span> '));
});
Handlebars.registerHelper('formatProjectTitle', (value: unknown) => {
  const [name, stack] = String(value).split('—').map((part) => part.trim());
  const title = `<strong>${Handlebars.escapeExpression(name ?? '')}</strong>`;

  if (!stack) {
    return new Handlebars.SafeString(title);
  }

  return new Handlebars.SafeString(`${title} <span class="separator">—</span> <span class="muted">${Handlebars.escapeExpression(stack)}</span>`);
});
Handlebars.registerHelper('renderSkills', (skills: unknown) => {
  if (!Array.isArray(skills)) {
    return '';
  }

  const groups = skills.map((skill) => {
    const category = typeof skill === 'object' && skill && 'category' in skill ? String(skill.category) : '';
    const items: unknown[] = typeof skill === 'object' && skill && 'items' in skill && Array.isArray(skill.items) ? skill.items : [];
    const content = items.map((item) => Handlebars.escapeExpression(String(item))).join(', ');

    return `<span class="skill-category">${Handlebars.escapeExpression(category)}:</span> ${content}`;
  });
  const rows = [groups[0], groups[1], groups[2], [groups[3], groups[4]].filter(Boolean).join(' <span class="pipe">|</span> '), [groups[5], groups[6]].filter(Boolean).join(' <span class="pipe">|</span> ')]
    .filter(Boolean)
    .map((row) => `<p class="skill-row">${row}</p>`)
    .join('');

  return new Handlebars.SafeString(rows);
});

export type Language = 'pt' | 'en';

export type ResumeRenderInput = {
  profile: Profile;
  cv: CvData;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/T/, '-')
    .slice(0, 15);
}

export function createSlug(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'document';
}

export function normalizeOutputBaseName(output?: string): string | undefined {
  const trimmedOutput = output?.trim();

  if (trimmedOutput) {
    if (trimmedOutput === '.' || trimmedOutput === '..' || /[\\/]/.test(trimmedOutput)) {
      throw new Error('Invalid --output value. Provide a base name only, without directory components.');
    }

    const baseName = trimmedOutput.replace(/\.pdf$/i, '');

    if (!baseName || baseName === '.' || baseName === '..') {
      throw new Error('Invalid --output value. Provide a non-empty base name.');
    }

    return baseName;
  }

  return undefined;
}

export function createOutputName(output: string | undefined, profileName: string, timestamp = createTimestamp()): string {
  const outputBaseName = normalizeOutputBaseName(output);

  if (outputBaseName) {
    return `curriculo-${outputBaseName}.pdf`;
  }

  return `resume-${createSlug(profileName)}-${timestamp}.pdf`;
}

function buildResumeTemplateData(data: ResumeRenderInput) {
  return {
    profile: {
      ...data.profile,
      title: data.cv.title,
      summary: data.cv.summary
    },
    skills: data.cv.skills,
    experience: data.cv.experience,
    projects: data.cv.projects,
    education: data.cv.education,
    languages: data.cv.languages
  };
}

export async function renderHtml(data: ResumeRenderInput, language: Language): Promise<string> {
  const templatePath = path.join(projectRoot, 'templates', `${language}.html`);
  const source = await fs.readFile(templatePath, 'utf8');
  const template = Handlebars.compile(source);

  return template(buildResumeTemplateData(data));
}

export async function renderPdf(data: ResumeRenderInput, language: Language, output?: string): Promise<string> {
  const outputDirectory = path.join(process.cwd(), 'output');
  const outputPath = path.join(outputDirectory, createOutputName(output, data.profile.name));

  await fs.mkdir(outputDirectory, { recursive: true });

  let html: string;

  try {
    html = await renderHtml(data, language);
  } catch (error) {
    throw new Error(`Failed to render resume template: ${getErrorMessage(error)}`);
  }

  try {
    const browser = await puppeteer.launch({ headless: true });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '14mm',
          right: '15mm',
          bottom: '12mm',
          left: '15mm'
        }
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    throw new Error(`Failed to generate PDF: ${getErrorMessage(error)}`);
  }

  return outputPath;
}
