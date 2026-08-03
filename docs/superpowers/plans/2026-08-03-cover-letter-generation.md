# Cover Letter Generation Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. User constraint: do not create or run automated tests for this change; verify with TypeScript build and manual CLI commands only.

**Goal:** Make `resume generate-pt` and `resume generate-en` generate a resume PDF, a LaTeX cover letter PDF, or both from the new `profile + cv? + coverLetter?` JSON model.

**Architecture:** Keep the existing resume path as HTML/Handlebars/Puppeteer, but move resume-specific fields under `cv` and pass a flattened `profile + cv` object only to the existing HTML templates. Add a separate LaTeX renderer that compiles `templates/cover-letter-*.tex` with `xelatex` using bundled `cover.cls` and OpenFonts assets. The CLI selects generated documents from the config/default section presence before merging values so defaults do not accidentally generate unrequested documents.

**Tech Stack:** Node.js, TypeScript, Commander, Zod, Handlebars, Puppeteer, LaTeX/XeLaTeX, Node built-in `fs`, `path`, `child_process`.

---

## File Map

- Modify `src/schema.ts`: define `GenerationData`, `CvData`, and `CoverLetterData`; remove top-level resume fields from the primary schema.
- Modify `src/merge.ts`: merge selected document sections only and map flags into `cv`.
- Modify `src/render.ts`: accept `profile + cv`, derive better output names from profile, and keep resume rendering isolated.
- Create `src/cover-letter.ts`: render cover letter TEX, copy LaTeX assets, run `xelatex`, and return generated paths.
- Modify `src/cli.ts`: load defaults/config, select sections, validate, call resume and/or cover letter renderers.
- Modify `data/default-pt.json` and `data/default-en.json`: move title/summary/skills/experience/projects/education/languages under `cv`.
- Create `templates/cover-letter-pt.tex` and `templates/cover-letter-en.tex`: Handlebars LaTeX templates using `cover.cls` conventions.
- Create `assets/cover/cover.cls` and `assets/cover/OpenFonts/...`: package LaTeX class and fonts needed by XeLaTeX.
- Modify `package.json`: include assets in published files and add verification scripts if useful.
- Modify `README.md`: document new JSON model, conditional generation, examples, and `xelatex` requirement.

## Task 1: New Data Model

**Files:**
- Modify: `src/schema.ts`
- Modify: `data/default-pt.json`
- Modify: `data/default-en.json`

- [ ] **Step 1: Update `src/schema.ts` types and schemas**

Replace the current `resumeSchema`/`resumeConfigSchema` model with `generationSchema`/`generationConfigSchema` while preserving reusable item schemas:

```ts
export const profileSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().min(1),
  linkedin: z.string(),
  github: z.string()
}).strict();

export const cvSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  skills: z.array(skillGroupSchema).min(1),
  experience: z.array(sectionItemSchema).min(1),
  projects: z.array(sectionItemSchema),
  education: z.array(educationItemSchema).min(1),
  languages: z.array(z.string().min(1)).min(1)
}).strict();

export const coverLetterBulletSchema = z.object({
  title: z.string().min(1),
  text: z.string().min(1)
}).strict();

export const coverLetterSchema = z.object({
  date: z.string().min(1).optional(),
  greeting: z.string().min(1),
  opening: z.string().min(1),
  body: z.string().min(1),
  bullets: z.array(coverLetterBulletSchema),
  companyConnection: z.string().min(1),
  personalFit: z.string().min(1),
  final: z.string().min(1),
  closing: z.string().min(1)
}).strict();

export const generationSchema = z.object({
  profile: profileSchema,
  cv: cvSchema.optional(),
  coverLetter: coverLetterSchema.optional()
}).strict().refine((data) => data.cv || data.coverLetter, {
  message: 'Nothing to generate. Provide at least one of "cv" or "coverLetter".'
});
```

- [ ] **Step 2: Move default resume data under `cv`**

For both `data/default-pt.json` and `data/default-en.json`, keep shared identity fields under `profile` and move `title`, `summary`, `skills`, `experience`, `projects`, `education`, and `languages` into `cv`.

Expected structure:

```json
{
  "profile": {
    "name": "Caio Balieiro Mariano",
    "location": "Guaratinguetá, SP",
    "phone": "+55 12 99142-2498",
    "email": "caiobalieiro676@gmail.com",
    "linkedin": "linkedin.com/in/caio-balieiro",
    "github": "github.com/CaioBalieir0"
  },
  "cv": {
    "title": "Desenvolvedor Full Stack",
    "summary": "...",
    "skills": [],
    "experience": [],
    "projects": [],
    "education": [],
    "languages": []
  }
}
```

- [ ] **Step 3: Build and expect current callers to fail**

Run: `npm run build`

Expected: TypeScript errors in `src/cli.ts`, `src/merge.ts`, and `src/render.ts` because they still import/use `ResumeData` and top-level resume fields.

## Task 2: Merge And Resume Rendering

