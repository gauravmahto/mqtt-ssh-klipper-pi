export default {

  // Your Home Assistant host
  // Optional, defaults to http://locahost
  host: 'http://localhost',

  // Your Home Assistant port number
  // Optional, defaults to 8123
  port: 8123,

  // Your long lived access token generated on your profile page.
  // Optional
  token: process.env.HOME_ASSISTANT_TOKEN,

  // Your Home Assistant Legacy API password
  // Optional
  // password: 'api_password',

  // Ignores SSL certificate errors, use with caution
  // Optional, defaults to false
  ignoreCert: false

};
