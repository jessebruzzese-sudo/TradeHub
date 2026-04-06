import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/account', '/messages'],
    },
    sitemap: 'https://www.tradehub.com.au/sitemap.xml',
    host: 'https://www.tradehub.com.au',
  }
}
