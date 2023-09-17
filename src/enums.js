const LOCAL_ENUMS = {};

export const ENUMS_DEFINITION = {

  CLEAN_UP_PENDING_TIMEOUTS: 1,
  LIST_PENDING_TIMEOUTS: 2

};

const values = Object.values(ENUMS_DEFINITION);
const keys = Object.keys(ENUMS_DEFINITION);

values.forEach((value, index) => {

  LOCAL_ENUMS[value] = keys[index];
  LOCAL_ENUMS[keys[index]] = value;

});

export const ENUMS = Object.freeze(LOCAL_ENUMS);
