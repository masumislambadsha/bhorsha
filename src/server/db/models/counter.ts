import "server-only";

import { Schema, model, models, type Model } from "mongoose";

export interface ICounter {
  _id: string;
  seq: number;
}

const schema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export const Counter: Model<ICounter> =
  (models.Counter as Model<ICounter>) ?? model<ICounter>("Counter", schema);
