export type LoginInputs = {
  token: string;
  apiUrl: string;
  exportEnv: boolean;
};
/**
 * Parses and validates the action's inputs in one place. Throws on invalid
 * input with a message that tells the user exactly how to fix it - these
 * errors are caught at the top of run() and surfaced via core.setFailed.
 */
export declare function getInputs(): LoginInputs;
