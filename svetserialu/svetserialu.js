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
  
function extractEpisodes(mainHtml) {
    const baseSiteUrl = "https://svetserialu.io";
    
    // Extract the base episodes URL from the "Začať pozerať" anchor.
    const urlRegex = /<a\s+href="([^"]+)"\s+class="button\s+starwatch\s+transition-200all">/;
    const urlMatch = mainHtml.match(urlRegex);
    const baseEpisodesUrl = urlMatch ? baseSiteUrl + urlMatch[1] : null;
    
    if (!baseEpisodesUrl) {
      console.error("Base episodes URL not found in main HTML.");
      return;
    }
    
    // Extract all accordion IDs from the main HTML.
    const accordionIds = [];
    const accordionRegex = /<div class="accordion accordionId(\d+)">/g;
    let idMatch;
    while ((idMatch = accordionRegex.exec(mainHtml)) !== null) {
      accordionIds.push(idMatch[1]);
    }
    
    // Call the async function to fetch and extract episodes.
    fetchEpisodesForAccordions(baseEpisodesUrl, accordionIds)
      .then(results => {
        console.log("All extracted episodes:", results);
        // You can now use `results` as needed.
      })
      .catch(error => {
        console.error("Error fetching episodes:", error);
      });
  }

  async function fetchEpisodesForAccordions(baseEpisodesUrl, accordionIds) {
    const baseSiteUrl = "https://svetserialu.io";
    const results = [];
    
    for (const id of accordionIds) {
      // Construct URL using the baseEpisodesUrl from the main HTML.
      const url = `${baseEpisodesUrl}?loadAccordionId=${id}`;
      try {
        const response = await fetch(url);
        const accordionHtml = await response.text();
        
        // Use regex to extract each episode from the accordion HTML.
        // It extracts the href, episode number (from <span class="number_eps">),
        // and the episode title (from <span class="ep_name">).
        const episodes = [];
        const episodeRegex = /<a\s+href="([^"]+)"\s+class="[^"]*accordionLink[^"]*">[\s\S]*?<span\s+class="number_eps\s*">([\d]+)[\s\S]*?<span\s+class="ep_name\s*">([\s\S]*?)<\/span>/g;
        let epMatch;
        while ((epMatch = episodeRegex.exec(accordionHtml)) !== null) {
          let href = epMatch[1].trim();
          const number = epMatch[2].trim();
          const title = epMatch[3].replace(/\s+/g, ' ').trim();
          if (!href.startsWith("https")) {
            href = baseSiteUrl + href;
          }
          episodes.push({ href, number, title });
        }
        
        console.log(`Episodes from accordion ${id}:`, episodes);
        
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