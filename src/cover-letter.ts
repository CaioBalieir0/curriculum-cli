import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import Handlebars from 'handlebars';
import { createSlug, createTimestamp, normalizeOutputBaseName, type Language } from './render.js';
import type { CoverLetterData, Profile } from './schema.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export type CoverLetterRenderInput = {
  profile: Profile;
  coverLetter: CoverLetterData;
};

export type CoverLetterOutputPaths = {
  texPath: string;
  pdfPath: string;
  logPath: string;
};

export function escapeLatex(value: unknown): string {
  return String(value)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([{}$&%#_])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

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

function latexArgument(value: string): string {
  return `{${value}}`;
}

function stripPdfExtension(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '');
}

export function createCoverLetterOutputNames(output: string | undefined, profileName: string, timestamp = createTimestamp()) {
  const outputBaseName = normalizeOutputBaseName(output);
  const baseName = outputBaseName
    ? `carta-apresentacao-${outputBaseName}`
    : `cover-letter-${createSlug(profileName)}-${timestamp}`;

  return {
    texName: `${baseName}.tex`,
    pdfName: `${baseName}.pdf`,
    logName: `${baseName}.log`
  };
}

async function renderCoverLetterTex(data: CoverLetterRenderInput, language: Language): Promise<string> {
  const templatePath = path.join(projectRoot, 'templates', `cover-letter-${language}.tex`);
  const source = await fs.readFile(templatePath, 'utf8');

  Handlebars.registerHelper('latex', (value: unknown) => new Handlebars.SafeString(escapeLatex(value)));
  Handlebars.registerHelper('url', (value: unknown) => new Handlebars.SafeString(normalizeUrl(value)));
  Handlebars.registerHelper('profileUrl', (value: unknown) => new Handlebars.SafeString(normalizeProfileUrl(value)));
  Handlebars.registerHelper('mailToArgument', (value: unknown) => new Handlebars.SafeString(latexArgument(`mailto:${normalizeUrl(value)}`)));
  Handlebars.registerHelper('profileUrlArgument', (value: unknown) => new Handlebars.SafeString(latexArgument(normalizeProfileUrl(value))));

  return Handlebars.compile(source)(data);
}

async function prepareLatexDirectory(buildDirectory: string): Promise<void> {
  await fs.rm(buildDirectory, { recursive: true, force: true });
  await fs.mkdir(buildDirectory, { recursive: true });
  await fs.copyFile(path.join(projectRoot, 'assets', 'cover', 'cover.cls'), path.join(buildDirectory, 'cover.cls'));
  await fs.cp(path.join(projectRoot, 'assets', 'cover', 'OpenFonts'), path.join(buildDirectory, 'OpenFonts'), { recursive: true });
}

async function copyIfExists(source: string, destination: string): Promise<void> {
  try {
    await fs.copyFile(source, destination);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return;
    }

    throw error;
  }
}

async function runXelatex(texName: string, buildDirectory: string, logPath: string): Promise<void> {
  try {
    await execFileAsync('xelatex', ['-interaction=nonstopmode', '-halt-on-error', texName], {
      cwd: buildDirectory,
      maxBuffer: 1024 * 1024 * 10
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new Error('xelatex not found. Install a TeX distribution with xelatex to generate cover letter PDFs.');
    }

    throw new Error(`Failed to compile cover letter with xelatex. See log: ${logPath}`);
  }
}

export async function renderCoverLetter(data: CoverLetterRenderInput, language: Language, output?: string): Promise<CoverLetterOutputPaths> {
  const outputDirectory = path.join(process.cwd(), 'output');
  const binDirectory = path.join(outputDirectory, 'bin');
  const names = createCoverLetterOutputNames(output, data.profile.name);
  const buildDirectory = path.join(binDirectory, 'cover-letter-build', stripPdfExtension(names.pdfName));
  const buildTexPath = path.join(buildDirectory, names.texName);
  const buildPdfPath = path.join(buildDirectory, names.pdfName);
  const buildLogPath = path.join(buildDirectory, names.logName);
  const texPath = path.join(binDirectory, names.texName);
  const pdfPath = path.join(outputDirectory, names.pdfName);
  const logPath = path.join(binDirectory, names.logName);

  await fs.mkdir(outputDirectory, { recursive: true });
  await prepareLatexDirectory(buildDirectory);

  const tex = await renderCoverLetterTex(data, language);
  await fs.writeFile(buildTexPath, tex, 'utf8');
  await fs.copyFile(buildTexPath, texPath);

  try {
    await runXelatex(names.texName, buildDirectory, logPath);
  } finally {
    await copyIfExists(buildLogPath, logPath);
  }

  await fs.copyFile(buildPdfPath, pdfPath);

  return {
    texPath,
    pdfPath,
    logPath
  };
}
