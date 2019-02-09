import { extra, autoService } from 'knifecycle';

const definition = {
  description: 'A command printing env values for sample purpose',
  example: `whook env --property NODE_ENV`,
  arguments: {
    type: 'object',
    required: ['property'],
    properties: {
      name: {
        description: 'Property to pickup in env',
        type: 'string',
      },
    },
  },
};

export default extra(definition, autoService(initEnvCommand));

async function initEnvCommand({ ENV, log, args }) {
  return async () => {
    log('info', `${JSON.stringify(ENV[args.property])}`);
  };
}
