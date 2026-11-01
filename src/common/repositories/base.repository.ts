import { Model, Document } from 'mongoose';
import { IBaseRepository } from './IBaseRepository.js';

/**
 * Abstract generic repository that implements the three shared CRUD operations.
 * Domain repositories extend this class and call super(model) in their constructor.
 *
 * @template TDoc    — the Mongoose document type (e.g. UserDocument)
 * @template TCreate — the data shape used to create a new document
 */
export abstract class BaseRepository<TDoc extends Document, TCreate>
  implements IBaseRepository<TDoc, TCreate>
{
  protected readonly _model: Model<TDoc>;

  constructor(model: Model<TDoc>) {
    this._model = model;
  }

  async create(data: TCreate): Promise<TDoc> {
    const doc = new this._model(data);
    return doc.save() as Promise<TDoc>;
  }

  async findById(id: string): Promise<TDoc | null> {
    return this._model.findById(id).exec();
  }

  async findOne(filter: Record<string, unknown>): Promise<TDoc | null> {
    return this._model.findOne(filter).exec();
  }
}
