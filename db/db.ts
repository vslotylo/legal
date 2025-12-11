import mongoose from 'mongoose';
import config from './config';
import { IFindLawProfile, lawyerSchema } from './schema/FindLaw';
import { IBulkTrafficEstimationItem, DataforseoLabsGoogleHistoricalBulkTrafficEstimationLiveItemSchema } from './schema/DataforseoLabsGoogleHistoricalBulkTrafficEstimationLiveItem';


export const FindLawProfileModel = mongoose.model<IFindLawProfile>('findlaw', lawyerSchema);
export const BulkTrafficEstimationItemModel = mongoose.model<IBulkTrafficEstimationItem>('bulk_traffic_estimation_item', DataforseoLabsGoogleHistoricalBulkTrafficEstimationLiveItemSchema);

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