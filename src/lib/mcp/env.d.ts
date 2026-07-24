// The MCP entry and tool files are bundled to a Deno Edge Function at build
// time, where `process.env` is polyfilled. In the app's TS project we only
// need the type shim.
declare const process: { env: Record<string, string | undefined> };