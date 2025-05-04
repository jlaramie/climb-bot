import { upperFirst } from 'lodash';
import type { DisciplineType } from './openbeta/climb-types';
import type { DisciplineTypes } from './typesense';

export function getDisciplines(disciplines: DisciplineType): DisciplineTypes[] {
  return Object.keys(disciplines).filter(
    discipline => disciplines[discipline as keyof DisciplineType]
  ) as DisciplineTypes[];
}

export function getDisciplineIcon(type: DisciplineTypes) {
  switch (type) {
    case 'trad':
    case 'tr':
    case 'sport':
    case 'aid':
      return '🪢';
    case 'boulder':
    case 'bouldering':
      return '🪨';
    case 'alpine':
    case 'snow':
    case 'ice':
    case 'mixed':
      return '⛏️';
  }
}

export function getFormattedDiscipline(type: DisciplineTypes) {
  switch (type) {
    case 'boulder':
      return 'Bouldering';
    case 'trad':
    case 'sport':
    case 'aid':
    case 'bouldering':
    case 'alpine':
    case 'snow':
    case 'ice':
    case 'mixed':
      return upperFirst(type);
    case 'tr':
      return type.toUpperCase();
  }
}
