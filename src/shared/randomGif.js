require("dotenv").config();

const fetch = require("node-fetch");

const GIPHY_KEY = process.env.GIPHY_KEY;

async function randomGif(tag) {
    const response = await fetch(`https://api.giphy.com/v1/gifs/random?api_key=${GIPHY_KEY}&tag=${tag}&limit=1`)
    const responseJson = await response.json();

    const gifUrl = responseJson.data.url

    return gifUrl
}

module.exports = randomGif;