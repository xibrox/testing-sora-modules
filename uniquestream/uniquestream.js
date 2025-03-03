async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetch(`https://anime.uniquestream.net/api/v1/search?query=${encodedKeyword}&t=all`);
        const data = JSON.parse(responseText);

        for (let i = 0; i < data.series.length; i++) {
            const responseText = await fetch(`https://anime.uniquestream.net/api/v1/series/${data.series[i].content_id}`);
            const seriesData = JSON.parse(responseText);
            data.series[i].image = seriesData.images.find(image => image.type === "poster_tall")?.url;
        }

        const transformedResults = data.series.map(result => {
            return {
                title: result.title || "Untitled",
                image: result.image || "",
                href: `https://anime.uniquestream.net/series/${result.content_id}/${result.title}`
            };
        });

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/anime\.uniquestream\.net\/series\/([^\/]+)\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const showId = match[1];

        const responseText = await fetch(`https://anime.uniquestream.net/api/v1/series/${showId}`);
        const data = JSON.parse(responseText);

        const transformedResults = [{
            description: data.description || 'No description available',
            aliases: `Duration: ${data.episode.duration_ms ? (data.episode.duration_ms / 60000).toFixed(2) + " minutes" : 'Unknown'}`,
            airdate: `Aired: ${data.first_air_date ? data.first_air_date : 'Unknown'}`
        }];

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Duration: Unknown',
            airdate: 'Aired/Released: Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const match = url.match(/https:\/\/anime\.uniquestream\.net\/series\/([^\/]+)\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const showId = match[1];
        const responseText = await fetch(`https://anime.uniquestream.net/api/v1/series/${showId}`);
        const data = JSON.parse(responseText);

        const fetchEpisodesFromSeasons = async () => {
            const episodes = [];

            for (const season of data.seasons) {
                const episodesCount = season.episode_count;
                const numberOfPages = Math.ceil(episodesCount / 20);

                for (let i = 1; i <= numberOfPages; i++) {
                    const response = await fetch(`https://anime.uniquestream.net/api/v1/season/${season.content_id}/episodes?page=${i}&limit=20&order_by=asc`);
                    const episodesData = JSON.parse(response);

                    episodes.push(...episodesData);
                }
            }

            return episodes;
        };

        const episodes = await fetchEpisodesFromSeasons();

        const transformedResults = episodes.map(episode => ({
            href: `https://anime.uniquestream.net/watch/${episode.content_id}`,
            number: episode.episode_number,
            title: episode.title
        }));

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    try {
        const match = url.match(/https:\/\/anime\.uniquestream\.net\/watch\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");
    
        const episodeId = match[1];
        
        const apiUrl = `https://anime.uniquestream.net/api/v1/episode/${episodeId}/media/dash/ja-JP`;

        const responseText = await fetch(apiUrl);
        const data = JSON.parse(responseText);

        if (data) {
            const source = data.dash?.hard_subs?.find(playlist => playlist.locale === 'en-US')?.playlist;

            console.log('Source:', JSON.stringify(source));

            if (source) return source;
        }
        
        return null;
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}