**Files:**
- Modify: `src/merge.ts`
- Modify: `src/render.ts`
- Modify: `templates/pt.html`
- Modify: `templates/en.html`

- [ ] **Step 1: Update merge types and flag mapping**

In `src/merge.ts`, import `CvData`, `GenerationConfig`, and `GenerationData`. Update `parseSkillsFlag` to return `CvData['skills']`. Update `buildFlagConfig` so `--title`, `--summary`, and `--skills` write to `config.cv`.

```ts
if (flags.title || flags.summary || flags.skills) {
  config.cv = {};
}

if (flags.title) {
  config.cv = { ...config.cv, title: flags.title };
}
```

- [ ] **Step 2: Add selected-section merge helper**

Add a function that receives defaults, config, flags, and selected section names, then merges only selected document sections:

```ts
export type SelectedSections = {
  cv: boolean;
  coverLetter: boolean;
};

export function mergeGenerationData(
  defaultData: GenerationData,
  configData: GenerationConfig,
  flagData: GenerationConfig,
  selected: SelectedSections
): GenerationData {
  const base: GenerationData = {
    profile: defaultData.profile
  };

  if (selected.cv && defaultData.cv) {
    base.cv = defaultData.cv;
  }

  if (selected.coverLetter && defaultData.coverLetter) {
    base.coverLetter = defaultData.coverLetter;
  }

  const configMerged = mergeValue(base, configData) as GenerationData;
  return mergeValue(configMerged, flagData) as GenerationData;
}
```

- [ ] **Step 3: Flatten data only for HTML templates**

In `src/render.ts`, define a resume render data type and build `{ profile: { ...profile, title, summary }, skills, experience, projects, education, languages }` before compiling existing templates. Keep the existing templates unchanged if possible.

```ts
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
```

- [ ] **Step 4: Build after merge/render changes**

Run: `npm run build`

Expected: remaining TypeScript errors only in `src/cli.ts`, because orchestration still uses old schema names.

## Task 3: CLI Orchestration

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Update imports and config loading**

Use `generationSchema`, `generationConfigSchema`, `GenerationData`, and `GenerationConfig`. `loadDefaultData()` validates with `generationSchema`. `loadConfig()` validates with `generationConfigSchema`.

- [ ] **Step 2: Select sections before merge**

Implement section selection so config presence controls outputs:

```ts
function selectSections(defaultData: GenerationData, configData: GenerationConfig, flags: CliOverrides, hasConfig: boolean): SelectedSections {
  const flagsSelectCv = Boolean(flags.title || flags.summary || flags.skills);

  if (!hasConfig) {
    return {
      cv: Boolean(defaultData.cv) || flagsSelectCv,
      coverLetter: Boolean(defaultData.coverLetter)
    };
  }

  return {
    cv: Boolean(configData.cv) || flagsSelectCv,
    coverLetter: Boolean(configData.coverLetter)
  };
}
```

- [ ] **Step 3: Render conditionally**

After validation, call `renderPdf()` only when `validatedData.cv` exists. Add a placeholder call for cover letters that will be implemented in Task 4:

```ts
if (validatedData.cv) {
  const outputPath = await renderPdf({ profile: validatedData.profile, cv: validatedData.cv }, language, finalOverrides.output);
  console.log(`Generated resume PDF: ${outputPath}`);
}
```

- [ ] **Step 4: Verify resume-only generation**

Run: `npm run build && node ./dist/cli.js generate-pt --output plan-resume-only.pdf`

Expected: build succeeds, command prints `Generated resume PDF:`, and `output/plan-resume-only.pdf` exists.

## Task 4: Cover Letter Assets And Templates

**Files:**
- Create: `assets/cover/cover.cls`
- Create: `assets/cover/OpenFonts/fonts/lato/*`
- Create: `assets/cover/OpenFonts/fonts/raleway/*`
- Create: `templates/cover-letter-pt.tex`
- Create: `templates/cover-letter-en.tex`
- Modify: `package.json`

- [ ] **Step 1: Copy LaTeX assets**

Copy `cover.cls` and `OpenFonts` from `/home/caio/Documents/pessoal/ai-job-search/cover_letters/` into `assets/cover/`.

- [ ] **Step 2: Add the PT TEX template**

Create `templates/cover-letter-pt.tex` using this structure:

