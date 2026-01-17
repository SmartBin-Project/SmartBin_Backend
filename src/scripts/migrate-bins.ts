import mongoose from 'mongoose';

const mongoURI =
  'mongodb+srv://cheangseyha:ffPZTSN4j2a20URF@clusterbin.rxygxbz.mongodb.net/SmartBin?appName=ClusterBin';

const BinSchema = new mongoose.Schema(
  {
    binCode: String,
    area: String,
    location: { lat: Number, lng: Number },
    fillLevel: Number,
    status: String,
    lastTaskId: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true },
);

const BinModel = mongoose.model('Bin', BinSchema);

async function migrate() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    const areaMap: { [key: string]: string } = {
      SB1: 'Institute of Technology of Cambodia',
      SMC1: 'Stueng meanchey',
      R1: 'RUPP',
      E1: 'Economica',
    };

    const bins = await BinModel.find({});
    console.log(`Found ${bins.length} bins`);

    for (const bin of bins) {
      if (!bin.area) {
        const code = bin.binCode as string;
        bin.area = areaMap[code] || 'Unknown Area';
        await bin.save();
        console.log(`Updated bin ${bin.binCode} with area: ${bin.area}`);
      }
    }

    console.log('Migration completed!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
