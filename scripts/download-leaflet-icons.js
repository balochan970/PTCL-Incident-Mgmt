const https = require('https');
const fs = require('fs');
const path = require('path');

const icons = [
  {
    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x.png',
    filename: 'marker-icon-2x.png'
  },
  {
    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon.png',
    filename: 'marker-icon.png'
  },
  {
    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
    filename: 'marker-shadow.png'
  }
];

const downloadFile = (url, filename) => {
  return new Promise((resolve, reject) => {
    const filepath = path.join(__dirname, '../public/images', filename);
    const file = fs.createWriteStream(filepath);

    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
};

async function downloadIcons() {
  try {
    await Promise.all(icons.map(icon => downloadFile(icon.url, icon.filename)));
    console.log('All icons downloaded successfully!');
  } catch (error) {
    console.error('Error downloading icons:', error);
    process.exit(1);
  }
}

downloadIcons(); 