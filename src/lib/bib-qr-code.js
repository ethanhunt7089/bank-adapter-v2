const QRCode = require('qrcode');

const payload = "00020101021229370016A000000677010111021304055680032425802TH5303764540520.3163042E89";

// สร้าง QR Code เป็น Base64 PNG
QRCode.toDataURL(payload, { type: 'image/png' }, function (err, url) {
  if (err) {
    console.error(err);
    return;
  }

  // url จะมีค่าเป็น Base64 PNG เช่น "data:image/png;base64,iVBORw0K..."
  console.log(url);
});