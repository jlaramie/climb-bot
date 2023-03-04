import { gql, GraphQLClient } from 'graphql-request';
import type { IAreaContent, IAreaProps } from './openbeta/area-types';
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

export type GetAreaQueryVariables = {
  uuid: string;
};

export type GetAreaQueryResponse = {
  area: Pick<IAreaProps, 'area_name' | 'totalClimbs' | 'pathTokens'> & {
    uuid: string;
    content: IAreaContent;
    media: Array<Pick<MediaType, 'mediaType' | 'mediaUrl'>>;
    metadata: {
      lat: number;
      lng: number;
      mp_id?: string;
    };
    climbs: Array<
      Pick<GetClimbQueryResponse['climb'], 'uuid' | 'name' | 'grades'> & {
        metadata: {
          mp_id?: string;
        };
      }
    >;
    children: Array<
      Pick<
        GetAreaQueryResponse['area'],
        'uuid' | 'area_name' | 'totalClimbs' | 'content'
      >
    >;
  };
};

export const GetAreaQuery = gql`
  query GetArea($uuid: ID!) {
    area(uuid: $uuid) {
      uuid
      area_name
      content {
        description
      }
      media {
        mediaType
        mediaUrl
      }
      totalClimbs
      pathTokens
      metadata {
        lat
        lng
        mp_id
      }
      children {
        uuid
        area_name
        content {
          description
        }
      }
      climbs {
        uuid
        name
        grades {
          font
          french
          vscale
          yds
        }
        metadata {
          mp_id
        }
      }
    }
  }
`;
