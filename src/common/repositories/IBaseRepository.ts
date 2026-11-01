import { Document } from 'mongoose';

/**
 * Generic base repository interface.
 * All domain repositories extend this to inherit common CRUD operations.
 *
 * @template TDoc     — the Mongoose document type (e.g. UserDocument)
 * @template TCreate  — the data shape used to create a new document
 */
export interface IBaseRepository<TDoc extends Document, TCreate> {
  /** Persist a new document and return it */
  create(data: TCreate): Promise<TDoc>;

  /** Find a document by its MongoDB ObjectId */
  findById(id: string): Promise<TDoc | null>;

  /** Find a single document matching an arbitrary filter */
  findOne(filter: Record<string, unknown>): Promise<TDoc | null>;
}
