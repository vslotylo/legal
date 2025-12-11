import mongoose from "mongoose";

export interface ILawyer {
    name?: string;
    city?: string;
    state?: string;
    website?: string;
    hostname?: string;
}

export const lawyerSchema = new mongoose.Schema<ILawyer>({
    name: String,
    city: String,
    state: String,
    website: String,
    hostname: String,
});