import type { APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import {
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandAutocompleteResponse,
  type APIInteractionResponse,
  InteractionResponseType,
  InteractionType,
  Routes,
  RESTPostAPIWebhookWithTokenJSONBody
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
  obj[entry[1]] = entry[0];
  return obj;
}, {} as Record<InteractionTypeValues, InteractionTypeKeys>);

export async function handler(
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult | undefined> {
  return interactionHandler(event)
    .then(async body => {
      const { type, token } = body;
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

            const fetchPromise = fetch(getAPILambdaUrl(event) + '-deferred', {
              method: 'post',
              headers: {
                ...event.headers,
                ['x-deferred']: 'true'
              },
              body: JSON.stringify(body)
            }).then(async res =>
              logger.log(
                [res.status, res.statusText, await res.text()].join('-')
              )
            );

            // Serverless Offline doesn't handle `async` functions correctly so no await
            if (process.env.IS_OFFLINE !== 'true') {
              await fetchPromise;
            }

            // Defer the response while loading it
            return {
              statusCode: 200,
              body: JSON.stringify({
                type: InteractionResponseType.DeferredChannelMessageWithSource
              } as APIInteractionResponse)
            };
          }

          logger.log('Call Regular');

          const responseBody = await Promise.race([
            commandHandler.handler(
              body as APIApplicationCommandAutocompleteInteraction
            ),
            new Promise(resolve => setTimeout(() => resolve(false), 29000))
          ]);

          logger.debug('Command Response', {
            statusCode: 200,
            body: JSON.stringify(responseBody)
          });

          // I thought this would be `Routes.interactionCallback(interactionId, token)` but it is not
          await rest
            .post(Routes.webhook(process.env.BOT_CLIENT_ID!, token), {
              body:
                responseBody === false
                  ? ({
                      content: 'Response Timeout'
                    } as RESTPostAPIWebhookWithTokenJSONBody)
                  : responseBody
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
            body: 'OK'
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
