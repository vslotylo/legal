import mongoose from "mongoose";

export interface ILawyerGrouped {
    count: Number,
    hostname: String,
}

export const lawyerGroupedSchema = new mongoose.Schema<ILawyerGrouped>({
    count: Number,
    hostname: String,
});