```tex
\documentclass[]{cover}
\usepackage{fancyhdr}

\pagestyle{fancy}
\fancyhf{}
\rfoot{Page \thepage \hspace{0pt}}
\thispagestyle{empty}
\renewcommand{\headrulewidth}{0pt}
\begin{document}

\namesection{}{\Huge{ {{{latex profile.name}}} }}{\href{mailto:{{{latex profile.email}}}}{ {{{latex profile.email}}} } | {{{latex profile.phone}}} | \urlstyle{same}\href{https://{{{latex profile.linkedin}}}}{LinkedIn}}

\currentdate{ {{#if coverLetter.date}}{{{latex coverLetter.date}}}{{else}}\today{{/if}} }
\lettercontent{ {{{latex coverLetter.greeting}}} }
\lettercontent{ {{{latex coverLetter.opening}}} }
\lettercontent{ {{{latex coverLetter.body}}} }

{{#if coverLetter.bullets.length}}
{\raggedright\fontspec[Path = OpenFonts/fonts/raleway/]{Raleway-Medium}\fontsize{11pt}{13pt}\selectfont
\begin{itemize}
{{#each coverLetter.bullets}}
    \item \textbf{ {{{latex title}}}:} {{{latex text}}}
{{/each}}
\end{itemize}\par}
\vspace{6pt}
{{/if}}

\lettercontent{ {{{latex coverLetter.companyConnection}}} }
\lettercontent{ {{{latex coverLetter.personalFit}}} }
\lettercontent{ {{{latex coverLetter.final}}} }

\begin{flushright}
\closing{ {{{latex coverLetter.closing}}} }
\signature{ {{{latex profile.name}}} }
\end{flushright}
\end{document}
```

- [ ] **Step 3: Add the EN TEX template**

Create `templates/cover-letter-en.tex` with the same structure. The content comes from JSON, so only the template file name differs.

- [ ] **Step 4: Package assets**

Add `assets` to `package.json` `files`.

## Task 5: Cover Letter Renderer

**Files:**
- Create: `src/cover-letter.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Register a LaTeX escaping helper**

In `src/cover-letter.ts`, define `escapeLatex(value: unknown): string` that escapes `\\`, `{`, `}`, `$`, `&`, `%`, `#`, `_`, `~`, and `^`.

- [ ] **Step 2: Render TEX from Handlebars**

Read `templates/cover-letter-${language}.tex`, register the `latex` helper, compile it with `{ profile, coverLetter }`, and write the resulting `.tex` into `output/`.

- [ ] **Step 3: Prepare LaTeX working files**

Copy `assets/cover/cover.cls` and `assets/cover/OpenFonts` into `output/.cover-letter-assets/` or directly alongside the generated `.tex`. Run `xelatex` with cwd set to the directory containing `cover.cls` and `OpenFonts`.

- [ ] **Step 4: Run `xelatex` with clear errors**

Use `spawn` or `execFile` to run:

```bash
xelatex -interaction=nonstopmode -halt-on-error <tex-file>
```

If `ENOENT`, throw `xelatex not found. Install a TeX distribution with xelatex to generate cover letter PDFs.` If exit code is non-zero, throw an error pointing to the `.log` file.

- [ ] **Step 5: Call cover renderer from CLI**

In `src/cli.ts`, after resume rendering:

```ts
if (validatedData.coverLetter) {
  const outputPaths = await renderCoverLetter({ profile: validatedData.profile, coverLetter: validatedData.coverLetter }, language, finalOverrides.output, Boolean(validatedData.cv));
  console.log(`Generated cover letter TEX: ${outputPaths.texPath}`);
  console.log(`Generated cover letter PDF: ${outputPaths.pdfPath}`);
}
```

## Task 6: Documentation And Verification

**Files:**
- Modify: `README.md`
- Create temporary verification configs under `/tmp/opencode/curriculo-cover-letter/`

- [ ] **Step 1: Update README**

Document the new JSON shape, conditional generation behavior, `xelatex` requirement, and examples for resume-only, cover-only, and both-documents generation.

- [ ] **Step 2: Build**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 3: Verify default resume generation**

Run: `node ./dist/cli.js generate-pt --output verify-default.pdf`

Expected: `Generated resume PDF:` and `output/verify-default.pdf` exists.

- [ ] **Step 4: Verify cover-only generation**

Create a temporary config with `profile` and `coverLetter`, no `cv`. Run: `node ./dist/cli.js generate-pt --config /tmp/opencode/curriculo-cover-letter/cover-only.json --output verify-cover.pdf`

Expected: only cover letter output lines are printed and `output/verify-cover-letter.pdf` exists.

- [ ] **Step 5: Verify both-documents generation**

Create a temporary config with `profile`, `cv`, and `coverLetter`. Run: `node ./dist/cli.js generate-pt --config /tmp/opencode/curriculo-cover-letter/both.json --output verify-both.pdf`

Expected: resume and cover letter output lines are printed, `output/verify-both.pdf` exists, and `output/verify-both-cover-letter.pdf` exists.

- [ ] **Step 6: Verify old format rejection**

Create a temporary old-format config with top-level `skills`. Run: `node ./dist/cli.js generate-pt --config /tmp/opencode/curriculo-cover-letter/old-format.json`

Expected: command exits non-zero and reports an unknown/unrecognized top-level key or validation path for the old shape.

- [ ] **Step 7: Verify empty generation rejection**

Create a temporary config with only `profile`. Run: `node ./dist/cli.js generate-pt --config /tmp/opencode/curriculo-cover-letter/profile-only.json`

Expected: command exits non-zero and prints `Nothing to generate. Provide at least one of "cv" or "coverLetter".`
