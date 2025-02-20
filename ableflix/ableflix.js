async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=653bb8af90162bd98fc7ee32bcbbfb3d&query=${encodedKeyword}`);
        const data = JSON.parse(responseText);

        // Filter results to include only movies
        const transformedResults = data.results
            .filter(result => result.media_type === "movie") // Ensure only movies
            .map(result => ({
                title: result.title || result.name,
                image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                href: `https://ableflix.xyz/watch/movie/${result.id}`
            }));


        // const transformedResults = data.results.map(result => {
        //     // For movies, TMDB returns "title" and media_type === "movie"
        //     if(result.media_type === "movie" || result.title) {
        //         return {
        //             title: result.title || result.name,
        //             image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
        //             href: `https://ableflix.xyz/watch/movie/${result.id}`
        //         };
        //     } else if(result.media_type === "tv" || result.name) {
        //         // For TV shows, TMDB returns "name" and media_type === "tv"
        //         return {
        //             title: result.name || result.title,
        //             image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
        //             href: `https://ableflix.xyz/watch/${result.id}`
        //         };
        //     } else {
        //         // Fallback if media_type is not defined
        //         return {
        //             title: result.title || result.name || "Untitled",
        //             image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
        //             href: `https://ableflix.xyz/watch/${result.id}`
        //         };
        //     }
        // });

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        if(url.includes('/watch/movie/')) {
            const match = url.match(/https:\/\/ableflix\.xyz\/watch\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`);
            const data = JSON.parse(responseText);

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else if(url.includes('/watch/')) {
            const match = url.match(/https:\/\/ableflix\.xyz\/watch\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`);
            const data = JSON.parse(responseText);

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') + " minutes" : 'Unknown'}`,
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
            const match = url.match(/https:\/\/ableflix\.xyz\/watch\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
            const movieId = match[1];
            return JSON.stringify([
                { href: `https://ableflix.xyz/watch/movie/${movieId}`, number: 1, title: "Full Movie" }
            ]);
        } else if(url.includes('/watch/')) {
            const match = url.match(/https:\/\/ableflix\.xyz\/watch\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
            const showId = match[1];
            
            const showResponseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`);
            const showData = JSON.parse(showResponseText);
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`);
                const seasonData = JSON.parse(seasonResponseText);
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map(episode => ({
                        href: `https://ableflix.xyz/watch/${showId}`,
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
        "https://play2.123embed.net/server/3?path=/movie/",  
        "https://moviekex.online/embed/api/fastfetch/",
    ];

    const servers = [
        "?sr=3",
        "?sr=2",
        "?sr=1"
    ];

    try {
        if (url.includes('/watch/movie/')) {
            const match = url.match(/https:\/\/ableflix\.xyz\/watch\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];

            for (let i = 0; i < endpoints.length; i++) {
                for (let j = 0; j < servers.length; j++) {
                    try {
                        let apiUrl = endpoints[i] === "https://play2.123embed.net/server/3?path=/movie/"
                            ? `${endpoints[i]}${movieId}`
                            : `${endpoints[i]}${movieId}${servers[j]}`;

                        const responseText = await fetch(apiUrl);
                        const data = JSON.parse(responseText);

                        if (data) {
                            if (endpoints[i] === "https://play2.123embed.net/server/3?path=/movie/") {
                                const hlsSource = data.playlist?.find(source => source.type === 'hls');
                                if (hlsSource?.file) return hlsSource.file;
                            } else {
                                const hlsSource = data.url?.find(source => source.type === 'hls');
                                if (hlsSource?.link) return hlsSource.link;
                            }
                        }
                    } catch (err) {
                        console.log(`Fetch error on endpoint ${endpoints[i]} for movie ${movieId}:`, err);
                    }
                }
            }
            return null;
        } else if (url.includes('/watch/')) {
            const match = url.match(/https:\/\/ableflix\.xyz\/watch\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];

            for (let i = 0; i < servers.length; i++) {
                try {
                    const responseText = await fetch(`https://moviekex.online/embed/api/fastfetch/${showId}/${seasonNumber}/${episodeNumber}${servers[i]}`);
                    const data = JSON.parse(responseText);

                    if (data) {
                        const hlsSource = data.url.find(source => source.type === 'hls');
                        
                        if (hlsSource && hlsSource.link) return hlsSource.link;
                    }
                } catch (err) {
                    console.log(`Fetch error on endpoint https://moviekex.online/embed/api/fastfetch/ for TV show ${showId} S${seasonNumber}E${episodeNumber}:`, err);
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
