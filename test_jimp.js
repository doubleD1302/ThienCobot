import { Jimp } from 'jimp';
import fs from 'fs';

async function test() {
  try {
    console.log('Testing Jimp...');
    const bgPath = 'public/image/skin/background/backg01.png';
    const skinPath = 'public/image/skin/skin/nam/nam_1.png';
    
    if (!fs.existsSync(bgPath)) {
      console.log('Background not found at', bgPath);
      return;
    }
    if (!fs.existsSync(skinPath)) {
      console.log('Skin not found at', skinPath);
      return;
    }

    const bg = await Jimp.read(bgPath);
    console.log('Read bg successfully, size:', bg.bitmap.width, 'x', bg.bitmap.height);
    bg.resize({ w: 384, h: 576 });

    const skin = await Jimp.read(skinPath);
    console.log('Read skin successfully, size:', skin.bitmap.width, 'x', skin.bitmap.height);
    skin.resize({ w: 230, h: 304 });

    bg.composite(skin, 77, 203);
    await bg.write('public/image/skin_test_out.png');
    console.log('Composite test successful! Saved to public/image/skin_test_out.png');
  } catch (e) {
    console.error('Jimp test failed:', e);
  }
}

test();
