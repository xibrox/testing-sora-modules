// var query = `
// query ($id: Int) { # Define which variables will be used in the query (id)
//   Media (id: $id, type: ANIME) { # Insert our variables into the query arguments (id) (type: ANIME is hard-coded in the query)
//     id
//     title {
//       romaji
//       english
//       native
//     }
//   }
// }
// `;

async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);

        // var variables = {
        //     id: 15125
        // };
        
        // // Define the config we'll need for our Api request
        // var url = 'https://graphql.anilist.co',
        //     options = {
        //         method: 'POST',
        //         headers: {
        //             'Content-Type': 'application/json',
        //             'Accept': 'application/json',
        //         },
        //         body: JSON.stringify({
        //             query: query,
        //             variables: variables
        //         })
        //     };

        // fetch(url, options).then({handleResponse})
        //     .then(handleData)
        //     .catch(handleError);

        const responseText = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=68e094699525b18a70bab2f86b1fa706&query=${encodedKeyword}`);
        const data = JSON.parse(responseText);

        const transformedResults = data.results.map(result => {
            if(result.media_type === "movie" || result.title) {
                return {
                    title: result.title || result.name || result.original_title || result.original_name,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://bingeflex.vercel.app/movie/${result.id}`
                };
            } else if(result.media_type === "tv" || result.name) {
                return {
                    title: result.name || result.title || result.original_name || result.original_title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://bingeflex.vercel.app/tv/${result.id}`
                };
            } else {
                return {
                    title: result.title || result.name || result.original_name || result.original_title || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://bingeflex.vercel.app/tv/${result.id}`
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
        if(url.includes('/movie/')) {
            const match = url.match(/https:\/\/bingeflex\.vercel\.app\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = JSON.parse(responseText);

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else if(url.includes('/tv/')) {
            const match = url.match(/https:\/\/bingeflex\.vercel\.app\/tv\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
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
        if(url.includes('/movie/')) {
            const match = url.match(/https:\/\/bingeflex\.vercel\.app\/movie\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];
            
            return JSON.stringify([
                { href: `https://bingeflex.vercel.app/movie/${movieId}`, number: 1, title: "Full Movie" }
            ]);
        } else if(url.includes('/tv/')) {
            const match = url.match(/https:\/\/bingeflex\.vercel\.app\/tv\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const showId = match[1];
            
            const showResponseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const showData = JSON.parse(showResponseText);
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
                const seasonData = JSON.parse(seasonResponseText);
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map(episode => ({
                        href: `https://bingeflex.vercel.app/tv/${showId}?season=${seasonNumber}&episode=${episode.episode_number}`,
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
                    const apiUrl = `https://rivestream.live/api/backendfetch?requestID=movieVideoProvider&id=${movieId}&service=${service}&secretKey=${secretKey[j]}&proxyMode=noProxy`;
                    
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
                    const apiUrl = `https://rivestream.live/api/backendfetch?requestID=movieVideoProvider&id=${movieId}&service=${service}&secretKey=${secretKey[j]}&proxyMode=noProxy`;
                    
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
                    const apiUrl = `https://rivestream.live/api/backendfetch?requestID=tvVideoProvider&id=${showId}&season=${seasonNumber}&episode=${episodeNumber}&service=${service}&secretKey=${secretKey[j]}&proxyMode=noProxy`;
                    
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
                    const apiUrl = `https://rivestream.live/api/backendfetch?requestID=tvVideoProvider&id=${showId}&season=${seasonNumber}&episode=${episodeNumber}&service=${service}&secretKey=${secretKey[j]}&proxyMode=noProxy`;
                    
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

// "\n  query (\n    $search: String,\n    $page: Int,\n    $perPage: Int,\n    $sort: [MediaSort],\n    $genre_in: [String],\n    $tag_in: [String],\n    $type: MediaType,\n    $format: MediaFormat,\n    $status: MediaStatus,\n    $countryOfOrigin: CountryCode,\n    $isAdult: Boolean,\n    $season: MediaSeason,\n    $startDate_like: String,\n    $source: MediaSource,\n    $averageScore_greater: Int,\n    $averageScore_lesser: Int\n  ) {\n    Page(page: $page, perPage: $perPage) {\n      media(\n        search: $search,\n        type: $type,\n        sort: $sort,\n        genre_in: $genre_in,\n        tag_in: $tag_in,\n        format: $format,\n        status: $status,\n        countryOfOrigin: $countryOfOrigin,\n        isAdult: $isAdult,\n        season: $season,\n        startDate_like: $startDate_like,\n        source: $source,\n        averageScore_greater: $averageScore_greater,\n        averageScore_lesser: $averageScore_lesser\n      ) {\n        id\n        idMal\n        averageScore\n        title {\n          romaji\n          english\n          native\n        }\n        episodes\n        nextAiringEpisode {\n          airingAt\n          timeUntilAiring\n          episode\n        }\n        status\n        genres\n        format\n        description\n        startDate {\n          year\n          month\n          day\n        }\n        endDate {\n          year\n          month\n          day\n        }\n        popularity\n        coverImage {\n          color\n          large\n          extraLarge\n        }\n        characters(perPage: 10, sort: [ROLE, RELEVANCE, ID]) { \n          edges {\n            id\n            role\n            node {\n              id\n            }\n            voiceActors(sort: [RELEVANCE, ID]) {\n              id\n              languageV2\n            }\n          }\n        }\n      }\n    }\n  }\n"
