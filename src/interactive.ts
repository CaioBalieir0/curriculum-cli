import inquirer from 'inquirer';
import type { CliOverrides } from './schema.js';

type InteractiveAnswers = Required<CliOverrides>;

const skillsMessage = 'Skills groups (format: Backend: Node.js, Fastify; Cloud: AWS, Docker):';

export async function collectInteractiveOverrides(initial: CliOverrides): Promise<CliOverrides> {
  const answers = await inquirer.prompt<InteractiveAnswers>([
    {
      type: 'input',
      name: 'title',
      message: 'Resume title:',
      default: initial.title
    },
    {
      type: 'input',
      name: 'summary',
      message: 'Professional summary:',
      default: initial.summary
    },
    {
      type: 'input',
      name: 'skills',
      message: skillsMessage,
      default: initial.skills
    },
    {
      type: 'input',
      name: 'output',
      message: 'Output filename:',
      default: initial.output
    }
  ]);

  return Object.fromEntries(
    Object.entries({ ...initial, ...answers }).filter(([, value]) => typeof value === 'string' && value.trim())
  ) as CliOverrides;
}
