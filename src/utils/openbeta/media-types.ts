// https://github.com/OpenBeta/openbeta-graphql/blob/develop/src/db/MediaTypes.ts

import type { AreaType } from './area-types';
import type { ClimbType } from './climb-types';

// Type for 'Media' collection schema
export interface MediaType {
  _id?: string;
  mediaUuid: string;
  mediaUrl: string;
  mediaType: number; // 0: image, 1: video
  destinationId: string; // reference to a climb or area
  destType: number; // 0: climb, 1: area
  onModel: RefModelType;
}

export enum RefModelType {
  climbs = 'climbs',
  areas = 'areas'
}

export interface MediaListByAuthorType {
  _id: string;
  tagList: MediaType[];
}

export interface MediaInputType {
  mediaUuid: string;
  mediaUrl: string;
  mediaType: number;
  destinationId: string;
  destType: number;
}

interface BaseTagType {
  _id: string;
  mediaUuid: string;
  mediaUrl: string;
  mediaType: number;
  destType: number;
  onModel: RefModelType;
}

export interface AreaTagType extends BaseTagType {
  area: AreaType;
}

export interface ClimbTagType extends BaseTagType {
  climb: ClimbType;
}

export type TagEntryResultType = AreaTagType | ClimbTagType;

export interface DeleteTagResult {
  id: string;
  mediaUuid: string;
  destType: number;
  destinationId: string;
}

export interface TagsLeaderboardType {
  userUuid: string;
  total: number;
}
