require("dotenv").config();
const express = require("express");

const PORT = process.env.PORT;

const app = express();

function healthcheck() {
  app.get("/healthz", (req, res) => {
    res.status(200).send('Healthy')
  });
  
  app.listen(PORT);  
}

module.exports = healthcheck;
