const https = require('https');
https.get('https://api.telegram.org/bot8630174906:AAG07RgRI1YPqcmIvzbI2VK69CeT4BqswwE/getMe', (res) => {
  console.log('statusCode:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log('Response:', data); });
}).on('error', (e) => {
  console.error('Error:', e.message);
});
