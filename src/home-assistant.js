import assert from 'node:assert/strict';

import HomeAssistant from 'homeassistant';

import { defaultLogger as logger } from './logger.js';
import { waitForSecs } from './utils.js';
import homeAssistantConfig from './configs/home-assistant-info.js';

assert.ok(process.env.HOME_ASSISTANT_TOKEN, 'HOME_ASSISTANT_TOKEN env. variable is not provided');

const hass = new HomeAssistant(homeAssistantConfig);

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
