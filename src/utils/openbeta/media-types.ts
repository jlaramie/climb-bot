// https://github.com/OpenBeta/openbeta-graphql/blob/develop/src/db/MediaTypes.ts
import type { Point } from '@turf/helpers';
export type ImageFormatType = 'jpeg' | 'png' | 'webp' | 'avif';

export interface MediaObject {
  _id: string;
  userUuid: string;
  mediaUrl: string;
  width: number;
  height: number;
  format: ImageFormatType;
  createdAt: Date;
  size: number;
  entityTags: EntityTag[];
}

export interface EntityTag {
  _id: string;
  targetId: string;
  type: number;
  ancestors: string;
  climbName?: string;
  areaName: string;
  lnglat: Point;
}
