import type { APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import {
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandAutocompleteResponse,
  InteractionResponseType,
  InteractionType
} from 'discord.js';

import { interactionHandler } from '../utils/interaction';
import logger from '../logger';
import * as ClimbCommand from '../commands/climb';

export async function handler(
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> {
  return interactionHandler(event)
    .then(async body => {
      const { type } = body;

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
          const responseBody = await ClimbCommand.handler(
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
