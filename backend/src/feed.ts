import type { Env, Post } from './types';
import { escapeXml } from './lib/xml';

// GET /feed.xml - RSS フィード
export async function handleRssFeed(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT 50'
  ).all<Post>();

  const items = results.map(post => {
    // タイトルは最初の50文字（改行まで or 50文字）
    const firstLine = post.content.split('\n')[0];
    const title = firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine;

    // RFC 822 形式の日付
    const pubDate = new Date(post.created_at).toUTCString();

    // 画像があれば追加
    const imageHtml = post.image_url
      ? `<br/><img src="${escapeXml(post.image_url)}" alt=""/>`
      : '';

    return `    <item>
      <title>${escapeXml(title)}</title>
      <link>https://mb.krnk.app/#post-${post.id}</link>
      <guid isPermaLink="false">https://mb.krnk.app/posts/${post.id}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${post.content.replace(/\n/g, '<br/>')}${imageHtml}]]></description>
    </item>`;
  }).join('\n');

  const lastBuildDate = results.length > 0
    ? new Date(results[0].created_at).toUTCString()
    : new Date().toUTCString();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>microblog</title>
    <link>https://mb.krnk.app</link>
    <description>personal microblog</description>
    <language>ja</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="https://mb-api.krnk.app/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
