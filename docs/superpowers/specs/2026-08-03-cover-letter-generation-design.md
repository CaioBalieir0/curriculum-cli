# Cover Letter Generation Design

## Goal

Extend the existing `curriculo-cli` generation flow so `resume generate-pt` and `resume generate-en` can generate a resume PDF, a cover letter PDF, or both from one structured JSON input.

The new data model separates shared candidate data from document-specific data:

```json
{
  "profile": {},
  "cv": {},
  "coverLetter": {}
}
```

`profile` is always required. `cv` and `coverLetter` are optional sections. At least one of `cv` or `coverLetter` must be present after merging input data.

## Non-Goals

- Do not preserve the current top-level resume format with `skills`, `experience`, `projects`, `education`, and `languages` beside `profile`.
- Do not add separate `cover-letter-pt` or `cover-letter-en` commands.
- Do not rewrite the existing resume renderer from HTML/Puppeteer to LaTeX.
- Do not generate cover letters with HTML/Puppeteer.

## Commands

The public commands remain:

```bash
resume generate-pt --config ./job.json
resume generate-en --config ./job.json
```

Each command loads the language default data, merges the optional config file and CLI overrides, validates the result, and then decides what to generate. When `--config` is provided, the presence of `cv` and `coverLetter` in that config controls which documents are generated; defaults fill missing fields inside selected sections, but must not create an unrequested document section.

```text
config has profile + cv + coverLetter -> generate resume PDF and cover letter TEX/PDF
config has profile + cv               -> generate resume PDF only
config has profile + coverLetter      -> generate cover letter TEX/PDF only
config has profile only               -> fail with a clear "nothing to generate" error
no config                             -> generate from the language default data
```

## Data Shape

The top-level schema is:

```ts
type GenerationData = {
  profile: Profile;
  cv?: CvData;
  coverLetter?: CoverLetterData;
};
```

`Profile` contains fields shared by both documents:

```ts
type Profile = {
  name: string;
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
};
```

`CvData` contains fields specific to the resume:

```ts
type CvData = {
  title: string;
  summary: string;
  skills: SkillGroup[];
  experience: SectionItem[];
  projects: SectionItem[];
  education: EducationItem[];
  languages: string[];
};
```

`CoverLetterData` contains fields specific to the cover letter:

```ts
type CoverLetterData = {
  date?: string;
  greeting: string;
  opening: string;
  body: string;
  bullets: CoverLetterBullet[];
  companyConnection: string;
  personalFit: string;
  final: string;
  closing: string;
};
```

`date` is optional. If omitted, the renderer uses `\today` in the generated TEX file.

`CoverLetterBullet` is:

```ts
type CoverLetterBullet = {
  title: string;
  text: string;
};
```

## Example JSON

```json
{
  "profile": {
    "name": "Lucas",
    "location": "Sao Paulo, SP",
    "phone": "+55 11 99999-9999",
    "email": "lucas@example.com",
    "linkedin": "linkedin.com/in/lucas",
    "github": "github.com/lucas"
  },
  "cv": {
    "title": "Desenvolvedor Full Stack Junior",
    "summary": "Desenvolvedor focado em JavaScript, TypeScript, APIs e aplicacoes web.",
    "skills": [
      {
        "category": "Backend",
        "items": ["Node.js", "TypeScript", "REST APIs"]
      }
    ],
    "experience": [
      {
        "title": "Lumen Foundation | Desenvolvedor Full Stack e Responsavel Tecnico | Freelancer | Fev/2026 - Atual",
        "context": "Desenvolvimento de plataforma web para fundacao social.",
        "bullets": ["Implementei autenticacao, permissoes, relatorios e integracoes."]
      }
    ],
    "projects": [],
    "education": [
      {
        "title": "FATEC Guaratingueta - Analise e Desenvolvimento de Sistemas | 2023 - 2026",
        "details": ["TCC: Benchmark de bancos de dados relacionais e nao relacionais."]
      }
    ],
    "languages": ["Portugues nativo", "Ingles intermediario"]
  },
  "coverLetter": {
    "greeting": "Prezada equipe da Empresa X,",
    "opening": "Tenho interesse na vaga de Desenvolvedor Full Stack Junior.",
    "body": "Minha experiencia combina desenvolvimento web, APIs, testes e integracao com banco de dados.",
    "bullets": [
      {
        "title": "JavaScript e TypeScript",
        "text": "experiencia com aplicacoes web, APIs REST e manutencao de sistemas."
      }
    ],
    "companyConnection": "Tenho interesse na Empresa X pelo foco em produtos digitais.",
    "personalFit": "Sou organizado, pratico e orientado a aprendizado continuo.",
    "final": "Fico a disposicao para conversar sobre como posso contribuir.",
    "closing": "Atenciosamente,"
  }
}
```

