<div align="center">
  <img src="https://www.mocoapp.com/assets/moco-logo@2x-c50c469a52b74e96144dc383c3ea2261e6edae905a6b885a0eedafeaf1e861dc.png" alt="MOCO Logo" width="120" height="120" />
  <h1>MOCO MCP Server</h1>
  <p><em>A Model Context Protocol (MCP) Server for the MOCO ERP Software</em></p>

  [![npm version](https://img.shields.io/npm/v/@levisteria-solutions/moco-mcp-server.svg)](https://www.npmjs.com/package/@levisteria-solutions/moco-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

Instead of manually defining endpoints, this server uses the **official MOCO OpenAPI specification** (bundled in the `openapi/` directory) and a full schema reference parser to automatically generate all available MCP tools. This gives any MCP-compatible LLM (like Claude) instant access to all read and write operations (GET, POST, PUT, DELETE) of the MOCO API v1, complete with precise tool descriptions and parameter schemas.

Developed and maintained by **[Levisteria GbR](https://levisteria.com)** (Eddy Lackmann).

## Features

- **Full API Coverage:** Automatically generates tools for Time Tracking, Projects, Invoices, Contacts, and all other MOCO endpoints.
- **Safety Mode:** Can be restricted to `READ_ONLY` via environment variables to prevent accidental data modifications by the LLM.
- **Pre-Bundled Spec:** Ships with a fully dereferenced copy of the MOCO OpenAPI specification (`openapi/openapi.json`), so the server starts instantly without any network calls to fetch it. Run `npm run update-spec` to refresh it from a new source when MOCO updates their API.
- **Easy Execution:** Run directly via `npx`.

## Prerequisites

- Node.js (v24 or higher)
- A MOCO Account (`<your-account>.mocoapp.com`)
- A MOCO API Key (found in MOCO under Profile > Integrations)

## Quick Start (npx)

You can run the server directly without installing it globally:

```bash
export MOCO_DOMAIN="your-account-name"
export MOCO_API_KEY="your-api-key"
npx -y @levisteria-solutions/moco-mcp-server
```

## Configuration in Claude Desktop / Cursor

Add the server to your MCP configuration (e.g., in Claude Desktop or Cursor).

### Using npx (Recommended for local use)

```json
{
  "mcpServers": {
    "moco": {
      "command": "npx",
      "args": ["-y", "@levisteria-solutions/moco-mcp-server"],
      "env": {
        "MOCO_DOMAIN": "your-account-name",
        "MOCO_API_KEY": "your-api-key",
        "MOCO_READ_ONLY": "false"
      }
    }
  }
}
```


```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MOCO_DOMAIN` | Your MOCO subdomain (without `.mocoapp.com`) | `mycompany` |
| `MOCO_API_KEY` | Your personal or account API Key | `12345abcdef...` |
| `MOCO_READ_ONLY` | If `true`, only GET requests (reading) are allowed. POST/PUT/DELETE are blocked. | `true` or `false` |

## Development

1. Clone the repository:
```bash
git clone https://github.com/levisteria/moco-mcp-server.git
cd moco-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Run locally:
```bash
npm start
```



## How it works

1. The server loads the pre-bundled, fully dereferenced MOCO OpenAPI specification from `openapi/openapi.json` at startup (no network call involved).
2. It parses all paths (e.g., `/activities`) and methods (e.g., `GET`, `POST`) and extracts their summaries and descriptions.
3. It translates the parameters and request bodies into JSON Schemas that MCP understands.
4. The generated tools are named e.g., `get_activities` or `post_activities`.
5. When the LLM calls a tool, the server forwards the authenticated request to MOCO and returns the JSON result.

## Updating the OpenAPI Spec

`openapi/openapi.json` is checked into the repository so the server never needs network access at startup. To refresh it after MOCO updates their API, run:

```bash
npm run update-spec
```

By default this downloads MOCO's officially published spec from `https://docs.mocoapp.com/api/docs/v1.yaml`. To use a different source (a newer URL, or a local file), override it:

```bash
npm run update-spec -- <url-or-path-to-moco-openapi-spec>
# or
MOCO_OPENAPI_SOURCE=<url-or-path-to-moco-openapi-spec> npm run update-spec
```

This downloads (or reads) the given spec, fully dereferences all `$ref` links via `@apidevtools/swagger-parser`, and overwrites `openapi/openapi.json`. Commit the resulting file once you've verified the server still starts correctly.

## License

MIT License
