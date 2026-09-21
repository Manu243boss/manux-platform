import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = (process.env.VITE_SUPABASE_URL || 'https://juubntufqlogakwfvqwh.supabase.co').trim();
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyb2xlIjoiYW5vbiJ9').trim();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('[ManuX Sitemap] Generating sitemap...');
  const baseUrl = 'https://manux.xttools.site';
  const lastmod = new Date().toISOString().split('T')[0];

  // 1. Core static pages
  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/discover', priority: '0.9', changefreq: 'daily' },
    { loc: '/products', priority: '0.9', changefreq: 'daily' },
    { loc: '/videos', priority: '0.9', changefreq: 'daily' },
    { loc: '/creators', priority: '0.8', changefreq: 'weekly' },
    { loc: '/categories', priority: '0.8', changefreq: 'weekly' },
    { loc: '/pricing', priority: '0.8', changefreq: 'monthly' },
    { loc: '/about', priority: '0.5', changefreq: 'monthly' },
    { loc: '/help', priority: '0.5', changefreq: 'monthly' },
    { loc: '/guide', priority: '0.5', changefreq: 'monthly' },
    { loc: '/terms', priority: '0.3', changefreq: 'monthly' },
    { loc: '/privacy', priority: '0.3', changefreq: 'monthly' },
    { loc: '/auth/login', priority: '0.4', changefreq: 'monthly' },
    { loc: '/auth/register', priority: '0.4', changefreq: 'monthly' },
    { loc: '/auth/forgot-password', priority: '0.4', changefreq: 'monthly' },
    { loc: '/auth/reset-password', priority: '0.4', changefreq: 'monthly' },
    { loc: '/search', priority: '0.7', changefreq: 'daily' },
  ];

  const urls = [...staticPages];

  // 2. Fetch Categories from database
  try {
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('slug');
    if (catError) {
      console.warn('Warning: Could not fetch categories from Supabase:', catError.message);
    } else if (categories && categories.length > 0) {
      console.log(`Fetched ${categories.length} categories from Supabase.`);
      categories.forEach(cat => {
        urls.push({
          loc: `/category/${cat.slug}`,
          priority: '0.7',
          changefreq: 'weekly'
        });
      });
    } else {
      // Add fallback default seeded categories if DB returned empty
      const defaultCategories = [
        'formations-cours',
        'logiciels-outils-saas',
        'ebooks-guides',
        'templates-graphisme',
        'produits-physiques-mode',
        'coaching-consultance',
        'artisanat-creations'
      ];
      console.log('Using default seeded categories as fallback.');
      defaultCategories.forEach(slug => {
        urls.push({
          loc: `/category/${slug}`,
          priority: '0.7',
          changefreq: 'weekly'
        });
      });
    }
  } catch (err) {
    console.error('Error fetching categories:', err);
  }

  // 3. Fetch Products from database
  try {
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('slug')
      .eq('status', 'published');
    if (prodError) {
      console.warn('Warning: Could not fetch products from Supabase:', prodError.message);
    } else if (products && products.length > 0) {
      console.log(`Fetched ${products.length} published products from Supabase.`);
      products.forEach(prod => {
        urls.push({
          loc: `/products/${prod.slug}`,
          priority: '0.8',
          changefreq: 'daily'
        });
      });
    }
  } catch (err) {
    console.error('Error fetching products:', err);
  }

  // 4. Fetch Videos from database
  try {
    const { data: videos, error: vidError } = await supabase
      .from('videos')
      .select('slug')
      .eq('status', 'published');
    if (vidError) {
      console.warn('Warning: Could not fetch videos from Supabase:', vidError.message);
    } else if (videos && videos.length > 0) {
      console.log(`Fetched ${videos.length} published videos from Supabase.`);
      videos.forEach(vid => {
        urls.push({
          loc: `/videos/${vid.slug}`,
          priority: '0.8',
          changefreq: 'daily'
        });
      });
    }
  } catch (err) {
    console.error('Error fetching videos:', err);
  }

  // 5. Fetch Creators from database
  try {
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('username')
      .eq('status', 'published');
    if (profError) {
      console.warn('Warning: Could not fetch profiles from Supabase:', profError.message);
    } else if (profiles && profiles.length > 0) {
      console.log(`Fetched ${profiles.length} published creator profiles from Supabase.`);
      profiles.forEach(prof => {
        if (prof.username) {
          urls.push({
            loc: `/creators/${prof.username}`,
            priority: '0.8',
            changefreq: 'weekly'
          });
          urls.push({
            loc: `/creators/${prof.username}/store`,
            priority: '0.7',
            changefreq: 'weekly'
          });
        }
      });
    }
  } catch (err) {
    console.error('Error fetching profiles:', err);
  }

  // Generate sitemap XML
  let sitemapContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemapContent += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  urls.forEach(url => {
    sitemapContent += '  <url>\n';
    sitemapContent += `    <loc>${baseUrl}${url.loc}</loc>\n`;
    sitemapContent += `    <lastmod>${lastmod}</lastmod>\n`;
    sitemapContent += `    <changefreq>${url.changefreq}</changefreq>\n`;
    sitemapContent += `    <priority>${url.priority}</priority>\n`;
    sitemapContent += '  </url>\n';
  });

  sitemapContent += '</urlset>\n';

  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapContent);
  console.log(`Successfully generated dynamic sitemap at ${sitemapPath} with ${urls.length} URLs!`);
}

run().catch(err => {
  console.error('Error generating sitemap:', err);
  process.exit(1);
});
