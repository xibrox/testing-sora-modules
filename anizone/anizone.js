function searchResults(html) {
    const results = [];
    const animeListRegex = /<div\s+class="relative overflow-hidden[^>]*>.*?<img\s+src="([^"]+)"[^>]*alt="([^"]+)".*?<a[^>]*href="([^"]+)"[^>]*title="([^"]+)"[^>]*>/gs;
    
    const items = html.matchAll(animeListRegex);
  
    for (const item of items) {
        results.push({
            title: item[4].trim(),
            image: item[1].trim(),
            href: item[3].trim()
        });
    }
    return results;
}
  
  function extractDetails(html) {
    const details = [];

    const descriptionMatch = html.match(/<div\s+class="entry-content"[^>]*itemprop="description"[^>]*>([\s\S]*?)<\/div>/);
    let description = descriptionMatch ? descriptionMatch[1].trim() : '';
    
    // Remove inner HTML tags from the description
    description = description.replace(/<[^>]+>/g, '').trim();
    
    let aliases = 'N/A';
    
    const airdateMatch = html.match(/<time[^>]*>([^<]+)<\/time>/);
    let airdate = airdateMatch ? airdateMatch[1].trim() : '';
    
    if (description || airdate) {
        details.push({
            description: description,
            aliases: aliases,
            airdate: airdate
        });
    }
    
    return details;
}
  
function extractEpisodes(html) {
    const episodes = [];
    
    const episodeRegex = /<a\s+href="([^"]+)"[^>]*>\s*<div\s+class="epl-num">([\d.]+)<\/div>/gs;
    let match;
    
    while ((match = episodeRegex.exec(html)) !== null) {
      const href = match[1];
      const number = match[2];
      
      episodes.push({
        href: href,
        number: number
      });
    }

    episodes.reverse();
    return episodes;
}
  
  
function extractStreamUrl(html) {
    let iframeRegex = /<iframe[^>]+data-lazy-src=['"]([^'"]+)['"][^>]*>/i;
    let match = html.match(iframeRegex);
  
    if (!match) {
        iframeRegex = /<iframe[^>]+src=['"]([^'"]+)['"][^>]*>/i;
        match = html.match(iframeRegex);
    }
    
    if (match) {
        const iframeUrl = match[1];

        const m3u8Regex = /m3u8=([^&"']+)/i;
        const m3u8Match = iframeUrl.match(m3u8Regex);
        if (m3u8Match) {
            return m3u8Match[1].replace(/&amp;/g, '&');
        }
    }

    return null;
}
  