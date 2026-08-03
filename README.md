# curriculo-cli

CLI em Node.js para gerar curriculos e cartas de apresentacao personalizadas em PDF, com suporte a portugues e ingles, dados estruturados em JSON, flags e modo interativo para ajustes simples.

## Visao Geral

O `curriculo-cli` combina dados padrao, configuracao JSON e sobrescritas de linha de comando para gerar documentos reproduziveis.

O modelo de dados separa campos compartilhados dos campos especificos de cada documento:

```json
{
  "profile": {},
  "cv": {},
  "coverLetter": {}
}
```

`profile` e sempre obrigatorio. `cv` e `coverLetter` sao opcionais, mas pelo menos um deles deve existir no JSON final.

## Geração Condicional

Os comandos continuam sendo:

```bash
resume generate-pt
resume generate-en
```

Com `--config`, as secoes presentes no arquivo apontado controlam o que sera gerado:

```text
profile + cv + coverLetter -> gera curriculo e carta
profile + cv               -> gera somente curriculo
profile + coverLetter      -> gera somente carta
profile                    -> erro: nada para gerar
```

Sem `--config`, o comando usa `data/default-pt.json` ou `data/default-en.json`.

## Tecnologias

- TypeScript e Node.js com ES Modules.
- Commander para os comandos `generate-pt` e `generate-en`.
- Zod para validacao dos JSONs.
- Handlebars para renderizar HTML e TEX.
- Puppeteer para converter o curriculo HTML em PDF.
- XeLaTeX para compilar a carta de apresentacao em PDF.

## Requisitos

```bash
npm install
npm run build
```

Para gerar cartas de apresentacao, instale uma distribuicao TeX que forneca `xelatex`.

Se `xelatex` nao estiver disponivel e `coverLetter` for solicitado, o comando falha com uma mensagem explicita.

## Estrutura

```text
assets/cover/          Classe LaTeX cover.cls e fontes OpenFonts
bin/resume             Executavel publicado pelo pacote
data/                  Dados padrao em PT e EN
dist/                  Codigo JavaScript compilado
src/                   Codigo fonte TypeScript
templates/             Templates HTML do curriculo e TEX da carta
output/                PDFs finais gerados localmente
output/bin/            TEX, logs e arquivos auxiliares da compilacao
```

## Formato Do JSON

Exemplo com curriculo e carta:

```json
{
  "profile": {
    "name": "Lucas",
    "location": "Sao Paulo, SP",
    "phone": "+55 11 99999-9999",
    "email": "lucas@example.com",
    "linkedin": "linkedin.com/in/lucas",
    "github": "github.com/lucas",
    "portfolio": "https://portfolio.example.com"
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
        "title": "Empresa X | Desenvolvedor Full Stack Junior | Remoto | Jan/2026 - Atual",
        "context": "Desenvolvimento de plataforma web com APIs, frontend e banco de dados.",
        "bullets": ["Implementei funcionalidades full stack e corrigi problemas em producao."]
      }
    ],
    "projects": [],
    "education": [
      {
        "title": "FATEC - Analise e Desenvolvimento de Sistemas | 2023 - 2026",
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

O campo `coverLetter.date` e opcional. Se omitido, o TEX usa `\today`.

O campo `profile.portfolio` e opcional. Se existir, a carta mostra `Portfólio` clicavel abaixo dos contatos do cabecalho. Se nao existir, essa linha nao aparece.

## Exemplos

Gerar documentos padrao em portugues:

```bash
node ./dist/cli.js generate-pt --output caio-balieiro
```

Gerar usando um JSON de vaga:

```bash
node ./dist/cli.js generate-pt --config ./vaga.json --output lucas
```

Se `vaga.json` tiver `cv` e `coverLetter`, a saida sera:

```text
output/curriculo-lucas.pdf
output/carta-apresentacao-lucas.pdf
output/bin/carta-apresentacao-lucas.tex
output/bin/carta-apresentacao-lucas.log
```

Se `vaga.json` tiver somente `coverLetter`, a saida sera:

```text
output/carta-apresentacao-lucas.pdf
output/bin/carta-apresentacao-lucas.tex
output/bin/carta-apresentacao-lucas.log
```

## Flags

`--title <text>` sobrescreve `cv.title`.

`--summary <text>` sobrescreve `cv.summary`.

`--skills <text>` substitui `cv.skills`. Formato: `Categoria: item, item; Categoria: item`.

`--output <base>` define a base dos nomes gerados dentro de `output/`. Por exemplo, `--output caio-balieiro` gera `output/curriculo-caio-balieiro.pdf` e `output/carta-apresentacao-caio-balieiro.pdf`. Componentes de diretorio, como `../resume` ou `nested/resume`, sao rejeitados. Se `.pdf` for informado, ele e removido da base antes de aplicar os prefixos.

`--config <path>` carrega um JSON parcial. Chaves desconhecidas sao rejeitadas com erro de validacao.

`--interactive` abre prompts para sobrescritas simples do curriculo.

## Ordem De Merge

```text
dados padrao < config JSON < flags ou respostas interativas
```

Com `--config`, os defaults completam apenas as secoes selecionadas pelo arquivo. Se o config nao tiver `cv`, o curriculo nao sera gerado por causa dos defaults. Se o config nao tiver `coverLetter`, a carta nao sera gerada por causa dos defaults.

## Verificacao Local

```bash
npm run build
node ./dist/cli.js generate-pt --output pt-check
node ./dist/cli.js generate-en --output en-check
```

Para carta de apresentacao, use um JSON com `coverLetter` e garanta que `xelatex` esteja instalado.
