import mongoose from 'mongoose';
import config from './config';
import { ILawyer, lawyerSchema } from './schema/FindLaw';
import { IBulkTrafficEstimationItem, DataforseoLabsGoogleHistoricalBulkTrafficEstimationLiveItemSchema } from './schema/DataforseoLabsGoogleHistoricalBulkTrafficEstimationLiveItem';


export const FindLaw = mongoose.model<ILawyer>('findlaw', lawyerSchema);
export const BulkTrafficEstimationItem = mongoose.model<IBulkTrafficEstimationItem>('bulk_traffic_estimation_item', DataforseoLabsGoogleHistoricalBulkTrafficEstimationLiveItemSchema);

async function connectDB() {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
}

connectDB();