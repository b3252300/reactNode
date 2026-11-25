const mongoose = require('mongoose');
const { getConfig } = require('../config');
const PropertyStatusAsset = require('../models/PropertyStatusAssets');
const { geocodeAddress } = require('../utils/geocode');

const RATE_LIMIT_DELAY_MS = 1100;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfillCoordinates() {
  const config = getConfig();
  await mongoose.connect(config.mongoUri);

  try {
    const assets = await PropertyStatusAsset.find({
      $or: [{ lat: null }, { lng: null }, { lat: { $exists: false } }, { lng: { $exists: false } }],
    }).lean();

    console.log(`找到 ${assets.length} 筆尚未定位的物件，開始依序補算經緯度...`);

    let updatedCount = 0;
    let failedCount = 0;

    for (const asset of assets) {
      const coords = await geocodeAddress(asset.city, asset.address);
      if (coords) {
        await PropertyStatusAsset.updateOne(
          { _id: asset._id },
          { $set: { lat: coords.lat, lng: coords.lng } },
        );
        updatedCount += 1;
        console.log(`[OK] ${asset.roomNumber} (${asset.city}${asset.address}) -> ${coords.lat}, ${coords.lng}`);
      } else {
        failedCount += 1;
        console.warn(`[SKIP] ${asset.roomNumber} (${asset.city}${asset.address}) 無法解析座標`);
      }

      await delay(RATE_LIMIT_DELAY_MS);
    }

    console.log(`完成：成功補算 ${updatedCount} 筆，未命中 ${failedCount} 筆。`);
  } finally {
    await mongoose.disconnect();
  }
}

backfillCoordinates().catch((error) => {
  console.error('批次補算座標失敗:', error.message);
  process.exitCode = 1;
});
