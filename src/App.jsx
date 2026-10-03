import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Search, Music, Heart, List, Filter, X, Plus } from 'lucide-react';

export default function ArchiveMusicPlayer() {
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState([]);
const [loading, setLoading] = useState(false);
const [currentTrack, setCurrentTrack] = useState(null);
const [isPlaying, setIsPlaying] = useState(false);
const [volume, setVolume] = useState(0.7);
const [isMuted, setIsMuted] = useState(false);
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);
const [favorites, setFavorites] = useState([]);
const [playlists, setPlaylists] = useState([]);
const [currentView, setCurrentView] = useState('search');
const [showFilters, setShowFilters] = useState(false);
const [mediaType, setMediaType] = useState('audio');
const [sortBy, setSortBy] = useState('downloads desc');
const [yearFrom, setYearFrom] = useState('');
const [yearTo, setYearTo] = useState('');
const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
const [newPlaylistName, setNewPlaylistName] = useState('');
const [currentPlaylist, setCurrentPlaylist] = useState(null);
const audioRef = useRef(null);

useEffect(() => {
const stored = localStorage.getItem('archiveFavorites');
if (stored) setFavorites(JSON.parse(stored));

const storedPlaylists = localStorage.getItem('archivePlaylists');
if (storedPlaylists) setPlaylists(JSON.parse(storedPlaylists));
}, []);

useEffect(() => {
localStorage.setItem('archiveFavorites', JSON.stringify(favorites));
}, [favorites]);

useEffect(() => {
localStorage.setItem('archivePlaylists', JSON.stringify(playlists));
}, [playlists]);

const searchArchive = async () => {
if (!searchQuery.trim()) return;

setLoading(true);
try {
let query = `${searchQuery} AND mediatype:${mediaType}`;
if (yearFrom) query += ` AND year:[${yearFrom} TO ${yearTo || '9999'}]`;

const response = await fetch(
`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title,creator,year&sort[]=${sortBy}&rows=30&page=1&output=json`
);
const data = await response.json();
setSearchResults(data.response.docs || []);
setCurrentView('search');
} catch (error) {
console.error('Error searching archive:', error);
setSearchResults([]);
}
setLoading(false);
};

const loadTrack = async (identifier, title, creator) => {
try {
const metadataResponse = await fetch(`https://archive.org/metadata/${identifier}`);
const metadata = await metadataResponse.json();

const audioFile = metadata.files.find(file =>
file.format === 'VBR MP3' ||
file.format === 'MP3' ||
file.format === '128Kbps MP3' ||
file.format === 'Ogg Vorbis'
);

if (audioFile) {
const audioUrl = `https://archive.org/download/${identifier}/${audioFile.name}`;
setCurrentTrack({
url: audioUrl,
title: title,
creator: creator || 'Unknown Artist',
identifier: identifier
});
setIsPlaying(true);
}
} catch (error) {
console.error('Error loading track:', error);
}
};

const toggleFavorite = (item) => {
const exists = favorites.find(f => f.identifier === item.identifier);
if (exists) {
setFavorites(favorites.filter(f => f.identifier !== item.identifier));
} else {
setFavorites([...favorites, item]);
}
};

const isFavorite = (identifier) => {
return favorites.some(f => f.identifier === identifier);
};

const createPlaylist = () => {
if (!newPlaylistName.trim()) return;
const newPlaylist = {
id: Date.now().toString(),
name: newPlaylistName,
tracks: []
};
setPlaylists([...playlists, newPlaylist]);
setNewPlaylistName('');
setShowCreatePlaylist(false);
};

const addToPlaylist = (playlistId, track) => {
setPlaylists(playlists.map(p => {
if (p.id === playlistId) {
const exists = p.tracks.find(t => t.identifier === track.identifier);
if (!exists) {
return { ...p, tracks: [...p.tracks, track] };
}
}
return p;
}));
};

const removeFromPlaylist = (playlistId, trackIdentifier) => {
setPlaylists(playlists.map(p => {
if (p.id === playlistId) {
return { ...p, tracks: p.tracks.filter(t => t.identifier !== trackIdentifier) };
}
return p;
}));
};

const deletePlaylist = (playlistId) => {
setPlaylists(playlists.filter(p => p.id !== playlistId));
if (currentPlaylist?.id === playlistId) {
setCurrentPlaylist(null);
}
};

