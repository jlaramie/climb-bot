import type {
  Context,
  APIGatewayProxyResult,
  APIGatewayEvent,
  APIGatewayProxyCallback
} from 'aws-lambda';
import {
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandAutocompleteResponse,
  type APIInteractionResponse,
  InteractionResponseType,
  InteractionType,
  Routes
} from 'discord.js';
import fetch from 'node-fetch';

import { getAPILambdaUrl, interactionHandler } from '../utils/interaction';
import logger from '../logger';
import * as ClimbCommand from '../commands/climb';
import * as CragCommand from '../commands/crag';
import { rest } from '../utils/discord';

type InteractionTypeKeys = keyof typeof InteractionType;
type InteractionTypeValues = (typeof InteractionType)[InteractionTypeKeys];
const interactionTypeNames = Object.entries(InteractionType).reduce<
  Record<InteractionTypeValues, InteractionTypeKeys>
>((obj, entry) => {
  // @ts-expect-error - Typescript doesn't like this
  obj[entry[1]] = entry[0];
  return obj;
}, {} as Record<InteractionTypeValues, InteractionTypeKeys>);

export async function handler(
  event: APIGatewayEvent,
  _context: Context,
  _callback: APIGatewayProxyCallback
): Promise<APIGatewayProxyResult> {
  return interactionHandler(event)
    .then(async body => {
      const { type, token, id: interactionId } = body;
      const { name } =
        (body as APIApplicationCommandAutocompleteInteraction).data || {};

      if (process.env.NODE_ENV === 'production') {
        logger.log('Interaction', {
          typeName: interactionTypeNames[type],
          data: JSON.stringify(body.data)
        });
      }

      let commandHandler;
      switch (name) {
        case 'climb':
          commandHandler = ClimbCommand;
          break;
        case 'crag':
          commandHandler = CragCommand;
          break;
        default:
          if (name) {
            throw new Error(`"${name}" command not found`);
          }
          break;
      }

      switch (type) {
        case InteractionType.ApplicationCommandAutocomplete: {
          if (!commandHandler?.autocomplete) {
            throw new Error(`"${name}" command autocomplete not found`);
          }
          const response: APIApplicationCommandAutocompleteResponse =
            await commandHandler.autocomplete(
              body as APIApplicationCommandAutocompleteInteraction
            );

          logger.debug(
            'Autocomplete Response',
            JSON.stringify(response, null, 2)
          );

          return {
            statusCode: 200,
            body: JSON.stringify(response)
          };
        }
        case InteractionType.ApplicationCommand: {
          if (!commandHandler?.handler) {
            throw new Error(`"${name}" command handler not found`);
          }

          if (event.headers['x-deferred'] !== 'true') {
            logger.log('Call Deferred');

            await fetch(getAPILambdaUrl(event), {
              method: 'post',
              headers: { ...event.headers, ['x-deferred']: 'true' },
              body: JSON.stringify(body)
            });

            // Defer the response while loading it
            return {
              statusCode: 200,
              body: JSON.stringify({
                type: InteractionResponseType.DeferredChannelMessageWithSource
              } as APIInteractionResponse)
            };
          }

          logger.log('Call Regular');

          const responseBody = await commandHandler.handler(
            body as APIApplicationCommandAutocompleteInteraction
          );

          logger.debug('Command Response', {
            statusCode: 200,
            body: JSON.stringify({
              type: InteractionResponseType.ChannelMessageWithSource,
              data: responseBody
            })
          });

          // Send Response
          await rest
            .post(Routes.interactionCallback(interactionId, token), {
              body: {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: responseBody
              }
            })
            .then(response => {
              logger.debug('Command Response', response);
            })
            .catch(e => {
              logger.error('Command Error', e);
            });

          // Send Response
          return {
            statusCode: 200,
            body: JSON.stringify({
              type: InteractionResponseType.ChannelMessageWithSource,
              data: responseBody
            })
          };
        }
      }

      throw new Error('Not Handled');
    })
    .catch((e: Error | APIGatewayProxyResult) => {
      if (e instanceof Error) {
        logger.error(e);
        return {
          statusCode: 500,
          body:
            process.env.NODE_ENV === 'development'
              ? e.toString()
              : 'Unhandled Error'
        };
      }

      logger.info(e);

      return e;
    });
}
