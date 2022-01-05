const fetch = require("node-fetch");

function getTweetId(tweetUrl) {
	const testRegex = /https?:\/\/twitter.com\/\w+\/status\/\d+/

	if (testRegex.test(tweetUrl)) {
		return tweetUrl.match(/\d+/)
	} else {
		console.error(error);
		throw 'I can only translate links from Twitter';
	}
}

async function getTweet(tweetId) {
	const params = new URLSearchParams({
		expansions: 'author_id',
		'user.fields': 'name,username,profile_image_url',
		'tweet.fields': 'created_at'
	});

	try {
		const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}?${params.toString()}`, {
			headers: {
				Authorization: `Bearer ${process.env.TWITTER_TOKEN}`,
			},
		})
		const responseJson = await response.json();
		
		return {
			text: responseJson.data.text,
			name: responseJson.includes.users[0].name,
			username: responseJson.includes.users[0].username,
			profile_image_url: responseJson.includes.users[0].profile_image_url,
			created_at: responseJson.data.created_at,
		}
	} catch(error) {
		console.error(error);
		throw("I couldn't translate the tweet");
	}
}

module.exports = {
	getTweetId,
	getTweet
}