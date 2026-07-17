# curriculo-cli

Node.js CLI for generating customized resume PDFs in Portuguese or English.

## Install And Build

```bash
npm install
npm run build
```

The package runs `npm run build` during `npm pack`/publish so the installed `resume` binary can load `dist/cli.js` and the bundled runtime assets.

Run locally after building:

```bash
node ./dist/cli.js generate-pt
node ./dist/cli.js generate-en
```

If installed as a package, the executable name is `resume`:

```bash
resume generate-pt
resume generate-en
```

## Commands

`resume generate-pt` generates a Portuguese resume PDF from `data/default-pt.json` and `templates/pt.html`.

`resume generate-en` generates an English resume PDF from `data/default-en.json` and `templates/en.html`.

Generated PDFs are written to `./output` relative to the directory where you run the command. Templates and default data are loaded from the installed package/project directory.

## Flags

`--title <text>` overrides `profile.title`.

`--summary <text>` overrides `profile.summary`.

`--skills <text>` overrides the full `skills` array. Format: `Category: item, item; Category: item`.

`--output <filename>` sets the PDF filename inside `output/`. Directory components such as `../resume` or `nested/resume.pdf` are rejected. If `.pdf` is missing, it is appended automatically.

`--config <path>` loads a JSON config file with partial resume data. Unknown keys are rejected with field-path validation errors to catch typos.

`--interactive` prompts for title, summary, skills, and output filename.

## Examples

Generate a default Portuguese resume:

```bash
node ./dist/cli.js generate-pt --output caio-pt.pdf
```

Generate a default English resume:

```bash
node ./dist/cli.js generate-en --output caio-resume.pdf
```

Generate with simple flag overrides:

```bash
node ./dist/cli.js generate-pt \
  --title "Junior DevOps Engineer" \
  --summary "Developer focused on CI/CD, containers, and observability." \
  --skills "Backend: Node.js, Fastify; Cloud: AWS, Docker" \
  --output caio-devops.pdf
```

Generate with a config file:

```bash
node ./dist/cli.js generate-en --config ./config/job.json --output caio-job.pdf
```

Generate with interactive prompts:

```bash
node ./dist/cli.js generate-pt --interactive
```

## Merge Behavior

Resume data is merged in this order:

```text
default data < config JSON < CLI flags or interactive answers
```

Objects are deeply merged field by field, so a config can override only `profile.title` while keeping all other profile fields from the default data.

Arrays replace whole sections when present and non-empty. This applies to `skills`, `experience`, `projects`, `education`, and `languages`. If an array is missing or empty in the config, the default section remains.

## Complete Config Example

`--config` accepts a partial resume JSON. Any omitted fields keep the selected default data from `data/default-pt.json` or `data/default-en.json`. Arrays replace the whole section when present and non-empty.

```json
{
  "profile": {
    "name": "Caio Balieiro Mariano",
    "location": "Guaratingueta, SP",
    "phone": "+55 12 99142-2498",
    "email": "caiobalieiro676@gmail.com",
    "linkedin": "linkedin.com/in/caio-balieiro",
    "github": "github.com/CaioBalieir0",
    "title": "Desenvolvedor Backend Junior",
    "summary": "Desenvolvedor focado em Node.js, TypeScript, APIs REST, PostgreSQL, Redis e AWS, com experiencia em sistemas de pagamento, backoffices e automacao de testes."
  },
  "skills": [
    {
      "category": "Backend",
      "items": ["TypeScript", "Node.js", "Fastify", "Express", "REST APIs", "PostgreSQL", "Redis", "JWT", "Zod"]
    },
    {
      "category": "Cloud/DevOps",
      "items": ["AWS Lambda", "ECS Fargate", "Docker", "CI/CD", "GitHub Actions"]
    }
  ],
  "experience": [
    {
      "title": "InfinityBase | Desenvolvedor Full Stack Junior | Out/2025 - Mai/2026",
      "context": "Atuacao em fintech automotiva com APIs REST, chatbots de pagamento via WhatsApp e backoffice multi-tenant.",
      "bullets": [
        "Desenvolvi e mantive APIs REST com TypeScript, Bun, Clean Architecture e Express legado, integradas a bancos PostgreSQL.",
        "Atuei em chatbots de pagamento com AWS Lambda, Lex, Twilio, Redis e BullMQ para conciliar sessoes ativas com confirmacoes de PIX.",
        "Investiguei bugs em ambientes distribuidos usando CloudWatch, dumps de banco e tracing com OpenTelemetry/AWS X-Ray."
      ]
    }
  ],
  "projects": [
    {
      "title": "Benchmark de Bancos de Dados (TCC) - JavaScript, Docker, PostgreSQL, MongoDB, CockroachDB, Redis",
      "context": "Projeto de comparacao de desempenho entre bancos SQL, NoSQL, NewSQL e In-Memory.",
      "bullets": [
        "Comparei latencia, TPS e consumo de recursos em ambiente isolado com Docker Compose."
      ]
    }
  ],
  "education": [
    {
      "title": "FATEC Guaratingueta - Analise e Desenvolvimento de Sistemas (Tecnologo) | Fev/2023 - Fev/2026",
      "details": [
        "Certificacoes: Cisco Networking Academy - Fundamentos da Rede (Jul/2025) | IT Essentials (Jun/2023)"
      ]
    }
  ],
  "languages": ["Portugues nativo", "Ingles intermediario (leitura tecnica fluente)"]
}
```

Every object rejects unknown keys, so typos such as `profiles`, `skill`, or `bullet` fail with field-path validation errors. The templates and CLI also accept canonical updates by editing `data/default-pt.json` and `data/default-en.json` when the default resume itself should change.

## Manual Verification

```bash
npm run build
node ./dist/cli.js generate-pt --output pt-check.pdf
node ./dist/cli.js generate-en --output en-check.pdf
node ./dist/cli.js generate-pt --title "Junior DevOps Engineer" --skills "Backend: Node.js, Fastify; Cloud: AWS, Docker" --output flags-check.pdf
```

To verify config validation, create a temporary invalid config such as:

```json
{
  "skills": "Node.js"
}
```

Then run:

```bash
node ./dist/cli.js generate-pt --config ./invalid-config.json
```

Expected output includes a field-path validation error and exits with code 1.
