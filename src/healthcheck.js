require("dotenv").config();
const express = require("express");

const PORT = process.env.PORT;

const app = express();

function healthcheck() {
  app.get("/healthz", (req, res) => {
    console.log('Recieved healthcheck request')
    res.json({ status: "UP" });
  });
  
  app.listen(PORT, () => {});  
}

module.exports = healthcheck;