useEffect(() => {
const audio = audioRef.current;
if (!audio) return;

const updateTime = () => setCurrentTime(audio.currentTime);
const updateDuration = () => setDuration(audio.duration);
const handleEnded = () => {
setIsPlaying(false);
playNext();
};

audio.addEventListener('timeupdate', updateTime);
audio.addEventListener('loadedmetadata', updateDuration);
audio.addEventListener('ended', handleEnded);

return () => {
audio.removeEventListener('timeupdate', updateTime);
audio.removeEventListener('loadedmetadata', updateDuration);
audio.removeEventListener('ended', handleEnded);
};
}, [currentTrack]);

useEffect(() => {
if (audioRef.current) {
audioRef.current.volume = isMuted ? 0 : volume;
}
}, [volume, isMuted]);

useEffect(() => {
if (audioRef.current && currentTrack) {
audioRef.current.src = currentTrack.url;
if (isPlaying) {
audioRef.current.play();
}
}
}, [currentTrack]);

useEffect(() => {
if (audioRef.current) {
if (isPlaying) {
audioRef.current.play();
} else {
audioRef.current.pause();
}
}
}, [isPlaying]);

const togglePlay = () => {
setIsPlaying(!isPlaying);
};

const formatTime = (time) => {
if (isNaN(time)) return '0:00';
const minutes = Math.floor(time / 60);
const seconds = Math.floor(time % 60);
return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const handleSeek = (e) => {
const rect = e.currentTarget.getBoundingClientRect();
const x = e.clientX - rect.left;
const percentage = x / rect.width;
const newTime = percentage * duration;
if (audioRef.current) {
audioRef.current.currentTime = newTime;
}
};

const getCurrentList = () => {
if (currentView === 'favorites') return favorites;
if (currentView === 'playlist' && currentPlaylist) return currentPlaylist.tracks;
return searchResults;
};

const playNext = () => {
const list = getCurrentList();
const currentIndex = list.findIndex(r => r.identifier === currentTrack?.identifier);
if (currentIndex < list.length - 1) {
const next = list[currentIndex + 1];
loadTrack(next.identifier, next.title, next.creator);
}
};

const playPrevious = () => {
const list = getCurrentList();
const currentIndex = list.findIndex(r => r.identifier === currentTrack?.identifier);
if (currentIndex > 0) {
const prev = list[currentIndex - 1];
loadTrack(prev.identifier, prev.title, prev.creator);
}
};

const renderTrackList = (tracks) => (
<div className="grid gap-3 mb-32">
{tracks.map((result) => (
<div
key={result.identifier}
className={`bg-white/10 backdrop-blur-sm rounded-lg p-4 transition-all hover:bg-white/20 ${
currentTrack?.identifier === result.identifier ? 'ring-2 ring-blue-400' : ''
}`}
>
<div className="flex items-start justify-between gap-4">
<div
className="flex-1 cursor-pointer"
onClick={() => loadTrack(result.identifier, result.title, result.creator)}
>
<div className="font-semibold text-lg">{result.title}</div>
<div className="text-sm text-blue-200">
{result.creator || 'Unknown Artist'} {result.year && `• ${result.year}`}
</div>
</div>
<div className="flex gap-2">
<button
onClick={(e) => {
e.stopPropagation();
toggleFavorite(result);
}}
className={`p-2 rounded-full transition-colors ${
isFavorite(result.identifier)
? 'bg-red-500 hover:bg-red-600'
: 'bg-white/10 hover:bg-white/20'
}`}
>
<Heart className={`w-5 h-5 ${isFavorite(result.identifier) ? 'fill-current' : ''}`} />
</button>
{playlists.length > 0 && (
<div className="relative group">
<button
className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
>
<Plus className="w-5 h-5" />
</button>
<div className="hidden group-hover:block absolute right-0 top-12 bg-gray-900 rounded-lg shadow-xl z-10 min-w-[200px]">
{playlists.map(playlist => (
<button
key={playlist.id}
onClick={(e) => {
e.stopPropagation();
addToPlaylist(playlist.id, result);
}}
className="block w-full text-left px-4 py-2 hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg"
>
{playlist.name}
</button>
))}
</div>
</div>
)}
</div>
</div>
</div>
))}
</div>
);

return (
<div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
<audio ref={audioRef} />

<div className="max-w-6xl mx-auto">
<div className="text-center mb-8">
<h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
<Music className="w-10 h-10" />
Archive.org Music Player
</h1>
<p className="text-blue-200">Discover and stream audio from the Internet Archive</p>
</div>

<div className="flex gap-2 mb-6">
<button
onClick={() => setCurrentView('search')}
className={`px-4 py-2 rounded-lg transition-colors ${
currentView === 'search' ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'
}`}
>
<Search className="w-5 h-5 inline mr-2" />
Search
</button>
<button
onClick={() => setCurrentView('favorites')}
className={`px-4 py-2 rounded-lg transition-colors ${
currentView === 'favorites' ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'
}`}
>
<Heart className="w-5 h-5 inline mr-2" />
Favorites ({favorites.length})
</button>
<button
onClick={() => setCurrentView('playlists')}
className={`px-4 py-2 rounded-lg transition-colors ${
currentView === 'playlists' ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'
}`}
>
<List className="w-5 h-5 inline mr-2" />
Playlists ({playlists.length})
</button>
</div>

{currentView === 'search' && (
<>
<div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6">
<div className="flex gap-2 mb-4">
<input
type="text"
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
onKeyPress={(e) => e.key === 'Enter' && searchArchive()}
placeholder="Search for music, podcasts, or audio..."
className="flex-1 px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
/>
<button
onClick={() => setShowFilters(!showFilters)}
className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
showFilters ? 'bg-blue-600' : 'bg-white/20 hover:bg-white/30'
}`}
>
<Filter className="w-5 h-5" />
</button>
<button
onClick={searchArchive}
disabled={loading}
className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
>
<Search className="w-5 h-5" />
Search
</button>
</div>

{showFilters && (
<div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
<div>
<label className="block text-sm mb-2">Media Type</label>
<select
value={mediaType}
onChange={(e) => setMediaType(e.target.value)}
className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
>
<option value="audio">Audio</option>
<option value="etree">Live Music Archive</option>
</select>
</div>
<div>
<label className="block text-sm mb-2">Sort By</label>
<select
value={sortBy}
onChange={(e) => setSortBy(e.target.value)}
className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
>
<option value="downloads desc">Most Popular</option>
<option value="date desc">Newest First</option>
<option value="date asc">Oldest First</option>
<option value="title asc">Title A-Z</option>
</select>
</div>
<div>
<label className="block text-sm mb-2">Year From</label>
<input
type="number"
value={yearFrom}
onChange={(e) => setYearFrom(e.target.value)}
placeholder="e.g. 1950"
className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
/>
</div>
<div>
<label className="block text-sm mb-2">Year To</label>
<input
type="number"
value={yearTo}
onChange={(e) => setYearTo(e.target.value)}
placeholder="e.g. 2000"
className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
/>
</div>
</div>
)}
</div>

{loading && (
<div className="text-center py-12">
<div className="inline-block w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
</div>
)}

{renderTrackList(searchResults)}
</>
)}

{currentView === 'favorites' && (
<>
<h2 className="text-2xl font-bold mb-6">Your Favorites</h2>
{favorites.length === 0 ? (
<div className="text-center py-12 text-blue-200">
<Heart className="w-16 h-16 mx-auto mb-4 opacity-50" />
<p>No favorites yet. Click the heart icon on any track to add it here!</p>
</div>
) : (
renderTrackList(favorites)
)}
</>
)}

{currentView === 'playlists' && !currentPlaylist && (
<>
<div className="flex justify-between items-center mb-6">
<h2 className="text-2xl font-bold">Your Playlists</h2>
<button
onClick={() => setShowCreatePlaylist(true)}
className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2"
>
<Plus className="w-5 h-5" />
New Playlist
</button>
</div>

{showCreatePlaylist && (
<div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6">
<div className="flex gap-2">
<input
type="text"
value={newPlaylistName}
onChange={(e) => setNewPlaylistName(e.target.value)}
onKeyPress={(e) => e.key === 'Enter' && createPlaylist()}
placeholder="Playlist name..."
className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
/>
<button
onClick={createPlaylist}
className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
>
Create
</button>
<button
onClick={() => {
setShowCreatePlaylist(false);
setNewPlaylistName('');
}}
className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
>
<X className="w-5 h-5" />
</button>
</div>
</div>
)}

{playlists.length === 0 ? (
<div className="text-center py-12 text-blue-200">
<List className="w-16 h-16 mx-auto mb-4 opacity-50" />
<p>No playlists yet. Create one to organize your music!</p>
</div>
) : (
<div className="grid gap-3">
{playlists.map((playlist) => (
<div
key={playlist.id}
className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all"
>
<div className="flex justify-between items-center">
<div
className="flex-1 cursor-pointer"
onClick={() => {
setCurrentPlaylist(playlist);
setCurrentView('playlist');
}}
>
<div className="font-semibold text-lg">{playlist.name}</div>
<div className="text-sm text-blue-200">{playlist.tracks.length} tracks</div>
</div>
<button
onClick={() => deletePlaylist(playlist.id)}
className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full transition-colors"
>
<X className="w-5 h-5" />
</button>
</div>
</div>
))}
</div>
)}
</>
)}

{currentView === 'playlist' && currentPlaylist && (
<>
<div className="flex items-center gap-4 mb-6">
<button
onClick={() => {
setCurrentPlaylist(null);
setCurrentView('playlists');
}}
className="p-2 hover:bg-white/10 rounded-full transition-colors"
>
<X className="w-6 h-6" />
</button>
<h2 className="text-2xl font-bold">{currentPlaylist.name}</h2>
<span className="text-blue-200">({currentPlaylist.tracks.length} tracks)</span>
</div>

{currentPlaylist.tracks.length === 0 ? (
<div className="text-center py-12 text-blue-200">
<Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
<p>This playlist is empty. Add tracks using the + button on any track!</p>
</div>
) : (
<div className="grid gap-3 mb-32">
{currentPlaylist.tracks.map((track) => (
<div
key={track.identifier}
className={`bg-white/10 backdrop-blur-sm rounded-lg p-4 transition-all hover:bg-white/20 ${
currentTrack?.identifier === track.identifier ? 'ring-2 ring-blue-400' : ''
}`}
>
<div className="flex items-start justify-between gap-4">
<div
className="flex-1 cursor-pointer"
onClick={() => loadTrack(track.identifier, track.title, track.creator)}
>
<div className="font-semibold text-lg">{track.title}</div>
<div className="text-sm text-blue-200">
{track.creator || 'Unknown Artist'} {track.year && `• ${track.year}`}
</div>
</div>
<button
onClick={() => removeFromPlaylist(currentPlaylist.id, track.identifier)}
className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full transition-colors"
>
<X className="w-5 h-5" />
</button>
</div>
</div>
))}
</div>
)}
</>
)}

{currentTrack && (
<div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-white/20 p-6">
<div className="max-w-6xl mx-auto">
<div className="mb-4">
<div className="font-semibold text-lg">{currentTrack.title}</div>
<div className="text-sm text-blue-300">{currentTrack.creator}</div>
</div>

<div className="mb-4">
<div
className="h-2 bg-white/20 rounded-full cursor-pointer"
onClick={handleSeek}
>
<div
className="h-full bg-blue-500 rounded-full"
style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
></div>
</div>
<div className="flex justify-between text-xs text-white/60 mt-1">
<span>{formatTime(currentTime)}</span>
<span>{formatTime(duration)}</span>
</div>
</div>

<div className="flex items-center justify-between">
<div className="flex items-center gap-2 w-32">
<button
onClick={() => setIsMuted(!isMuted)}
className="p-2 hover:bg-white/10 rounded-full transition-colors"
>
{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
</button>
<input
type="range"
min="0"
max="1"
step="0.01"
value={isMuted ? 0 : volume}
onChange={(e) => {
setVolume(parseFloat(e.target.value));
setIsMuted(false);
}}
className="w-full"
/>
</div>

<div className="flex items-center gap-4">
<button
onClick={playPrevious}
className="p-2 hover:bg-white/10 rounded-full transition-colors"
>
<SkipBack className="w-6 h-6" />
</button>
<button
onClick={togglePlay}
className="p-4 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors"
>
{isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
</button>
<button
onClick={playNext}
className="p-2 hover:bg-white/10 rounded-full transition-colors"
>
<SkipForward className="w-6 h-6" />
</button>
</div>

<div className="w-32"></div>
</div>
</div>
</div>
)}
</div>
</div>
);
}