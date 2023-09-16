import HomeAssistant from 'homeassistant';

import { defaultLogger as logger } from './logger.js';

const hass = new HomeAssistant({
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
});

// logger.log(await hass.states.list());

export async function toggleSwitch({ switchName, entity_id } = { switchName: '', entity_id: '' }) {

  try {

    logger.log(`Home-assistant API status ${await JSON.stringify(hass.status())}`);

    logger.log('State of switch before toggling');
    logger.log(JSON.stringify(await hass.states.get('switch', switchName)));

    await hass.services.call('toggle', 'switch', {
      entity_id: entity_id
    });

    logger.log('State of switch after toggling');
    logger.log(JSON.stringify(await hass.states.get('switch', switchName)));

  } catch (err) {

    logger.error(err);

  }


}
