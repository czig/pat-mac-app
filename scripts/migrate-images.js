'use strict';

// One-time migration: uploads existing gallery images from src/assets/ to S3
// and creates DynamoDB records.
// Run with: node scripts/migrate-images.js
// Requires AWS profile 'caleb' and real AWS credentials.

const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { fromIni } = require('@aws-sdk/credential-providers');

const BUCKET = process.env.S3_BUCKET || 'patmacscopperworks.com';
const TABLE = process.env.DYNAMODB_TABLE || 'copper-images-prod';
const REGION = 'us-east-1';
const ASSETS_DIR = path.join(__dirname, '..', 'src', 'assets');

const credentials = fromIni({ profile: 'caleb' });
const s3 = new S3Client({ region: REGION, credentials });
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION, credentials }));

// Images in gallery order (from gallery.vue)
const images = [
  { filename: 'acorn.jpg', title: 'Acorn', alt: 'Copper acorn artwork' },
  { filename: 'buck.jpg', title: 'Buck', alt: 'Copper buck artwork' },
  { filename: 'bunnies.jpg', title: 'Bunnies', alt: 'Copper bunnies artwork' },
  { filename: 'christmas_ornaments.jpg', title: 'Christmas Ornaments', alt: 'Copper Christmas ornaments' },
  { filename: 'circles_in_garden.jpg', title: 'Landscape Art', alt: 'Copper landscape art circles in garden' },
  { filename: 'cutouts.jpg', title: 'Christmas Tree and Dragonfly cutouts', alt: 'Copper Christmas tree and dragonfly cutouts' },
  { filename: 'dogwood_spray.jpg', title: 'Dogwood spray', alt: 'Copper dogwood spray artwork' },
  { filename: 'dragon_flies.jpg', title: 'Dragonflies', alt: 'Copper dragonfly artwork' },
  { filename: 'epilepsy_symbol.jpg', title: 'Epilepsy Foundation Symbol', alt: 'Copper Epilepsy Foundation symbol' },
  { filename: 'fish.jpg', title: 'Trout', alt: 'Copper trout artwork' },
  { filename: 'fish_brazed_2.jpg', title: 'Trout (brazed)', alt: 'Copper brazed trout artwork' },
  { filename: 'fish_brazing.jpg', title: 'Trout (brazed)', alt: 'Copper trout being brazed' },
  { filename: 'fish_working.jpg', title: 'Working on the Trout', alt: 'Working on the copper trout' },
  { filename: 'landscape_art_2_garage.jpg', title: 'Garden Art in Progress', alt: 'Copper garden art in progress in garage' },
  { filename: 'landscape_art_garden.jpg', title: 'Garden Art', alt: 'Copper landscape art in garden' },
  { filename: 'landscape_art_working.jpg', title: 'Garden Art in Progress', alt: 'Working on copper landscape art' },
  { filename: 'landscaping_design.jpg', title: 'Garden Art', alt: 'Copper garden landscaping art design' },
  { filename: 'maple_leaf_big.jpg', title: 'Maple Leaf', alt: 'Large copper maple leaf artwork' },
  { filename: 'maple_leafs_diag.jpg', title: 'Maple Leaves', alt: 'Copper maple leaves diagonal' },
  { filename: 'maple_leafs.jpg', title: 'Maple Leaves', alt: 'Copper maple leaves artwork' },
  { filename: 'maple_spray.jpg', title: 'Maple Leaf Spray', alt: 'Copper maple leaf spray artwork' },
  { filename: 'maple_spray_mounted.jpg', title: 'Maple Leaf Spray Mounted', alt: 'Copper maple leaf spray mounted on wall' },
  { filename: 'pat_mac_sign.jpg', title: 'Company Sign!', alt: "Pat Mac's Copper Works company sign" },
  { filename: 'patrick.jpg', title: 'Me with the Landscape Art base', alt: 'Pat Mac with landscape art base' },
  { filename: 'torch.jpg', title: 'Working on the Landscape Art', alt: 'Using torch on copper landscape art' },
  { filename: 'working_fish.jpg', title: 'Working on the trout', alt: 'Working on the copper trout' },
  { filename: 'working_maple.jpg', title: 'Working on the maple leaf spray', alt: 'Working on copper maple leaf spray' },
  { filename: 'garden_art.jpg', title: 'Landscape Art outside', alt: 'Copper landscape art displayed outside' },
  { filename: 'butterfly2.jpg', title: 'Butterfly', alt: 'Copper butterfly artwork' },
  { filename: 'sunflower.jpeg', title: 'Sunflower', alt: 'Copper sunflower artwork' },
  { filename: 'seven_flower.jpg', title: 'Seven Flower', alt: 'Copper seven flower artwork' },
  { filename: 'dragonfly.jpg', title: 'Dragonfly', alt: 'Copper dragonfly artwork' },
  { filename: 'dragonfly_grass.jpg', title: 'Dragonfly in the Lawn', alt: 'Copper dragonfly displayed in lawn' },
  { filename: 'fish_curved.jpg', title: 'Fish', alt: 'Copper curved fish artwork' },
  { filename: 'fish_patrick.jpg', title: 'Me holding the fish', alt: 'Pat Mac holding the copper fish' },
  { filename: 'two_fish.jpg', title: 'Two fish', alt: 'Two copper fish artworks' },
  { filename: 'ornaments_star_maple.jpg', title: 'Holiday ornaments!', alt: 'Copper holiday ornaments with star and maple' },
  { filename: 'star_brazed.jpg', title: 'Brazed holiday star', alt: 'Copper brazed holiday star' },
  { filename: 'star_working.jpg', title: 'Working on the brazed holiday star', alt: 'Working on copper brazed holiday star' },
  { filename: 'dogwood_spray2.jpg', title: 'Dogwood spray', alt: 'Second copper dogwood spray artwork' },
  { filename: 'landscape_art_circles.jpg', title: 'Landscape/garden art', alt: 'Copper landscape art with circles' },
  { filename: 'sunflower_butterfly.jpg', title: 'Sunflowers and a butterfly', alt: 'Copper sunflowers and butterfly artwork' },
  { filename: 'trout1.jpg', title: 'Me with a completed trout', alt: 'Pat Mac with a completed copper trout' },
  { filename: 'trout2.jpg', title: 'A completed trout', alt: 'Completed copper trout artwork' },
  { filename: 'trout3.jpg', title: 'A completed trout', alt: 'Completed copper trout artwork' },
  { filename: 'turtle.jpg', title: 'Turtles!', alt: 'Copper turtle artwork' },
  { filename: 'turtle2.jpg', title: 'Turtles!', alt: 'Second copper turtle artwork' },
  { filename: 'sun.jpg', title: 'Sun (16in point-to-point)', alt: 'Copper sun artwork 16 inch point to point' },
  { filename: 'butterfly.jpg', title: 'Textured Butterfly', alt: 'Textured copper butterfly artwork' },
  { filename: 'moose.jpg', title: 'Moose', alt: 'Copper moose artwork' },
];

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return types[ext] || 'image/jpeg';
}

async function migrate() {
  console.log(`Migrating ${images.length} images to S3 bucket: ${BUCKET}`);
  console.log(`DynamoDB table: ${TABLE}\n`);

  for (let i = 0; i < images.length; i++) {
    const { filename, title, alt } = images[i];
    const localPath = path.join(ASSETS_DIR, filename);

    if (!fs.existsSync(localPath)) {
      console.warn(`  SKIP (not found): ${filename}`);
      continue;
    }

    const imageId = uuidv4();
    const s3Key = `images/${imageId}/${filename}`;
    const contentType = getContentType(filename);

    try {
      // Upload to S3
      const fileContent = fs.readFileSync(localPath);
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType
      }));

      // Write DynamoDB record
      await dynamo.send(new PutCommand({
        TableName: TABLE,
        Item: {
          imageId,
          title,
          alt,
          s3Key,
          order: i,
          uploadedAt: new Date().toISOString(),
          status: 'active'
        }
      }));

      console.log(`  [${i + 1}/${images.length}] OK: ${filename} → ${s3Key}`);
    } catch (err) {
      console.error(`  [${i + 1}/${images.length}] ERROR: ${filename}`, err.message);
    }
  }

  console.log('\nMigration complete.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
