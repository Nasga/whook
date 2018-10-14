import { constant, initializer } from 'knifecycle';
import { runServer, prepareServer } from './index';

describe('runServer', () => {
  it('should work', async () => {
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    const debug = jest.fn();
    const $autoload = jest.fn(async () => ({}.undef));
    const $ = await prepareServer();

    $.register(
      initializer(
        {
          name: '$autoload',
          type: 'service',
          options: { singleton: true },
        },
        async () => $autoload,
      ),
    );
    $.register(
      constant('API', {
        host: 'localhost:1337',
        swagger: '2.0',
        info: {
          version: '1.0.0',
          title: 'Sample Swagger',
          description: 'A sample Swagger file for testing purpose.',
        },
        basePath: '/v1',
        schemes: ['http'],
        paths: {
          '/ping': {
            head: {
              operationId: 'getPing',
              summary: "Checks API's availability.",
              responses: {
                '200': {
                  description: 'Pong',
                },
              },
            },
          },
        },
      }),
    );
    $.register(
      constant('ENV', {
        PORT: 8888,
        HOST: 'localhost',
        NODE_ENV: 'test',
      }),
    );
    $.register(constant('WRAPPERS', []));
    $.register(constant('NODE_ENV', 'test'));
    $.register(constant('DEBUG_NODE_ENVS', []));
    $.register(constant('NODE_ENVS', ['test']));
    $.register(
      constant('HANDLERS', {
        getPing: jest.fn(() => ({ status: 200 })),
      }),
    );
    $.register(constant('logger', logger));
    $.register(constant('debug', debug));

    process.env.ISOLATED_ENV = 1;

    const { $destroy } = await runServer(
      ['$destroy', 'httpServer', 'process'],
      $,
    );

    await $destroy();

    expect({
      debugCalls: debug.mock.calls,
      logInfoCalls: logger.info.mock.calls,
      logErrorCalls: logger.error.mock.calls,
      autoloaderCalls: $autoload.mock.calls,
    }).toMatchSnapshot();
  });
});
