import mongoose from "mongoose";

export interface IFindLawProfile {
    name?: string;
    city?: string;
    state?: string;
    website?: string;
    hostname?: string;
}

export const lawyerSchema = new mongoose.Schema<IFindLawProfile>({
    name: String,
    city: String,
    state: String,
    website: String,
    hostname: String,
});