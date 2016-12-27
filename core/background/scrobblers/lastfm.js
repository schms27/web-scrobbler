'use strict';

/**
 * Module for all communication with L.FM
 */
define([
	'scrobblers/baseScrobbler',
	'wrappers/can',
], function (BaseScrobbler, can) {
	const LastFM = new BaseScrobbler({
		label: 'Last.FM',
		storage: 'LastFM',
		apiUrl: 'https://ws.audioscrobbler.com/2.0/',
		apiKey: 'd9bb1870d3269646f740544d9def2c95',
		apiSecret: '2160733a567d4a1a69a73fad54c564b2',
		authUrl: 'https://www.last.fm/api/auth/'
	});

	/**
	 * Asynchronously loads song info into given song object
	 *
	 * Can be used as a validation if L.FM has the song in database and also
	 * fetches some useful metadata, if the song is found
	 *
	 * To wait for this call to finish, observe changes on song object
	 * using song.bind('change', function(){...})
	 *
	 * @param  {Song} song Song instance
	 * @return {Promise} Promise that will resolve with 'isValid' flag
	 */
	LastFM.loadSongInfo = function(song) {
		return this.getSession().then(({sessionName}) => {
			return {username: sessionName};
		}).catch(() => {
			return {};
		}).then((params) => {
			params.method = 'track.getinfo';
			params.autocorrect = localStorage.useAutocorrect ? localStorage.useAutocorrect : 0;
			params.artist = song.processed.artist || song.parsed.artist;
			params.track = song.processed.track || song.parsed.track;

			if (params.artist === null || params.track === null) {
				return false;
			}

			return this.doRequest('GET', params, false).then(($doc) => {
				if ($doc.find('lfm').attr('status') !== 'ok') {
					return false;
				}

				can.batch.start();
				song.processed.attr({
					artist: $doc.find('artist > name').text(),
					track: $doc.find('track > name').text(),
					duration: (parseInt($doc.find('track > duration').text()) / 1000) || null
				});

				let thumbUrl = song.getTrackArt();
				if (thumbUrl === null) {
					let imageSizes = ['extralarge', 'large', 'medium'];
					for (let imageSize of imageSizes) {
						thumbUrl = $doc.find(`album > image[size="${imageSize}"]`).text();
						if (thumbUrl) {
							break;
						}
					}
				}

				song.metadata.attr({
					artistUrl: $doc.find('artist > url').text(),
					trackUrl: $doc.find('track > url').text(),
					userloved: $doc.find('userloved').text() === '1',
					artistThumbUrl: thumbUrl
				});
				can.batch.stop();

				return true;
			}).catch(() => {
				return false;
			});
		});
	};

	LastFM.isLoadSongInfoSupported = function() {
		return true;
	};

	return LastFM;
});