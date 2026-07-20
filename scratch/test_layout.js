import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import fs from 'fs';

GlobalFonts.registerFromPath('./fonts/TuTienFont.ttf', 'TuTienFont');

async function testLayout() {
  const bgPath = 'public/image/view/profile/profile_PHAP_chiso.png';
  if (!fs.existsSync(bgPath)) {
    console.error('Template not found');
    return;
  }

  const background = await loadImage(bgPath);
  const canvas = createCanvas(background.width, background.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(background, 0, 0);

  // Setup text styles just like BoDieuKhienTuSi.js
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Căn giữa tuyệt đối bằng textBaseline = 'middle' và textAlign = 'center'
  // Bổ sung FONT_OFFSET = 14px để đẩy chữ xuống dưới, bù trừ cho lỗi thiết kế của file font TuTienFont.ttf
  const FONT_OFFSET = 14; 
  
  const drawCenteredText = (text, x, y, size) => {
    ctx.font = `${size}px "TuTienFont", "Arial"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), x, y + FONT_OFFSET);
  };

  const drawLeftText = (text, x, y, size) => {
    ctx.font = `${size}px "TuTienFont", "Arial"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), x, y + FONT_OFFSET);
  };

  // 1. Tên tu sĩ (Căn giữa ribbon ở y = 110)
  drawLeftText('Wii (Pháp Tu)', 430, 110, 32);

  // 2. Chân Nguyên & Khí Huyết (Căn giữa ô ở y = 280)
  drawCenteredText('15,000 / 15,000', 220, 280, 20);
  drawCenteredText('10,000 / 10,000', 410, 280, 20);

  // 3. Avatar Placeholder (drawing a semi-transparent red block to inspect bounds)
  ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
  ctx.fillRect(512, 177, 120, 120);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(512, 177, 120, 120);

  // Draw other text in white
  ctx.fillStyle = '#ffffff';

  // 4. Basic Attack (y_center: 430 và 490)
  drawCenteredText('250,000', 452.5, 430, 20);
  drawCenteredText('180,000', 452.5, 490, 20);

  // 5. Defense & Recovery (y_center: 668, 728, 788)
  drawCenteredText('5,000', 317.5, 668, 20);
  drawCenteredText('50,000', 587.5, 668, 20);
  drawCenteredText('4,500', 317.5, 728, 20);
  drawCenteredText('45,000', 587.5, 728, 20);
  drawCenteredText('25%', 317.5, 788, 20);

  // 6. Special Stats (y_center: 1004, 1068, 1132)
  drawCenteredText('120', 317.5, 1004, 20);
  drawCenteredText('15%', 587.5, 1004, 20);
  drawCenteredText('350%', 317.5, 1068, 20);
  drawCenteredText('18%', 587.5, 1068, 20);
  drawCenteredText('20,000', 317.5, 1132, 20);

  // 7. Guild Name & ID Code (y_center: 1280 và 1320)
  drawCenteredText('541474154130571264', 360, 1280, 20);
  drawCenteredText('S1 - Thiên Giới', 360, 1320, 20);

  // Draw transparent red rectangles over the active text boundaries to visually confirm placement
  ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
  ctx.fillRect(135, 260, 170, 40);
  ctx.fillRect(325, 260, 170, 40);

  ctx.fillRect(270, 405, 365, 50);
  ctx.fillRect(270, 465, 365, 50);

  ctx.fillRect(270, 648, 95, 40);
  ctx.fillRect(540, 648, 95, 40);
  ctx.fillRect(270, 708, 95, 40);
  ctx.fillRect(540, 708, 95, 40);
  ctx.fillRect(270, 768, 95, 40);

  ctx.fillRect(270, 984, 95, 40);
  ctx.fillRect(540, 984, 95, 40);
  ctx.fillRect(270, 1048, 95, 40);
  ctx.fillRect(540, 1048, 95, 40);
  ctx.fillRect(270, 1112, 95, 40);

  // Save the image
  const buffer = await canvas.encode('png');
  fs.writeFileSync('public/image/test_layout_out.png', buffer);
  console.log('Successfully saved test_layout_out.png');
}

testLayout();
