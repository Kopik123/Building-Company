const fs = require('fs');
const path = require('path');

const staticPages = [
  'index.html',
  'about.html',
  'services.html',
  'gallery.html',
  'quote.html',
  'contact.html',
  'privacy.html',
  'cookie-policy.html',
  'terms.html',
  'auth.html'
];

const premiumServices = [
  'premium-bathrooms-manchester.html',
  'premium-kitchens-manchester.html',
  'interior-renovations-manchester.html'
  // Add more from fs.readdirSync('premium-renovations-*.html')
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(p => `<url><loc>https://levellines.co.uk/${p}</loc><priority>0.8</priority></url>`).join('\n')}
${premiumServices.map(p => `<url><loc>https://levellines.co.uk/${p}</loc><priority>0.6</priority></url>`).join('\n')}
</urlset>`;

fs.writeFileSync(path.join(__dirname, '../sitemap.xml'), sitemap);
console.log('Generated sitemap.xml');

