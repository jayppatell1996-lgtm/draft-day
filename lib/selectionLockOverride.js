// Runtime override module for selection lock
let overrideEnabled = false;

export const isOverrideEnabled = () => overrideEnabled;
export const unlockSelections = () => { overrideEnabled = true; };
export const lockSelections = () => { overrideEnabled = false; };
