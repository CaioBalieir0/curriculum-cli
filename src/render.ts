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

export async function renderPdf(data: ResumeData, language: Language, output?: string): Promise<string> {
  const templatePath = path.join(projectRoot, 'templates', `${language}.html`);
  const outputDirectory = path.join(process.cwd(), 'output');
  const outputPath = path.join(outputDirectory, createOutputName(output));

  await fs.mkdir(outputDirectory, { recursive: true });

  let html: string;

  try {
    const source = await fs.readFile(templatePath, 'utf8');
    const template = Handlebars.compile(source);
    html = template(data);
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
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm'
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
