async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=71fdb081b0133511ac14ac0cc10fd307&query=${encodedKeyword}`);
        const data = JSON.parse(responseText);

        const transformedResults = data.results.map(result => {
            // For movies, TMDB returns "title" and media_type === "movie"
            if(result.media_type === "movie" || result.title) {
                return {
                    title: result.title || result.name,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://hexa.watch/watch/movie/${result.id}`
                };
            }
            // For TV shows, TMDB returns "name" and media_type === "tv"
            else if(result.media_type === "tv" || result.name) {
                return {
                    title: result.name || result.title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    // Using default season/episode numbers (1/1)
                    href: `https://hexa.watch/watch/tv/${result.id}/1/1`
                };
            } else {
                // Fallback if media_type is not defined
                return {
                    title: result.title || result.name || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://hexa.watch/watch/tv/${result.id}/1/1`
                };
            }
        });

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        if(url.includes('/watch/movie/')) {
            const match = url.match(/https:\/\/hexa\.watch\/watch\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=71fdb081b0133511ac14ac0cc10fd307&append_to_response=videos,credits`);
            const data = JSON.parse(responseText);

            const transformedResults = [{
                description: data.overview || 'No description available',
                // Movies use runtime (in minutes)
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else if(url.includes('/watch/tv/')) {
            const match = url.match(/https:\/\/hexa\.watch\/watch\/tv\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=71fdb081b0133511ac14ac0cc10fd307&append_to_response=seasons`);
            const data = JSON.parse(responseText);

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') : 'Unknown'}`,
                airdate: `Aired: ${data.first_air_date ? data.first_air_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else {
            throw new Error("Invalid URL format");
        }
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
        if(url.includes('/watch/movie/')) {
            const match = url.match(/https:\/\/hexa\.watch\/watch\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
            const movieId = match[1];
            return JSON.stringify([
                { href: `https://hexa.watch/watch/movie/${movieId}`, number: 1, title: "Full Movie" }
            ]);
        } else if(url.includes('/watch/tv/')) {
            const match = url.match(/https:\/\/hexa\.watch\/watch\/tv\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
            const showId = match[1];
            
            const showResponseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=71fdb081b0133511ac14ac0cc10fd307`);
            const showData = JSON.parse(showResponseText);
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=71fdb081b0133511ac14ac0cc10fd307`);
                const seasonData = JSON.parse(seasonResponseText);
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map(episode => ({
                        href: `https://hexa.watch/watch/tv/${showId}/${seasonNumber}/${episode.episode_number}`,
                        number: episode.episode_number,
                        title: episode.name || ""
                    }));
                    allEpisodes = allEpisodes.concat(episodes);
                }
            }
            
            return JSON.stringify(allEpisodes);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    const endpoints = [
        "https://fishstick.hexa.watch/api/hexa1/",
        "https://fishstick.hexa.watch/api/hexa4/",
        "https://fishstick.hexa.watch/api/hexa2/",
        "https://fishstick.hexa.watch/api/hexa3/"
    ];

    try {
        if (url.includes('/watch/movie/')) {
            const match = url.match(/https:\/\/hexa\.watch\/watch\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];

            for (let i = 0; i < endpoints.length; i++) {
                try {
                    const responseText = await fetch(`${endpoints[i]}${movieId}`);
                    const data = JSON.parse(responseText);

                    if (data && data.stream && Array.isArray(data.stream)) {
                        const hlsSource = data.stream.find(source => source.type === 'hls');

                        if (hlsSource && hlsSource.url) return hlsSource.url;
                    }
                } catch (err) {
                    console.log(`Fetch error on endpoint ${endpoints[i]} for movie ${movieId}:`, err);
                }
            }
            return null;
        } else if (url.includes('/watch/tv/')) {
            const match = url.match(/https:\/\/hexa\.watch\/watch\/tv\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];

            for (let i = 0; i < endpoints.length; i++) {
                try {
                    const responseText = await fetch(`${endpoints[i]}${showId}/${seasonNumber}/${episodeNumber}`);
                    const data = JSON.parse(responseText);

                    if (data && data.stream && Array.isArray(data.stream)) {
                        const hlsSource = data.stream.find(source => source.type === 'hls');
                        
                        if (hlsSource && hlsSource.url) return hlsSource.url;
                    }
                } catch (err) {
                    console.log(`Fetch error on endpoint ${endpoints[i]} for TV show ${showId} S${seasonNumber}E${episodeNumber}:`, err);
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