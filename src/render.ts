import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import type { ResumeData } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

Handlebars.registerHelper('uppercase', (value: unknown) => String(value).toUpperCase());
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createOutputName(output?: string): string {
  const trimmedOutput = output?.trim();

  if (trimmedOutput) {
    if (trimmedOutput === '.' || trimmedOutput === '..' || /[\\/]/.test(trimmedOutput)) {
      throw new Error('Invalid --output value. Provide a filename only, without directory components.');
    }

    return trimmedOutput.endsWith('.pdf') ? trimmedOutput : `${trimmedOutput}.pdf`;
  }

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/T/, '-')
    .slice(0, 15);

  return `resume-caio-balieiro-${timestamp}.pdf`;
}

export async function renderHtml(data: ResumeData, language: Language): Promise<string> {
  const templatePath = path.join(projectRoot, 'templates', `${language}.html`);
  const source = await fs.readFile(templatePath, 'utf8');
  const template = Handlebars.compile(source);

  return template(data);
}

export async function renderPdf(data: ResumeData, language: Language, output?: string): Promise<string> {
  const outputDirectory = path.join(process.cwd(), 'output');
  const outputPath = path.join(outputDirectory, createOutputName(output));

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
