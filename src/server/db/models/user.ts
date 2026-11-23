import mongoose from "mongoose";
import "server-only";

import { Schema, model, models, type Model } from "mongoose";

/** Read-only view of Better Auth's `user` collection for searches and stats. */
export interface IAuthUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: Date;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IAuthUser>(
  {
    _id: { type: String },
    name: { type: String },
    email: { type: String },
    role: { type: String },
    banned: { type: Boolean },
    banReason: { type: String },
    banExpires: { type: Date },
    phone: { type: String },
  },
  { strict: false, timestamps: true, collection: "user" },
);

function readOnly(): never {
  throw new Error("Use the Better Auth API to change users.");
}

for (const operation of [
  "save",
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
] as const) {
  schema.pre(operation, function () {
    readOnly();
  });
}

export const AuthUser: Model<IAuthUser> =
  (models.AuthUser as Model<IAuthUser>) ?? model<IAuthUser>("AuthUser", schema, "user");

/** Better Auth stores `user._id` as an ObjectId, but the model types it as a string; match either form. */
export function authUserIdFilter(id: string): Record<string, unknown> {
  const ids: unknown[] = [id];
  if (/^[0-9a-fA-F]{24}$/.test(id)) ids.push(new mongoose.Types.ObjectId(id));
  return { _id: { $in: ids } };
}

/** Find a Better Auth user by id, bypassing Mongoose casting (the stored _id is an ObjectId). */
export async function findAuthUserById(id: string): Promise<IAuthUser | null> {
  return (await AuthUser.collection.findOne(authUserIdFilter(id))) as unknown as IAuthUser | null;
}
