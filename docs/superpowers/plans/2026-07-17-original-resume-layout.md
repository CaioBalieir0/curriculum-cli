# Original Resume Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CLI-generated resume PDFs match `curriculo-caio-balieiro.pdf` visually and structurally.

**Architecture:** Keep the current TypeScript CLI, Handlebars templates, and Puppeteer renderer. Update the HTML/CSS templates to reproduce the original Google Docs-style layout, add a small Handlebars helper for uppercase header rendering, and verify with generated PDFs converted through `pdftoppm`.

**Tech Stack:** Node.js, TypeScript, Commander, Handlebars, Puppeteer, HTML/CSS, Poppler `pdftoppm`.

**User Constraint:** Do not create commits during implementation.

---

## File Structure

- Modify `src/render.ts`: register one Handlebars helper used by templates for uppercase header names.
- Modify `templates/pt.html`: replace the generic two-column layout with the original Portuguese visual structure.
- Modify `templates/en.html`: apply the same visual system while keeping English section labels.
- No schema changes are required.
- No new PDF engine is required.

## Task 1: Add Template Helper

**Files:**
- Modify: `src/render.ts`

- [ ] **Step 1: Add the uppercase helper and exported `renderHtml` function in `src/render.ts`**

Add this after `const projectRoot = path.resolve(__dirname, '..');`:

```ts
Handlebars.registerHelper('uppercase', (value: unknown) => String(value).toUpperCase());
```

Add an exported `renderHtml(data, language)` function that reads and compiles the language template. Update `renderPdf` to call `renderHtml` instead of duplicating template rendering inline.

- [ ] **Step 2: Build to verify helper registration compiles**

Run: `npm run build`

Expected: TypeScript exits with code 0 and prints no compile errors.

## Task 2: Rebuild Portuguese Template

**Files:**
- Modify: `templates/pt.html`

- [ ] **Step 1: Replace `templates/pt.html` with original-style markup and CSS**

