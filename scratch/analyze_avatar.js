import { loadImage } from '@napi-rs/canvas';
import fs from 'fs';

async function analyze() {
  const bgPath = 'public/image/view/profile/profile_PHAP_chiso.png';
  const img = await loadImage(bgPath);
  
  // Create a canvas to get image data
  import('@napi-rs/canvas').then(async ({ createCanvas }) => {
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    // Get image data in the bounding box [x: 480-680, y: 120-350]
    const xStart = 480;
    const xEnd = 680;
    const yStart = 120;
    const yEnd = 350;
    
    const imgData = ctx.getImageData(xStart, yStart, xEnd - xStart, yEnd - yStart);
    const data = imgData.data;
    
    // We want to find the solid black box.
    // Let's print out the average brightness (R+G+B)/3 for each pixel in a grid,
    // or locate the bounds where R, G, B are all very low (e.g. < 20).
    let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
    
    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        const localX = x - xStart;
        const localY = y - yStart;
        const index = (localY * (xEnd - xStart) + localX) * 4;
        
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const brightness = (r + g + b) / 3;
        
        // Inside the avatar box, it's very dark (e.g., color is almost solid black)
        // Let's check for brightness < 15
        if (brightness < 12) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    console.log(`Dark area bounds (brightness < 12):`);
    console.log(`X: ${minX} to ${maxX} (width: ${maxX - minX})`);
    console.log(`Y: ${minY} to ${maxY} (height: ${maxY - minY})`);
  });
}

analyze();
