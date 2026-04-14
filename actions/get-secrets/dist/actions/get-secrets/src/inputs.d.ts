declare const VALID_OUTPUT_FORMATS: readonly ["env", "dotenv", "json"];
export type OutputFormat = (typeof VALID_OUTPUT_FORMATS)[number];
export type GetSecretsInputs = {
    token: string;
    apiUrl: string;
    orgId: string | undefined;
    workspace: string;
    environment: string;
    keys: string[];
    output: OutputFormat;
    outputPath: string | undefined;
    prefix: string;
    failOnMissing: boolean;
};
/**
 * Parses and validates inputs for get-secrets.
 *
 * Token, api-url, and org-id all fall back to env vars set by the login
 * action (CRYPTFLARE_TOKEN, CRYPTFLARE_API_URL, CRYPTFLARE_ORG_ID) so the
 * action can be used standalone OR after a login step with no double
 * configuration. Throws with actionable messages on bad input.
 */
export declare function getInputs(): GetSecretsInputs;
export {};
