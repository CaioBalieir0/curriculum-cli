# Resume CLI Design

## Goal

Build a Node.js TypeScript CLI named `curriculo-cli` that generates customized resume PDFs from default resume data. The CLI itself, command names, flags, field names, README, and developer-facing text must be in English. Generated resume content can be Portuguese or English depending on the selected command.

The tool must support per-job customization by merging default resume data, an optional config JSON file, and simple command-line overrides. Missing fields must fall back to the default resume data.

## Project Location

The project will be created directly in `/home/caio/Documents/pessoal/curriculo`, not inside a nested `curriculo-cli/` directory.

The package manager will be `npm`.

## CLI Interface

The package name will be `curriculo-cli`, but the installed executable will be `resume`.

Commands:

```bash
resume generate-pt
resume generate-en
```

Flags:

```bash
--title <text>
--summary <text>
--skills <text>
--output <filename>
--config <path>
--interactive
```

Examples:

```bash
resume generate-pt \
  --title "Junior DevOps Engineer" \
  --summary "Developer focused on CI/CD, containers, and observability..." \
  --config ./config/liebherr.json \
  --output caio-liebherr.pdf
```

```bash
resume generate-en --output caio-resume.pdf
```

## Architecture

Use TypeScript with Commander for command parsing, Zod for runtime validation, Handlebars for HTML templates, Puppeteer for PDF generation, and Inquirer for interactive mode.

Folder structure:

```text
bin/
  resume
src/
  cli.ts
  schema.ts
  merge.ts
  render.ts
  interactive.ts
templates/
  pt.html
  en.html
data/
  default-pt.json
  default-en.json
output/
README.md
```

Main pipeline for both commands:

```text
load language default JSON
load optional --config JSON
validate config with Zod
collect simple flag overrides
merge default + config + flags
render Handlebars template to HTML
generate PDF with Puppeteer
save PDF into ./output
```

## Rendering Approach

Use Puppeteer with HTML/CSS templates instead of pdfkit. This keeps layout fidelity better for a resume: columns, bold section headings, spacing, typography, and custom bullet markers are easier to control with CSS.

Templates must preserve the original visual intent as much as possible: clear section headings, bold emphasis, compact spacing, skill columns, and `▸` as the bullet marker.

## Data Model

JSON field names will be English for both Portuguese and English resumes. The content values may be Portuguese in `default-pt.json` and English in `default-en.json`.

Core shape:

```json
{
  "profile": {
    "name": "Caio Balieiro Mariano",
    "location": "Guaratingueta SP",
    "phone": "+55 12 99142-2498",
    "email": "caiobalieiro676@gmail.com",
    "linkedin": "linkedin.com/in/caio-balieiro",
    "github": "github.com/CaioBalieir0",
    "title": "Desenvolvedor Full Stack Junior",
    "summary": "..."
  },
  "skills": [
    {
      "category": "Backend",
      "items": ["TypeScript", "Node.js", "Fastify"]
    }
  ],
  "experience": [
    {
      "title": "Company | Role | Period",
      "context": "Short context for the role.",
      "bullets": ["Impact bullet"]
    }
  ],
  "projects": [
    {
      "title": "Project name",
      "context": "Short context.",
      "bullets": ["Impact bullet"]
    }
  ],
  "education": [
    {
      "title": "Institution | Course | Period",
      "details": ["Detail"]
    }
  ],
  "languages": ["Portuguese: native", "English: intermediate"]
}
```

Initial default data will be based on the information already provided. Professional experience and project bullets will use temporary placeholder text until the full original resume is provided later. The structure must make replacing those bullets a data-only change.

## Merge Behavior

Merge order:

```text
default data < config JSON < CLI flags
```

Objects are deeply merged field by field.

Arrays are treated as whole-section overrides, not item-by-item merges. For example, if `experience` is present and non-empty in config, it replaces the default `experience` array. If `experience` is missing or an empty array, the default experience remains.

This same array rule applies to `skills`, `projects`, `education`, and `languages`.

Simple flags map to structured fields:

```text
--title -> profile.title
--summary -> profile.summary
--output -> PDF filename only
```

`--skills` accepts semicolon-separated groups and parses them into the structured skills array:

```text
Backend: Node.js, Fastify; Cloud: AWS, Docker; Tests: Playwright, Jest
```

## Validation And Errors

Config JSON is validated with Zod before rendering.

Invalid JSON syntax should produce a clear file-specific error:

```text
Invalid JSON in ./config/job.json: Unexpected token ...
```

Invalid shape should list field paths:

```text
Invalid config:
- experience.0.title: Required
- skills.1.items: Expected array, received string
```

Template rendering and PDF generation errors should exit with a non-zero code and show a concise actionable message.

## Output Behavior

All generated PDFs are saved in `./output`.

If `--output` is provided:

```text
output/<provided-filename>.pdf
```

If `--output` is omitted, use an automatic timestamped name:

```text
output/resume-caio-balieiro-YYYYMMDD-HHMMSS.pdf
```

If the provided output name has no `.pdf` extension, append `.pdf`.

## Interactive Mode

`--interactive` starts a guided prompt flow for simple fields. It should ask for title, summary, skills, and output filename. Structured arrays remain better handled through `--config`, so interactive mode will not attempt full nested editing in the first version.

Interactive answers are treated as CLI overrides and therefore take precedence over config and defaults.

## README Requirements

`README.md` must be in English and explain how to use the CLI.

It must include:

- Install/build instructions with npm.
- How to run the CLI locally.
- Command reference for `resume generate-pt` and `resume generate-en`.
- Explanation of every flag.
- Examples for simple flag-only generation.
- Example using `--config`.
- Example using `--interactive`.
- Explanation of merge precedence.
- Explanation that arrays replace whole sections when present and non-empty.
- A complete example config JSON for customizing one experience section.
- Note that full original resume bullets can be pasted later and updated in `data/default-pt.json` and `data/default-en.json`.

## Testing Decision

No automated tests will be added. This means no Jest dependency and no `*.test.ts` files.

Manual verification commands will be documented in the README and used after implementation, such as generating a default Portuguese PDF, generating an English PDF, generating with flag overrides, and validating failure output for an invalid config.

## Out Of Scope

- No automated tests.
- No item-by-item array merge.
- No nested interactive editor for experience, projects, education, or languages.
- No exact reproduction of the original PDF until the full resume text and any visual reference are provided.
