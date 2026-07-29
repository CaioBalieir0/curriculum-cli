# curriculo-cli

CLI em Node.js para gerar curriculos personalizados em PDF, com suporte a portugues e ingles, templates HTML e configuracao via JSON, flags ou modo interativo.

Este projeto foi criado como uma ferramenta pratica para adaptar curriculos rapidamente para diferentes vagas, mantendo os dados estruturados, validando entradas e gerando um PDF final com layout consistente.

## Visao Geral

O `curriculo-cli` combina dados padrao, configuracoes parciais e sobrescritas de linha de comando para montar um curriculo final em PDF. A proposta e evitar edicoes manuais repetitivas em documentos visuais e permitir que cada versao do curriculo seja reproduzivel a partir de dados estruturados.

Principais capacidades:

- Geracao de curriculos em portugues e ingles.
- Templates HTML separados por idioma.
- Exportacao para PDF em formato A4.
- Configuracao por arquivo JSON parcial.
- Sobrescrita rapida de titulo, resumo, skills e nome do arquivo via flags.
- Modo interativo para preencher ajustes simples pelo terminal.
- Validacao estrita dos dados para evitar typos e configs invalidas.

## Tecnologias Utilizadas

- **TypeScript**: tipagem estatica e organizacao do codigo fonte.
- **Node.js com ES Modules**: runtime da CLI e manipulacao de arquivos.
- **Commander**: definicao dos comandos `generate-pt` e `generate-en`.
- **Zod**: validacao dos dados do curriculo e das configs JSON.
- **Handlebars**: renderizacao dos templates HTML com os dados do curriculo.
- **Puppeteer**: conversao do HTML renderizado para PDF.
- **Inquirer**: fluxo interativo para sobrescritas simples via terminal.

## Arquitetura

O fluxo de geracao segue esta ordem:

```text
dados padrao + config JSON + flags/modo interativo
        -> merge dos dados
        -> validacao com Zod
        -> renderizacao HTML com Handlebars
        -> exportacao PDF com Puppeteer
```

Os dados base ficam em `data/default-pt.json` e `data/default-en.json`. Os layouts ficam em `templates/pt.html` e `templates/en.html`. A saida final e escrita em `output/`, relativa ao diretorio onde o comando foi executado.

## Estrutura Do Projeto

```text
bin/resume             Executavel publicado pelo pacote
data/                  Dados padrao dos curriculos em PT e EN
dist/                  Codigo JavaScript compilado
src/                   Codigo fonte TypeScript da CLI
templates/             Templates HTML usados na renderizacao
output/                PDFs gerados localmente
```

Arquivos principais em `src/`:

- `cli.ts`: registra comandos, flags e fluxo principal de geracao.
- `schema.ts`: define os schemas Zod e os tipos de dados do curriculo.
- `merge.ts`: aplica a ordem de prioridade entre defaults, config e flags.
- `render.ts`: renderiza HTML e gera PDF com Puppeteer.
- `interactive.ts`: coleta sobrescritas simples com prompts no terminal.

## Instalacao E Build

```bash
npm install
npm run build
```

O pacote executa `npm run build` durante `npm pack`/publish, garantindo que o binario instalado consiga carregar `dist/cli.js` e os assets de runtime incluidos no pacote.

## Como Usar Localmente

Depois do build, execute diretamente o arquivo compilado:

```bash
node ./dist/cli.js generate-pt
node ./dist/cli.js generate-en
```

Tambem existem scripts npm para os dois idiomas:

```bash
npm run generate:pt
npm run generate:en
```

Se o pacote estiver instalado, o executavel se chama `resume`:

```bash
resume generate-pt
resume generate-en
```

## Comandos

`resume generate-pt` gera um curriculo em portugues usando `data/default-pt.json` e `templates/pt.html`.

`resume generate-en` gera um curriculo em ingles usando `data/default-en.json` e `templates/en.html`.

Os PDFs gerados sao salvos em `./output`. Templates e dados padrao sao carregados do diretorio do projeto ou do pacote instalado.

## Flags

`--title <text>` sobrescreve `profile.title`.

`--summary <text>` sobrescreve `profile.summary`.

`--skills <text>` substitui todo o array `skills`. Formato: `Categoria: item, item; Categoria: item`.

`--output <filename>` define o nome do PDF dentro de `output/`. Componentes de diretorio, como `../resume` ou `nested/resume.pdf`, sao rejeitados. Se `.pdf` nao for informado, a extensao e adicionada automaticamente.

`--config <path>` carrega um arquivo JSON com dados parciais do curriculo. Chaves desconhecidas sao rejeitadas com erros indicando o caminho do campo.

`--interactive` abre prompts para titulo, resumo, skills e nome do arquivo de saida.

## Exemplos

Gerar um curriculo padrao em portugues:

```bash
node ./dist/cli.js generate-pt --output caio-pt.pdf
```

Gerar um curriculo padrao em ingles:

```bash
node ./dist/cli.js generate-en --output caio-resume.pdf
```

Gerar com sobrescritas simples por flags:

```bash
node ./dist/cli.js generate-pt \
  --title "Junior DevOps Engineer" \
  --summary "Developer focused on CI/CD, containers, and observability." \
  --skills "Backend: Node.js, Fastify; Cloud: AWS, Docker" \
  --output caio-devops.pdf
```

Gerar usando um arquivo de configuracao:

```bash
node ./dist/cli.js generate-en --config ./config/job.json --output caio-job.pdf
```

Gerar com prompts interativos:

```bash
node ./dist/cli.js generate-pt --interactive
```

## Ordem De Merge

Os dados do curriculo sao combinados nesta ordem:

```text
dados padrao < config JSON < flags ou respostas interativas
```

Objetos sao mesclados campo a campo. Isso permite, por exemplo, sobrescrever apenas `profile.title` em um arquivo de config e manter os outros campos de `profile` vindos dos dados padrao.

Arrays substituem secoes inteiras quando informados e nao vazios. Isso vale para `skills`, `experience`, `education` e `languages`. Se um desses arrays estiver ausente ou vazio na config, a secao padrao e preservada. `projects` e a excecao: use `"projects": []` para ocultar a secao de projetos pessoais.

## Exemplo De Config JSON

`--config` aceita um JSON parcial. Campos omitidos continuam usando os dados padrao do idioma selecionado.

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

Todos os objetos rejeitam chaves desconhecidas. Erros como `profiles`, `skill` ou `bullet` falham com mensagens de validacao indicando o caminho do campo incorreto.

## Verificacao Local

```bash
npm run build
node ./dist/cli.js generate-pt --output pt-check.pdf
node ./dist/cli.js generate-en --output en-check.pdf
node ./dist/cli.js generate-pt --title "Junior DevOps Engineer" --skills "Backend: Node.js, Fastify; Cloud: AWS, Docker" --output flags-check.pdf
```

Para verificar a validacao de configs, crie temporariamente um arquivo JSON invalido, por exemplo:

```json
{
  "skills": "Node.js"
}
```

Depois execute:

```bash
node ./dist/cli.js generate-pt --config ./invalid-config.json
```

O resultado esperado e um erro de validacao com caminho do campo e codigo de saida `1`.
