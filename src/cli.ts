import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { z } from 'zod';
import { collectInteractiveOverrides } from './interactive.js';
import { buildFlagConfig, mergeResumeData } from './merge.js';
import { renderPdf, type Language } from './render.js';
import { formatZodError, resumeConfigSchema, resumeSchema, type CliOverrides, type ResumeConfig, type ResumeData } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

type CommandOptions = CliOverrides & {
  config?: string;
  interactive?: boolean;
};

async function readJsonFile(filePath: string): Promise<unknown> {
  try {
    const contents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(contents);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }

    throw error;
  }
}

async function loadDefaultData(language: Language): Promise<ResumeData> {
  const filePath = path.join(projectRoot, 'data', `default-${language}.json`);
  const parsed = await readJsonFile(filePath);
  const result = resumeSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Invalid default data in ${filePath}:\n${formatZodError(result.error)}`);
  }

  return result.data;
}

async function loadConfig(configPath?: string): Promise<ResumeConfig> {
  if (!configPath) {
    return {};
  }

  const resolvedPath = path.resolve(process.cwd(), configPath);
  const parsed = await readJsonFile(resolvedPath);
  const result = resumeConfigSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Invalid config:\n${formatZodError(result.error)}`);
  }

  return result.data;
}

async function generateResume(language: Language, options: CommandOptions): Promise<void> {
  const defaultData = await loadDefaultData(language);
  const configData = await loadConfig(options.config);
  const initialOverrides: CliOverrides = {
    title: options.title,
    summary: options.summary,
    skills: options.skills,
    output: options.output
  };
  const finalOverrides = options.interactive
    ? await collectInteractiveOverrides(initialOverrides)
    : initialOverrides;
  const flagData = buildFlagConfig(finalOverrides);
  const mergedData = mergeResumeData(defaultData, configData, flagData);
  const validatedData = resumeSchema.parse(mergedData);
  const outputPath = await renderPdf(validatedData, language, finalOverrides.output);

  console.log(`Generated PDF: ${outputPath}`);
}

function handleError(error: unknown): void {
  if (error instanceof z.ZodError) {
    console.error(`Invalid resume data:\n${formatZodError(error)}`);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unexpected error while generating the resume.');
  }

  process.exitCode = 1;
}

function addGenerateCommand(program: Command, name: string, language: Language): void {
  program
    .command(name)
    .description(`Generate a ${language === 'pt' ? 'Portuguese' : 'English'} resume PDF`)
    .option('--title <text>', 'override the resume title')
    .option('--summary <text>', 'override the professional summary')
    .option('--skills <text>', 'override skills, for example "Backend: Node.js, Fastify; Cloud: AWS, Docker"')
    .option('--output <filename>', 'output PDF filename')
    .option('--config <path>', 'path to a JSON config file')
    .option('--interactive', 'prompt for simple resume overrides')
    .action(async (options: CommandOptions) => {
      try {
        await generateResume(language, options);
      } catch (error) {
        handleError(error);
      }
    });
}

const program = new Command();

program
  .name('resume')
  .description('Generate customized resume PDFs in Portuguese or English.')
  .version('0.1.0');

addGenerateCommand(program, 'generate-pt', 'pt');
addGenerateCommand(program, 'generate-en', 'en');

program.parseAsync(process.argv).catch(handleError);
