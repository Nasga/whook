import { reuseSpecialProps, alsoInject } from 'knifecycle';
import HTTPError from 'yhttperror';
import {
  parseAuthorizationHeader,
  BEARER as BEARER_MECHANISM,
} from 'http-auth-utils';

/**
 * Wrap an handler initializer to check client's authorizations.
 * @param {Function} initHandler The handler initializer
 * @returns {Function} The handler initializer wrapped
 */
export function wrapHandlerWithAuthorization(initHandler) {
  return alsoInject(
    ['?MECHANISMS', '?DEFAULT_MECHANISM', 'authentication', 'log'],
    reuseSpecialProps(
      initHandler,
      initHandlerWithAuthorization.bind(null, initHandler),
    ),
  );
}

async function initHandlerWithAuthorization(
  initHandler,
  {
    MECHANISMS = [BEARER_MECHANISM],
    DEFAULT_MECHANISM = BEARER_MECHANISM.type,
    authentication,
    log,
    ...otherServices
  },
) {
  log('debug', '🔐 - Initializing the authentication wrapper.');

  const services = {
    MECHANISMS,
    DEFAULT_MECHANISM,
    authentication,
    log,
    ...otherServices,
  };
  const handler = await initHandler(services);

  return handleWithAuthorization.bind(null, services, handler);
}

async function handleWithAuthorization(
  { MECHANISMS, DEFAULT_MECHANISM, authentication },
  handler,
  parameters,
  operation,
) {
  let response;

  // Since the operation embed the security rules
  // we need ensure we got it here since, if for
  // any reason, the operation is not transmitted
  // then security will not be checked
  // and the API will have a big security hole.
  // TL;DR: DO NOT remove this line!
  if (!operation) {
    throw new HTTPError(500, 'E_OPERATION_REQUIRED');
  }

  if ('undefined' === typeof operation.security) {
    response = await handler(parameters, operation);
  } else {
    const authorization = parameters.access_token
      ? `${DEFAULT_MECHANISM} ${parameters.access_token}`
      : parameters.authorization;
    let parsedAuthorization;

    if (!authorization) {
      throw new HTTPError(401, 'E_UNAUTHORIZED');
    }

    try {
      parsedAuthorization = parseAuthorizationHeader(
        authorization,
        MECHANISMS.filter(
          mechanism =>
            operation.security[`${mechanism.type.toLowerCase()}Auth`],
        ),
      );
    } catch (err) {
      // This code should be simplified by solving this issue
      // https://github.com/nfroidure/http-auth-utils/issues/2
      if (
        err.code === 'E_UNKNOWN_AUTH_MECHANISM' &&
        MECHANISMS.some(
          mechanism =>
            authorization.substr(0, mechanism.type.length) === mechanism.type,
        )
      ) {
        throw HTTPError.wrap(err, 400, 'E_UNALLOWED_AUTH_MECHANISM');
      }
      throw HTTPError.cast(err, 400);
    }

    const requiredScopes =
      operation.security[`${parsedAuthorization.type.toLowerCase()}Auth`];

    // If security exists, we need at least one scope
    if (!(requiredScopes && requiredScopes.length)) {
      throw new HTTPError(
        500,
        'E_MISCONFIGURATION',
        parsedAuthorization.type,
        requiredScopes,
      );
    }

    let authorizationContent;

    try {
      authorizationContent = await authentication.check(
        parsedAuthorization.type.toLowerCase(),
        parsedAuthorization.data,
      );
    } catch (err) {
      throw HTTPError.cast(err, 401);
    }

    // Check user id if present in parameters
    if (
      'undefined' !== typeof parameters.userId &&
      authorizationContent.userId !== parameters.userId
    ) {
      throw new HTTPError(
        403,
        'E_UNAUTHORIZED',
        authorizationContent.userId,
        parameters.userId,
      );
    }

    // Check scopes
    if (
      !requiredScopes.some(requiredScope =>
        authorizationContent.scopes.includes(requiredScope),
      )
    ) {
      throw new HTTPError(
        403,
        'E_UNAUTHORIZED',
        authorizationContent.scopes,
        requiredScopes,
      );
    }

    response = await handler(
      {
        ...parameters,
        ...authorizationContent,
        authenticated: true,
      },
      operation,
    );
    response = {
      ...response,
      headers: {
        ...(response.headers || {}),
        'X-Authenticated': JSON.stringify(authorizationContent),
      },
    };
  }
  return response;
}
