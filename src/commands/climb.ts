import {
  SlashCommandBuilder,
  InteractionResponseType,
  type APIApplicationCommandAutocompleteResponse,
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandInteractionDataStringOption,
  RESTPostAPIWebhookWithTokenJSONBody,
  APIEmbedField,
  EmbedBuilder
} from 'discord.js';
import type { MultiSearchResponse } from 'typesense/lib/Typesense/MultiSearch';

import {
  client as typesenseClient,
  type AreaSearchResponse,
  type ClimbSearchResponse
} from '../utils/typesense';
import logger from '../logger';
import { uniq } from 'lodash';
import {
  client as graphqlClient,
  GetClimbQuery,
  type GetClimbQueryResponse,
  type GetClimbQueryVariables,
  getImageURL
} from '../utils/openbeta';
import {
  getDisciplineIcon,
  getDisciplines,
  getFormattedDiscipline
} from '../utils/climb';

export const command = new SlashCommandBuilder()
  .setName('climb')
  .setDescription('Search for and display the OpenBeta climb information')
  .addStringOption(option =>
    option
      .setName('name')
      .setDescription('Search by climb name or description')
      .setAutocomplete(true)
      .setRequired(true)
  );

export const isDev = false;

export async function handler(
  body: APIApplicationCommandAutocompleteInteraction
): Promise<RESTPostAPIWebhookWithTokenJSONBody> {
  const { options } = (body as APIApplicationCommandAutocompleteInteraction)
    .data;
  const inputOption = options.find(option => {
    return option.name === 'name';
  }) as APIApplicationCommandInteractionDataStringOption;

  // Load Response
  const response = await graphqlClient.request<
    GetClimbQueryResponse,
    GetClimbQueryVariables
  >(GetClimbQuery, {
    uuid: inputOption.value
  });

  logger.debug('GetClimb Response', JSON.stringify(response, null, 2));

  const { climb } = response;

  // Create Embed
  const image = climb.media.find(
    media => ['jpeg', 'png', 'webp'].indexOf(media.format) !== -1
  );
  const fields: APIEmbedField[] = [
    (climb.grades?.yds || climb.grades?.vscale) && {
      name: 'Grade',
      value: climb.grades?.yds || climb.grades.vscale,
      inline: true
    },
    {
      name: 'Type',
      value: getDisciplines(climb.type).map(getFormattedDiscipline).join(', '),
      inline: true
    },
    climb.content.protection && {
      name: 'Protection',
      value: climb.content.protection,
      inline: false
    },
    climb.fa && {
      name: 'FA',
      value: climb.fa,
      inline: false
    }
  ].filter(v => !!v) as APIEmbedField[];
  const embed = new EmbedBuilder({
    title: climb.name,
    description: climb.content.description,
    url: `https://openbeta.io/climbs/${climb.uuid}`,
    thumbnail: image && {
      url: getImageURL(image.mediaUrl)
    },
    footer: {
      text: climb.pathTokens.join(' > ')
    },
    author: {
      name: 'OpenBeta',
      url: 'https://openbeta.io/',
      iconURL:
        'https://cdn.discordapp.com/icons/815145484003967026/947e2c1eea520a9e28fb32e381387704.webp?size=128'
    },
    fields
  });

  const responseBody: RESTPostAPIWebhookWithTokenJSONBody = {
    embeds: [embed.toJSON()]
  };

  return responseBody;
}

export type ClimbsSearchResponse = MultiSearchResponse<ClimbSearchResponse>;
export type AreasSearchResponse = MultiSearchResponse<AreaSearchResponse>;

export async function autocomplete(
  body: APIApplicationCommandAutocompleteInteraction
) {
  const { name: commandName } = body.data;
  const focusedOption = body.data.options.find(option => {
    return (option as APIApplicationCommandInteractionDataStringOption).focused;
  }) as APIApplicationCommandInteractionDataStringOption;
  const { name, value } = focusedOption;

  switch (name) {
    case 'name': {
      const typesenseResponse = await typesenseClient.multiSearch
        .perform(
          {
            searches: [
              {
                collection: 'climbs',
                q: value,
                query_by: 'climbName, climbDesc'
              }
            ]
          },
          {
            page: 1,
            per_page: 25
          }
        )
        .then(response => response as ClimbsSearchResponse);

      logger.debug(
        'TypeSense Response for climbs',
        JSON.stringify(typesenseResponse, null, 2)
      );

      const response: APIApplicationCommandAutocompleteResponse = {
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: {
          choices: typesenseResponse.results.flatMap(
            result =>
              result.hits?.map(hit => {
                const record = hit.document;
                return {
                  name: `${uniq(
                    record.disciplines.map(getDisciplineIcon).filter(v => v)
                  ).join('')} ${record.climbName} (${
                    record.areaNames[record.areaNames.length - 1]
                  }) (${record.grade})`,
                  value: record.climbUUID
                };
              }) || []
          )
        }
      };

      return response;
    }

    case 'area': {
      const typesenseResponse = await typesenseClient.multiSearch
        .perform(
          {
            searches: [
              {
                collection: 'areas',
                q: value,
                query_by: 'name, pathTokens',
                sort_by: '_text_match:desc,totalClimbs:desc'
              }
            ]
          },
          {
            page: 1,
            per_page: 25
          }
        )
        .then(response => response as AreasSearchResponse);

      const response: APIApplicationCommandAutocompleteResponse = {
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: {
          choices: typesenseResponse.results.flatMap(
            result =>
              result.hits?.map(hit => {
                const record = hit.document;
                return {
                  name: `${record.name} (${record.totalClimbs})`,
                  value: record.areaUUID
                };
              }) || []
          )
        }
      };

      return response;
    }

    default: {
      logger.warn(
        `Could not determine autosuggest path for "${commandName}:${name}"`
      );
      const response: APIApplicationCommandAutocompleteResponse = {
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: {
          choices: []
        }
      };

      return response;
    }
  }
}
