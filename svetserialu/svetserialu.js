function searchResults(html) {
    const results = [];
    
    const anchorRegex = /<a\s+[^>]*class=["']transition-200all\s+morating["'][^>]*>([\s\S]*?)<\/a>/g;
    let anchorMatch;
    
    while ((anchorMatch = anchorRegex.exec(html)) !== null) {
        const anchorHTML = anchorMatch[0];
        
        const hrefMatch = anchorHTML.match(/href=["']([^"']+)["']/);
        const href = hrefMatch ? hrefMatch[1] : '';
        const fullHref = href ? `https://svetserialu.io${href}` : '';
        
        const titleMatch = anchorHTML.match(/<span\s+class=["']name-search\s+nunito["']>([\s\S]*?)<\/span>/);
        const title = titleMatch ? titleMatch[1].trim() : '';
        
        const imageMatch = anchorHTML.match(/<span\s+class=["']image-search["'][^>]*>[\s\S]*?<img\s+[^>]*src=["']([^"']+)["']/);
        const imageUrl = imageMatch ? imageMatch[1] : '';
        const fullImageUrl = imageUrl ? `https://svetserialu.io${imageUrl}` : '';

        const yearMatch = anchorHTML.match(/<span\s+class=["']year-search["']>([\s\S]*?)<\/span>/);
        const year = yearMatch ? yearMatch[1].trim() : '';

        const ratingMatch = anchorHTML.match(/<div\s+class=["']progress-circle\s+search-rating["'][^>]*data-progress=["']([^"']+)["']/);
        const rating = ratingMatch ? ratingMatch[1].trim() : '';
        
        results.push({
            title,
            href: fullHref,
            image: fullImageUrl,
            year,
            rating
        });
    }
    
    return results;
}

function extractDetails(html) {
    const details = [];

    const descriptionMatch = html.match(/<div class="show-text nunito">([\s\S]*?)<\/div>/);
    let description = descriptionMatch ? descriptionMatch[1].trim() : '';

    const aliasesMatch = html.match(/<span class="alt-name nunito">([\s\S]*?)<\/span>/);
    let aliases = aliasesMatch ? aliasesMatch[1].trim() : 'N/A';

    const airdateMatch = html.match(/<span class="year nunito">([^<]+)<\/span>/);
    let airdate = airdateMatch ? airdateMatch[1].trim() : '';
    
    if (description && airdate) {
        details.push({
            description: description,
            aliases: aliases,
            airdate: airdate
        });
    }
    
    return details;
}
  
async function extractEpisodes(html) {
    const baseUrl = "https://svetserialu.io";
    const results = [];

    console.log(html);
    
    // Step 1: Extract all accordion IDs from the main HTML
    const accordionIds = [];
    const accordionRegex = /<div class="accordion accordionId(\d+)">/g;
    let idMatch;
    while ((idMatch = accordionRegex.exec(html)) !== null) {
      accordionIds.push(idMatch[1]);
    }
    
    // Step 2: For each accordion ID, fetch the corresponding HTML and extract episodes
    for (const id of accordionIds) {
      const url = `${baseUrl}/serial/naruto?loadAccordionId=${id}`;
      try {
        const response = await fetch(url);
        const accordionHtml = await response.text();
        
        // Use regex to extract each episode from the accordion HTML.
        // This regex looks for an anchor with class "accordionLink",
        // extracts the href, the episode number (inside <span class="number_eps">)
        // and the episode title (inside <span class="ep_name">).
        const episodes = [];
        const episodeRegex = /<a\s+href="([^"]+)"\s+class="[^"]*accordionLink[^"]*">[\s\S]*?<span class="number_eps\s*">([\d]+)[\s\S]*?<span class="ep_name\s*">([\s\S]*?)<\/span>/g;
        let epMatch;
        while ((epMatch = episodeRegex.exec(accordionHtml)) !== null) {
          let href = epMatch[1].trim();
          const number = epMatch[2].trim();
          // Clean up the episode title by removing extra whitespace/newlines
          const title = epMatch[3].replace(/\s+/g, ' ').trim();
          // Prepend baseUrl if the href is relative
          if (!href.startsWith("https")) {
            href = baseUrl + href;
          }
          episodes.push({ href, number, title });
        }

        console.log(episodes);
        
        results.push({
          accordionId: id,
          episodes: episodes
        });
      } catch (error) {
        console.error(`Error fetching accordion ${id}:`, error);
      }
    }
    
    return results;
}
  
function extractStreamUrl(html) {
    const sourceRegex = /<source\s+src=['"]([^'"]+)['"][^>]*type=['"]video\/mp4['"][^>]*>/i;
    const match = html.match(sourceRegex);
    return match ? match[1].replace(/&amp;/g, '&') : null;
}

extractEpisodes(`https://svetserialu.io/serial/naruto`);