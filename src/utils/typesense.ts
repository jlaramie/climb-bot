import { Client } from 'typesense';
import type { DisciplineType } from './openbeta/climb-types';

export type DisciplineTypes = keyof DisciplineType | 'boulder';

export interface ClimbSearchResponse {
  areaNames: string[];
  climbName: string;
  climbUUID: string;
  cragLatLng: [number, number];
  disciplines: DisciplineTypes[];
  fa: string;
  grade: string;
  id: string;
  safety: string;
}

export interface AreaSearchResponse {
  areaLatLng: [number, number];
  areaUUID: string;
  density: number;
  id: string;
  isDestination: boolean;
  leaf: boolean;
  name: string;
  pathTokens: string[];
  totalClimbs: number;
}

export const client = new Client({
  apiKey: process.env.TYPESENSE_API_KEY!,
  connectionTimeoutSeconds: 2,
  additionalHeaders: {
    'x-typesense-api-key': process.env.TYPESENSE_API_KEY!
  },
  nodes: [
    {
      host: process.env.TYPESENSE_HOST!, // For Typesense Cloud use xxx.a1.typesense.net
      port: 443, // For Typesense Cloud use 443
      protocol: 'https' // For Typesense Cloud use https
    }
  ]
});
