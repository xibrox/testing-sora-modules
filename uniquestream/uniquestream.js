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

        console.log("Transformed episodes: " + JSON.stringify(transformedResults));

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    // "hyvax" is with .srt captions
  
    const servicesWithCaption = [
        "ghost",
    ];
  
    const servicesWithoutCaption = [
        "guru",
        "halo",
        "alpha",
        "g1",
        "g2",
        "fastx",
        "astra",
        "anime",
        "ninja",
        "catflix",
        "hyvax",
        "vidcloud",
        "filmxyz",
        "shadow",
        "kaze",
        "asiacloud",
        "zenith",
        "kage",
        "filmecho",
        "kinoecho",
        "ee3",
        "putafilme",
        "ophim",
    ];
  
    const secretKey = ["I", "3LZu", "M2V3", "4EXX", "s4", "yRy", "oqMz", "ysE", "RT", "iSI", "zlc", "H", "YNp", "5vR6", "h9S", "R", "jo", "F", "h2", "W8", "i", "sz09", "Xom", "gpU", "q", "6Qvg", "Cu", "5Zaz", "VK", "od", "FGY4", "eu", "D5Q", "smH", "11eq", "QrXs", "3", "L3", "YhlP", "c", "Z", "YT", "bnsy", "5", "fcL", "L22G", "r8", "J", "4", "gnK"];
  
    try {
        if (url.includes('/movie/')) {
            const match = url.match(/https:\/\/bingeflex\.vercel\.app\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
    
            const movieId = match[1];
    
            // Try services with captions
            for (let i = 0; i < servicesWithCaption.length; i++) {
                for (let j = 0; j < secretKey.length; j++) {
                    const service = servicesWithCaption[i];
                    const apiUrl = `https://rivestream.org/api/backendfetch?requestID=movieVideoProvider&id=${movieId}&service=${service}&secretKey=${secretKey[j]}&proxyMode=noProxy`;
                    
                    try {
                        const responseText = await fetch(apiUrl);
                        const data = JSON.parse(responseText);
                        
                        if (data) {
                            const hlsSource = data.data?.sources?.find(source => source.format === 'hls');
                            const subtitleTrack = data.data?.captions?.find(track =>
                                track.label.startsWith('English')
                            );

                            const result = {
                                stream: hlsSource ? hlsSource.url : null,
                                subtitles: subtitleTrack ? subtitleTrack.file : null
                            };

                            console.log("API URL: " + apiUrl);
                            console.log("Result: " + JSON.stringify(result));

                            return JSON.stringify(result);
                        }
                    } catch (err) {
                        console.log(`Fetch error on endpoint ${apiUrl} for movie ${movieId}:`, err);
                    }
                }
            }
    
            // Try services without captions
            for (let i = 0; i < servicesWithoutCaption.length; i++) {
                for (let j = 0; j < secretKey.length; j++) {
                    const service = servicesWithoutCaption[i];
                    const apiUrl = `https://rivestream.org/api/backendfetch?requestID=movieVideoProvider&id=${movieId}&service=${service}&secretKey=${secretKey[j]}&proxyMode=noProxy`;
                    
                    try {
                        const responseText = await fetch(apiUrl);
                        const data = JSON.parse(responseText);

                        if (data) {
                            const hlsSource = data.data?.sources?.find(source => source.format === 'hls');
                            if (hlsSource?.url) return hlsSource.url;
                        }
                    } catch (err) {
                        console.log(`Fetch error on endpoint ${apiUrl} for movie ${movieId}:`, err);
                    }
                }
            }

            return null;
        } else if (url.includes('/tv/')) {
            const match = url.match(/https:\/\/bingeflex\.vercel\.app\/tv\/([^\/]+)\?season=([^\/]+)&episode=([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
    
            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];
    
            // Try services with captions
            for (let i = 0; i < servicesWithCaption.length; i++) {
                for (let j = 0; j < secretKey.length; j++) {
                    const service = servicesWithCaption[i];
                    const apiUrl = `https://rivestream.org/api/backendfetch?requestID=tvVideoProvider&id=${showId}&season=${seasonNumber}&episode=${episodeNumber}&service=${service}&secretKey=${secretKey[j]}&proxyMode=noProxy`;
                    
                    try {
                        const responseText = await fetch(apiUrl);
                        const data = JSON.parse(responseText);
                        
                        if (data) {
                            const hlsSource = data.data?.sources?.find(source => source.format === 'hls');
                            const subtitleTrack = data.data?.captions?.find(track =>
                                track.label.startsWith('English')
                            );

                            if (hlsSource?.url) {
                                const result = {
                                    stream: hlsSource ? hlsSource.url : null,
                                    subtitles: subtitleTrack ? subtitleTrack.file : null
                                };
                                
                                console.log("API URL: " + apiUrl);
                                console.log("Result: " + JSON.stringify(result));
                                
                                return JSON.stringify(result);
                            }
                        }
                    } catch (err) {
                        console.log(`Fetch error on endpoint ${apiUrl} for show ${showId}:`, err);
                    }
                }
            }
    
            // Try services without captions
            for (let i = 0; i < servicesWithoutCaption.length; i++) {
                for (let j = 0; j < secretKey.length; j++) {
                    const service = servicesWithoutCaption[i];
                    const apiUrl = `https://rivestream.org/api/backendfetch?requestID=tvVideoProvider&id=${showId}&season=${seasonNumber}&episode=${episodeNumber}&service=${service}&secretKey=${secretKey[j]}&proxyMode=noProxy`;
                    
                    try {
                        const responseText = await fetch(apiUrl);
                        const data = JSON.parse(responseText);
                        
                        if (data) {
                            const hlsSource = data.data?.sources?.find(source => source.format === 'hls');
                            if (hlsSource?.url) return hlsSource.url;
                        }
                    } catch (err) {
                        console.log(`Fetch error on endpoint ${apiUrl} for show ${showId}:`, err);
                    }
                }
            }
            return null;
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}

extractEpisodes(`https://anime.uniquestream.net/series/Yv2I6x71/Naruto`);