Use this complete template:

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>{{profile.name}} - Curriculo</title>
  <style>
    @page { size: A4; margin: 12mm 15mm 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #202033; font-family: Arial, Helvetica, sans-serif; font-size: 9.8pt; line-height: 1.18; }
    header { text-align: center; margin-bottom: 12px; }
    h1 { margin: 0; color: #202033; font-size: 20.5pt; line-height: 1; font-weight: 700; letter-spacing: 0.2px; }
    .headline { margin-top: 4px; color: #1f5be3; font-size: 12.4pt; line-height: 1.1; }
    .contact { margin-top: 3px; color: #555; font-size: 9.4pt; line-height: 1.18; }
    .links { color: #0057ff; }
    section { margin-top: 10px; }
    h2 { margin: 0 0 7px; color: #1f5be3; font-size: 13.4pt; line-height: 1; font-weight: 700; text-transform: uppercase; }
    .rule { border-top: 1.5px solid #1f5be3; padding-top: 7px; }
    p { margin: 0; }
    .summary { color: #555; font-size: 9.6pt; }
    .skills { color: #555; font-size: 9.2pt; }
    .skill-row { margin: 1px 0; }
    .skill-category { color: #202033; font-weight: 700; }
    .entry { margin: 0 0 8px; break-inside: avoid; }
    .entry-title { color: #202033; font-size: 9.7pt; font-weight: 700; }
    .entry-title span { color: #666; font-weight: 400; }
    .context { margin-top: 1px; color: #555; font-size: 9pt; font-style: italic; }
    ul { margin: 3px 0 0 12px; padding: 0; list-style: none; }
    li { margin: 2px 0; padding-left: 12px; position: relative; }
    li::before { content: '▸'; position: absolute; left: 0; top: 0; color: #202033; font-size: 8pt; }
    .projects .entry { margin-bottom: 6px; }
    .education-lines { color: #555; font-size: 9.2pt; }
    .education-lines p { margin: 1px 0; }
    .label { color: #202033; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    <h1>{{uppercase profile.name}}</h1>
    <div class="headline">{{profile.title}}</div>
    <div class="contact">{{profile.location}} &nbsp;•&nbsp; {{profile.phone}} &nbsp;•&nbsp; {{profile.email}}</div>
    <div class="contact links">{{profile.linkedin}} &nbsp;•&nbsp; {{profile.github}}</div>
  </header>

  <section>
    <h2>RESUMO PROFISSIONAL</h2>
    <div class="rule">
      <p class="summary">{{profile.summary}}</p>
    </div>
  </section>

  <section>
    <h2>HABILIDADES TÉCNICAS</h2>
    <div class="rule skills">
      {{#each skills}}
        <p class="skill-row"><span class="skill-category">{{category}}:</span> {{#each items}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</p>
      {{/each}}
    </div>
  </section>

  <section>
    <h2>EXPERIÊNCIA PROFISSIONAL</h2>
    <div class="rule">
      {{#each experience}}
        <div class="entry">
          <div class="entry-title">{{title}}</div>
          <p class="context">{{context}}</p>
          <ul>{{#each bullets}}<li>{{this}}</li>{{/each}}</ul>
        </div>
      {{/each}}
    </div>
  </section>

  <section class="projects">
    <h2>PROJETOS PESSOAIS</h2>
    <div class="rule">
      {{#each projects}}
        <div class="entry">
          <div class="entry-title">{{title}}</div>
          <ul>{{#each bullets}}<li>{{this}}</li>{{/each}}</ul>
        </div>
      {{/each}}
    </div>
  </section>

  <section>
    <h2>FORMAÇÃO &amp; IDIOMAS</h2>
    <div class="rule education-lines">
      {{#each education}}
        <p><span class="label">{{title}}</span></p>
        {{#each details}}<p><span class="label">{{this}}</span></p>{{/each}}
      {{/each}}
      <p><span class="label">Idiomas:</span> {{#each languages}}{{this}}{{#unless @last}} &nbsp;|&nbsp; {{/unless}}{{/each}}</p>
    </div>
  </section>
</body>
</html>
```

- [ ] **Step 2: Build the project**

Run: `npm run build`

Expected: TypeScript exits with code 0.

- [ ] **Step 3: Generate the Portuguese PDF**

Run: `node ./dist/cli.js generate-pt --output caio-pt.pdf`

Expected: `output/caio-pt.pdf` exists and the command prints `Generated PDF: .../output/caio-pt.pdf`.

## Task 3: Rebuild English Template With Same Visual System

**Files:**
- Modify: `templates/en.html`

- [ ] **Step 1: Replace `templates/en.html` with the same layout using English labels**

Use the same CSS and markup shape as `templates/pt.html`, with these section labels:

```html
<h2>PROFESSIONAL SUMMARY</h2>
<h2>TECHNICAL SKILLS</h2>
<h2>PROFESSIONAL EXPERIENCE</h2>
<h2>PERSONAL PROJECTS</h2>
<h2>EDUCATION &amp; LANGUAGES</h2>
```

The final language line should be:

```html
<p><span class="label">Languages:</span> {{#each languages}}{{this}}{{#unless @last}} &nbsp;|&nbsp; {{/unless}}{{/each}}</p>
```

- [ ] **Step 2: Build the project**

Run: `npm run build`

Expected: TypeScript exits with code 0.

- [ ] **Step 3: Generate the English PDF**

Run: `node ./dist/cli.js generate-en --output caio-en.pdf`

Expected: `output/caio-en.pdf` exists and the command prints `Generated PDF: .../output/caio-en.pdf`.

## Task 4: Visual Verification And Iteration

**Files:**
- Modify as needed: `templates/pt.html`, `templates/en.html`, `src/render.ts`

- [ ] **Step 1: Convert PDFs to images**

Run: `pdftoppm -png -r 150 "curriculo-caio-balieiro.pdf" "/tmp/opencode/original" && pdftoppm -png -r 150 "output/caio-pt.pdf" "/tmp/opencode/generated"`

Expected: `/tmp/opencode/original-1.png`, `/tmp/opencode/original-2.png`, `/tmp/opencode/generated-1.png`, and `/tmp/opencode/generated-2.png` exist.

- [ ] **Step 2: Inspect generated page images**

Read these files as images:

```text
/tmp/opencode/original-1.png
/tmp/opencode/generated-1.png
/tmp/opencode/original-2.png
/tmp/opencode/generated-2.png
```

Expected visual match points:

- Header is centered and compact.
- Blue section headings and rules match the original directionally.
- Skills are compact inline rows.
- Experience bullets remain under their related jobs.
- Projects start near the bottom of page 1.
- Education and languages are combined on page 2.

- [ ] **Step 3: Adjust CSS only if visual mismatch is significant**

If generated content is too large, reduce `body` font size by `0.2pt` and `section` top margin by `1px`.

If generated content is too small, increase `body` font size by `0.2pt` and `section` top margin by `1px`.

If horizontal content is too narrow or wide, adjust `@page` side margins by `1mm`.

- [ ] **Step 4: Rebuild and regenerate after any CSS adjustment**

Run: `npm run build && node ./dist/cli.js generate-pt --output caio-pt.pdf`

Expected: build succeeds and `output/caio-pt.pdf` is regenerated.

## Task 5: Final Verification

**Files:**
- No new files expected beyond generated `output/*.pdf`.

- [ ] **Step 1: Run build**

Run: `npm run build`

Expected: TypeScript exits with code 0.

- [ ] **Step 2: Generate PT and EN PDFs**

Run: `node ./dist/cli.js generate-pt --output caio-pt.pdf && node ./dist/cli.js generate-en --output caio-en.pdf`

Expected: both commands print generated output paths.

- [ ] **Step 3: Convert the Portuguese PDF to images and compare visually**

Run: `pdftoppm -png -r 150 "curriculo-caio-balieiro.pdf" "/tmp/opencode/original" && pdftoppm -png -r 150 "output/caio-pt.pdf" "/tmp/opencode/generated"`

Expected: page images exist in `/tmp/opencode` for visual comparison.

- [ ] **Step 4: Check git status without committing**

Run: `git status --short`

Expected: modified source/template/plan files are visible; no commit is created.

## Self-Review

- Spec coverage: The plan covers the existing Puppeteer pipeline, PT original layout, EN visual consistency, page/image verification with `pdftoppm`, no new engine, and no theme flag.
- Placeholder scan: No task contains TBD/TODO/fill-in placeholders. The only iterative section gives explicit numeric CSS adjustment rules.
- Type consistency: The only code helper is `uppercase`, used as `{{uppercase profile.name}}`; all template fields match `ResumeData` in `src/schema.ts`.
- User constraint: Automated tests were removed because the user explicitly requested no tests.
