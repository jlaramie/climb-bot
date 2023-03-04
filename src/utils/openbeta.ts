import { gql, GraphQLClient } from 'graphql-request';
import type {
  ClimbGQLQueryType,
  IClimbContent,
  IClimbProps
} from './openbeta/climb-types';
import type { MediaType } from './openbeta/media-types';

export const client = new GraphQLClient(
  process.env.OPEN_BETA_GRAPHQL_ENDPOINT!
);

export type GetClimbQueryVariables = {
  uuid: string;
};

export type GetClimbQueryResponse = {
  climb: Pick<IClimbProps, 'grades' | 'fa' | 'name' | 'safety' | 'type'> & {
    uuid: string;
    content: IClimbContent;
    media: Array<Pick<MediaType, 'mediaType' | 'mediaUrl'>>;
    metadata: {
      lat: number;
      lng: number;
      mp_id?: string;
    };
    parent: Pick<
      ClimbGQLQueryType['parent'],
      'area_name' | 'density' | 'totalClimbs'
    >;
  } & Pick<ClimbGQLQueryType, 'parent' | 'pathTokens'>;
};

export const GetClimbQuery = gql`
  query GetClimb($uuid: ID!) {
    climb(uuid: $uuid) {
      uuid
      grades {
        font
        french
        vscale
        yds
      }
      fa
      content {
        description
        location
        protection
      }
      media {
        mediaType
        mediaUrl
      }
      metadata {
        lat
        lng
        mp_id
      }
      name
      pathTokens
      safety
      type {
        trad
        tr
        sport
        snow
        mixed
        ice
        bouldering
        alpine
        aid
      }
      ancestors
      parent {
        areaName
        density
        totalClimbs
      }
    }
  }
`;
