import mongoose from 'mongoose';

const mongoURI =
  'mongodb+srv://cheangseyha:ffPZTSN4j2a20URF@clusterbin.rxygxbz.mongodb.net/SmartBin?appName=ClusterBin';

const BinSchema = new mongoose.Schema({
  binCode: String,
  area: String,
  location: { lat: Number, lng: Number },
  fillLevel: Number,
  status: String,
}, { timestamps: true });

const BinModel = mongoose.model('Bin', BinSchema);

async function check() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    const bins = await BinModel.find({}).lean().exec();
    console.log('\n=== ALL BINS IN DATABASE ===');
    bins.forEach((bin, i) => {
      console.log(`\n[${i}] ${bin.binCode}:`);
      console.log(`  Area: ${bin.area}`);
      console.log(`  Keys: ${Object.keys(bin).join(', ')}`);
    });

    console.log('\n=== SUMMARY ===');
    const withArea = bins.filter(b => b.area).length;
    console.log(`Bins with area: ${withArea}/${bins.length}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Check failed:', error);
    process.exit(1);
  }
}

check();
