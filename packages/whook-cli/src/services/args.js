import { autoService, options } from 'knifecycle';
import minimist from 'minimist';

export default options({ singleton: true }, autoService(initArgs));

async function initArgs({ ARGS, log }) {
  const args = minimist(ARGS);

  log('debug', '🛠 - Parsed args:', args);
  return args;
}
