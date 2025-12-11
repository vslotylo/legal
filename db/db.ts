import mongoose from 'mongoose';
import config from './config';
import { IFindLawProfile, findlawProfileSchema } from './schema/FindLawProfile';
import { IBulkTrafficEstimationItem, DataforseoLabsGoogleHistoricalBulkTrafficEstimationLiveItemSchema } from './schema/DataforseoLabsGoogleHistoricalBulkTrafficEstimationLiveItem';
import { IFindLawProfileGrouped, findlawProfileGroupedSchema } from './schema/IFindLawProfileGrouped';


export const FindLawProfileModel = mongoose.model<IFindLawProfile>('findlaw', findlawProfileSchema);
export const BulkTrafficEstimationItemModel = mongoose.model<IBulkTrafficEstimationItem>('bulk_traffic_estimation_item', DataforseoLabsGoogleHistoricalBulkTrafficEstimationLiveItemSchema);
export const FindLawProfileGroupedModel = mongoose.model<IFindLawProfileGrouped>('findlaw_grouped', findlawProfileGroupedSchema);

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