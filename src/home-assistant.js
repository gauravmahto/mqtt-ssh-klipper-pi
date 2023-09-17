import HomeAssistant from 'homeassistant';

import { defaultLogger as logger } from './logger.js';
import { waitForSecs } from './utils.js';

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
// logger.log(await hass.services.list());

export async function setSwitchState({ switchName = '', entityId = '', retryCount = -1, off = true } = {}) {

  try {

    logger.log(`Home-assistant API status ${await JSON.stringify(hass.status())}`);

    logger.log('State of switch before toggling');
    const states = await hass.states.get('switch', switchName);
    logger.log(JSON.stringify(states));

    const initialState = states.state;
    const expectedFinalState = off ? 'on' : 'off';

    let output = await callSwitchService(off ? 'turn_off' : 'turn_on', entityId);
    logger.log(`Service call output ${output}. Awaiting for few seconds before fetching the latest state.`);

    await waitForSecs(5);

    logger.log('State of switch after toggling');
    let finalState = await hass.states.get('switch', switchName);
    logger.log(JSON.stringify(finalState));

    let count = 0;
    while ((count < retryCount) &&
      (expectedFinalState === finalState.state)) {

      await waitForSecs(5);
      finalState = await hass.states.get('switch', switchName);
      logger.log(JSON.stringify(finalState));

      count++;

    }

    if (count >= retryCount) {

      output = await callSwitchService(off ? 'turn_off' : 'turn_on', entityId);
      logger.log(`Re-attempt - Service call output ${output}. Awaiting for few seconds before fetching the latest state.`);

      await waitForSecs(5);

      logger.log('State of switch after toggling');
      logger.log(JSON.stringify(await hass.states.get('switch', switchName)));

    }

  } catch (err) {

    logger.error(err);

  }


}

async function callSwitchService(switchStateToSet, entityId) {

  return await hass.services.call(switchStateToSet, 'switch', {
    entity_id: entityId
  });

}
