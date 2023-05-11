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
import {
  client as graphqlClient,
  GetAreaQuery,
  type GetAreaQueryResponse,
  type GetAreaQueryVariables,
  getImageURL
} from '../utils/openbeta';
import { chunk } from 'lodash';

export const command = new SlashCommandBuilder()
  .setName('crag')
  .setDescription('Search for and display the OpenBeta information for a crag')
  .addStringOption(option =>
    option
      .setName('name')
      .setDescription('Search by crag name or description')
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
    GetAreaQueryResponse,
    GetAreaQueryVariables
  >(GetAreaQuery, {
    uuid: inputOption.value
  });

  logger.debug('GetCrag Response', JSON.stringify(response, null, 2));

  const { area } = response;

  // Create Embed
  const maxClimbsOrAreas = 50;
  const maxClimbsOrAreasPerField = 5;
  const image = area.media.find(
    media => ['jpeg', 'png', 'webp'].indexOf(media.format) !== -1
  );
  const areaChunks = chunk(area.children, maxClimbsOrAreasPerField);
  const climbChunks = chunk(area.climbs, maxClimbsOrAreasPerField);
  const hasMoreAreas =
    area.children.length > maxClimbsOrAreas
      ? `...${area.children.length - maxClimbsOrAreas} more`
      : undefined;
  const hasMoreClimbs =
    area.climbs.length > maxClimbsOrAreas
      ? `...${area.climbs.length - maxClimbsOrAreas} more`
      : undefined;
  const fields: APIEmbedField[] = [
    ...areaChunks
      .slice(0, maxClimbsOrAreas / maxClimbsOrAreasPerField)
      .map((areas, i, allItems) => ({
        name: 'Areas',
        value: areas
          .map(
            ({ uuid, area_name }) =>
              `[${area_name}](https://openbeta.io/crag/${uuid})`
          )
          .concat(hasMoreAreas && i + 1 === allItems.length ? hasMoreAreas : [])
          .join('\n'),
        inline: true
      })),
    ...climbChunks
      .slice(0, maxClimbsOrAreas / maxClimbsOrAreasPerField)
      .map((climbs, i, allItems) => ({
        name: 'Climbs',
        value: climbs
          .map(
            ({ uuid, name }) => `[${name}](https://openbeta.io/climb/${uuid})`
          )
          .concat(
            hasMoreClimbs && i + 1 === allItems.length ? hasMoreClimbs : []
          )
          .join('\n'),
        inline: true
      }))
  ].filter(v => !!v) as APIEmbedField[];
  const embed = new EmbedBuilder({
    title: area.area_name,
    description: area.content.description,
    url: `https://openbeta.io/crag/${area.uuid}`,
    thumbnail: image && {
      url: getImageURL(image.mediaUrl)
    },
    footer: {
      text: area.pathTokens.join(' > ')
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
                collection: 'areas',
                q: value,
                query_by: 'name, pathTokens',
                sort_by: value.trim()
                  ? '_text_match:desc,totalClimbs:desc'
                  : 'density:desc'
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

                const fullName = `${record.name} (${
                  record.pathTokens.length > 1
                    ? record.pathTokens[record.pathTokens.length - 2]
                    : ''
                }) ${
                  record.totalClimbs ? `(${record.totalClimbs} climbs)` : ''
                }`;

                return {
                  name:
                    fullName.length > 75
                      ? `${fullName.substring(0, 75)}...`
                      : fullName,
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
