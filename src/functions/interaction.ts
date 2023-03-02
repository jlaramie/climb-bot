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

import { interactionHandler } from '../utils/interaction';
import logger from '../logger';
import * as ClimbCommand from '../commands/climb';
import { rest } from '../utils/discord';

export async function handler(
  event: APIGatewayEvent,
  context: Context,
  callback: APIGatewayProxyCallback
): Promise<APIGatewayProxyResult> {
  return interactionHandler(event)
    .then(async body => {
      const { token, type } = body;

      switch (type) {
        case InteractionType.ApplicationCommandAutocomplete: {
          const response: APIApplicationCommandAutocompleteResponse =
            await ClimbCommand.autocomplete(
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
          // Defer the response while loading it
          callback(null, {
            statusCode: 200,
            body: JSON.stringify({
              type: InteractionResponseType.DeferredChannelMessageWithSource
            } as APIInteractionResponse)
          });

          const responseBody = await ClimbCommand.handler(
            body as APIApplicationCommandAutocompleteInteraction
          );

          // Send Response
          await rest
            .post(Routes.webhook(process.env.BOT_CLIENT_ID!, token), {
              body: responseBody
            })
            .then(response => {
              logger.debug('Command Response', response);
            })
            .catch(e => {
              logger.error('Command Error', e);
              throw e;
            });
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
