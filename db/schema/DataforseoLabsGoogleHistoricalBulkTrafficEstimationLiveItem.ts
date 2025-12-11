import mongoose from "mongoose";
import { IDataforseoLabsGoogleHistoricalBulkTrafficEstimationLiveItem } from "dataforseo-client";

export interface IBulkTrafficEstimationItem extends IDataforseoLabsGoogleHistoricalBulkTrafficEstimationLiveItem { }

const HistoricalMetricsInfoSchema = new mongoose.Schema({
    year: Number,
    month: Number,
    etv: Number,
    count: Number
}, { _id: false, strict: false });

const HistoricalMetricsBundleInfoSchema = new mongoose.Schema({
    organic: [HistoricalMetricsInfoSchema],
    paid: [HistoricalMetricsInfoSchema],
    local_pack: [HistoricalMetricsInfoSchema],
    featured_snippet: [HistoricalMetricsInfoSchema]
}, { _id: false, strict: false });

export const DataforseoLabsGoogleHistoricalBulkTrafficEstimationLiveItemSchema = new mongoose.Schema<IDataforseoLabsGoogleHistoricalBulkTrafficEstimationLiveItem>({
    se_type: String,
    target: String,
    metrics: HistoricalMetricsBundleInfoSchema
}, { strict: false });
