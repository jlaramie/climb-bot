import type { APIGatewayEvent } from 'aws-lambda';
import type { APIBaseInteraction, InteractionType } from 'discord.js';
import nacl from 'tweetnacl';
import logger from '../logger';

const HEADER_SIGNATURE = 'X-Signature-Ed25519';
const HEADER_TIMESTAMP = 'X-Signature-Timestamp';

export async function interactionHandler<Type extends InteractionType, Data>(
  event: APIGatewayEvent
): Promise<APIBaseInteraction<Type, Data>> {
  const signature =
    event.headers[HEADER_SIGNATURE] ||
    event.headers[HEADER_SIGNATURE.toLowerCase()];
  const timestamp =
    event.headers[HEADER_TIMESTAMP] ||
    event.headers[HEADER_TIMESTAMP.toLowerCase()];

  if (!signature) {
    return Promise.reject({
      statusCode: 401,
      body: `${HEADER_SIGNATURE} Missing`
    });
  }

  if (!timestamp) {
    return Promise.reject({
      statusCode: 401,
      body: `${HEADER_TIMESTAMP} Missing`
    });
  }

  if (!event.body) {
    return Promise.reject({
      statusCode: 401,
      body: `Body Missing`
    });
  }

  const isValidRequest = verifyKey(
    // Serverless Offline sometimes parses and sometimes doesn't
    typeof event.body !== 'string' ? JSON.stringify(event.body) : event.body,
    signature,
    timestamp,
    process.env.BOT_PUBLIC_KEY!
  );

  if (!isValidRequest) {
    return Promise.reject({
      statusCode: 401,
      body: 'invalid request signature'
    });
  }

  // Serverless Offline sometimes parses and sometimes doesn't
  const body =
    typeof event.body === 'string' ? JSON.parse(event.body!) : event.body;

  logger.debug('Interaction', JSON.stringify(body, null, 2));

  if (body.type === 1) {
    return Promise.reject({
      statusCode: 200,
      body: JSON.stringify({ type: 1 })
    });
  }

  return body;
}

export function verifyKey(
  rawBody: Uint8Array | ArrayBuffer | Buffer | string,
  signature: string,
  timestamp: string,
  clientPublicKey: string
): boolean {
  return nacl.sign.detached.verify(
    Buffer.from(timestamp + rawBody),
    Buffer.from(signature, 'hex'),
    Buffer.from(clientPublicKey, 'hex')
  );
}

export function getAPILambdaUrl(event: APIGatewayEvent) {
  const host = event.headers['host'] || event.headers['Host'];
  const stage = event.requestContext.stage;
  const path = event.path;

  return 'https://' + host + '/' + stage + path;
}
