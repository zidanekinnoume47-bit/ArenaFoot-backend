const brevo = require("@getbrevo/brevo");

const client = new brevo.BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

module.exports = client;