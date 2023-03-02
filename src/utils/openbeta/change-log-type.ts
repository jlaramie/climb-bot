// https://github.com/OpenBeta/openbeta-graphql/blob/develop/src/db/ChangeLogType.ts

import type { OperationType as AreaOpType, AreaType } from './area-types';
import type { ClimbEditOperationType, ClimbType } from './climb-types';

export type DBOperation = 'insert' | 'update' | 'delete';

export interface ChangeLogType<T = SupportedCollectionTypes> {
  _id: string;
  editedBy: string;
  operation: OpType;
  changes: Array<BaseChangeRecordType<T>>;
}

// DIY since ResumeToke is defined as unknown in mongo TS
export interface ResumeToken {
  _data: string;
}

export interface UpdateDescription {
  updatedFields?: string[];
  removedFields?: string[];
  truncatedArrays?: unknown[];
}
export interface BaseChangeRecordType<
  FullDocumentType = SupportedCollectionTypes
> {
  _id: ResumeToken;
  dbOp: DBOperation;
  fullDocument: FullDocumentType;
  updateDescription: UpdateDescription;
  kind: string;
}

export type OpType = AreaOpType | ClimbEditOperationType;

export interface ChangeRecordMetadataType {
  /** The UUID of the user to whom this change of the document is attributed  */
  user: string;
  operation: OpType;
  /**
   * We identify history entries in the audit trail by assigning it an ObjectID.
   **/
  historyId: string;
  prevHistoryId?: string;
  seq: number;
}

export interface WithDiscriminator {
  kind: string;
}

export type AreaChangeLogType = ChangeLogType<AreaType>;
export type AreaChangeRecordType = BaseChangeRecordType<AreaType>;

export type ClimbChangeLogType = ChangeLogType<ClimbType>;

export type SupportedCollectionTypes =
  | (AreaType & WithDiscriminator)
  | (ClimbType & WithDiscriminator);

export interface GetHistoryInputFilterType {
  uuidList: string[];
  userUuid: string;
  fromDate: Date;
  toDate: Date;
}

export interface GetAreaHistoryInputFilterType {
  areaId: string;
}
