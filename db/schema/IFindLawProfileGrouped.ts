import mongoose from "mongoose";

export interface IFindLawProfileGrouped {
    count: Number,
    hostname: String,
}

export const findlawProfileGroupedSchema = new mongoose.Schema<IFindLawProfileGrouped>({
    count: Number,
    hostname: String,
});