## Merge Rules

The value merge order remains:

```text
language default data < config JSON < flags or interactive overrides
```

Document section selection is separate from value merging:

- Without `--config`, the selected sections are the sections present in the language default file.
- With `--config`, the selected sections are the sections present in the config file, plus any section implied by CLI flags or interactive resume overrides.
- `profile` is always selected and required.
- Defaults fill missing fields inside selected sections only.
- Defaults must not cause `cv` to be generated when the config file omits `cv`.
- Defaults must not cause `coverLetter` to be generated when the config file omits `coverLetter`.

Objects merge field by field within selected sections. Arrays replace the previous value when provided, with the existing exception that an empty `cv.projects` array intentionally hides projects. Empty arrays for required resume sections should not silently preserve defaults in the new model.

CLI overrides map to `cv` fields:

- `--title` overrides `cv.title`.
- `--summary` overrides `cv.summary`.
- `--skills` overrides `cv.skills`.
- `--output` controls generated output filenames.

If a user passes `--title`, `--summary`, or `--skills`, those flags imply resume generation and therefore select `cv`. If the resulting `cv` cannot be completed from defaults plus config, validation should fail at the missing `cv` field paths.

## Rendering Architecture

The resume renderer remains HTML/CSS + Puppeteer:

```text
GenerationData.profile + GenerationData.cv
  -> existing Handlebars HTML template
  -> Puppeteer PDF
```

The cover letter renderer uses LaTeX:

```text
GenerationData.profile + GenerationData.coverLetter
  -> Handlebars TEX template
  -> output/*.tex
  -> xelatex
  -> output/*.pdf
```

The LaTeX cover letter should reuse the existing `cover.cls` design and OpenFonts assets from the `ai-job-search` repository. The TEX template must keep `itemize` outside `\lettercontent{}` and wrap bullets in the Raleway font block so the generated output matches the existing cover letter behavior.

## Assets

Add package assets for cover letter generation:

```text
assets/cover/cover.cls
assets/cover/OpenFonts/fonts/lato/...
assets/cover/OpenFonts/fonts/raleway/...
templates/cover-letter-pt.tex
templates/cover-letter-en.tex
```

The `package.json` `files` list must include the assets needed at runtime.

During rendering, the CLI should create a temporary LaTeX working directory or a deterministic output support directory containing `cover.cls` and `OpenFonts`, then run `xelatex` from that directory so relative font paths work.

## Output Naming

The existing `--output <filename>` behavior should remain safe: no directory components and `.pdf` added automatically.

When both documents are generated and `--output` is provided, use it as the base name:

```text
--output lucas.pdf
output/lucas.pdf
output/lucas-cover-letter.tex
output/lucas-cover-letter.pdf
```

When only the cover letter is generated with `--output lucas.pdf`:

```text
output/lucas-cover-letter.tex
output/lucas-cover-letter.pdf
```

When no `--output` is provided, keep timestamped names and use distinct prefixes:

```text
output/resume-<slug>-<timestamp>.pdf
output/cover-letter-<slug>-<timestamp>.tex
output/cover-letter-<slug>-<timestamp>.pdf
```

The slug is derived from `profile.name` using lowercase ASCII-safe words separated by hyphens.

## Error Handling

Validation errors should point to the new paths, such as `cv.experience.0.title` or `coverLetter.bullets.0.text`.

If neither `cv` nor `coverLetter` is present, fail with:

```text
Nothing to generate. Provide at least one of "cv" or "coverLetter".
```

If `coverLetter` is present but `xelatex` is unavailable, fail with:

```text
xelatex not found. Install a TeX distribution with xelatex to generate cover letter PDFs.
```

If LaTeX compilation fails, keep the generated `.tex` and `.log` files in `output/` or an inspectable support directory and surface a concise error that points to the log path.

## Documentation Updates

Update `README.md` to document:

- The new top-level data model.
- The conditional generation rules.
- Examples for resume only, cover letter only, and both.
- The `xelatex` requirement for cover letter PDFs.
- The output naming rules when `--output` is used.

## Testing And Verification

Verification should cover:

- `npm run build` succeeds.
- `resume generate-pt` with default data generates the resume PDF.
- `resume generate-pt --config <cover-only.json>` generates only cover letter TEX/PDF.
- `resume generate-pt --config <both.json>` generates resume PDF and cover letter TEX/PDF.
- Invalid top-level old-format JSON is rejected instead of silently accepted.
- A config with neither `cv` nor `coverLetter` fails with the expected error.
- Cover letter TEX compiles through `xelatex` and produces a one-page PDF for the default/example content.
