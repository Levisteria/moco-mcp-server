#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import SwaggerParser from "@apidevtools/swagger-parser";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MOCO API configuration
const MOCO_DOMAIN = process.env.MOCO_DOMAIN;
const MOCO_API_KEY = process.env.MOCO_API_KEY;
const MOCO_READ_ONLY = process.env.MOCO_READ_ONLY === 'true'; // Optional: Restrict to GET requests

if (!MOCO_DOMAIN || !MOCO_API_KEY) {
  console.error("Error: MOCO_DOMAIN and MOCO_API_KEY environment variables are required.");
  process.exit(1);
}

if (MOCO_READ_ONLY) {
  console.error("Warning: Server is running in READ-ONLY mode. Only GET requests will be available.");
}

const MOCO_API_BASE_URL = `https://${MOCO_DOMAIN}.mocoapp.com/api/v1`;

const mocoClient = axios.create({
  baseURL: MOCO_API_BASE_URL,
  headers: {
    "Authorization": `Token token=${MOCO_API_KEY}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Create the MCP server
const server = new Server(
  {
    name: "moco-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// We will fetch and cache the OpenAPI spec and tools
let openApiSpec: any = null;
let mocoTools: Tool[] = [];
// Map tool names to their HTTP method and path
const toolOperations = new Map<string, { method: string; path: string }>();

// Helper to convert OpenAPI path to a valid tool name
function generateToolName(method: string, apiPath: string): string {
  // e.g., GET /activities/{id} -> get_activities_by_id
  const cleanPath = apiPath.replace(/^\//, '').replace(/\//g, '_').replace(/\{([^}]+)\}/g, 'by_$1');
  return `${method.toLowerCase()}_${cleanPath}`;
}

// Helper to extract JSON Schema from OpenAPI parameters and requestBody
function generateInputSchema(operation: any): any {
  const schema: any = {
    type: "object",
    properties: {},
    required: [],
  };

  // Add path and query parameters
  if (operation.parameters && Array.isArray(operation.parameters)) {
    operation.parameters.forEach((param: any) => {
      // With SwaggerParser.dereference, refs are already resolved!
      const paramName = param.name;
      const paramSchema = param.schema || { type: "string" };
      
      schema.properties[paramName] = {
        ...paramSchema,
        description: param.description || paramSchema.description || `Parameter ${paramName}`,
      };
      
      if (param.required) {
        schema.required.push(paramName);
      }
    });
  }

  // Add body parameters with full schema support
  if (operation.requestBody && operation.requestBody.content && operation.requestBody.content['application/json']) {
    const bodySchema = operation.requestBody.content['application/json'].schema;
    schema.properties.body = {
      ...bodySchema,
      description: operation.requestBody.description || "JSON request body",
    };
    if (operation.requestBody.required) {
      schema.required.push("body");
    }
  }

  return schema;
}

// Fetch and parse the MOCO OpenAPI specification
async function loadOpenApiSpec() {
  try {
    console.error("Loading and resolving MOCO OpenAPI specification...");
    // The bundled/raw spec is shipped with the package
    const specPath = path.join(__dirname, '../../openapi/openapi_raw.json');
    // dereference resolves all $refs internally, so we don't have to deal with them
    openApiSpec = await SwaggerParser.dereference(specPath);
    
    // Generate tools
    for (const [apiPath, pathItem] of Object.entries(openApiSpec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        const lowerMethod = method.toLowerCase();
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(lowerMethod)) {
          continue;
        }
        
        // Enforce read-only mode if enabled
        if (MOCO_READ_ONLY && lowerMethod !== 'get') {
          continue;
        }
        
        const toolName = generateToolName(method, apiPath);
        const description = (operation as any).summary || (operation as any).description || `MOCO API: ${method.toUpperCase()} ${apiPath}`;
        
        const inputSchema = generateInputSchema(operation);
        
        mocoTools.push({
          name: toolName,
          description: description,
          inputSchema: inputSchema,
        });
        
        toolOperations.set(toolName, { method: method.toUpperCase(), path: apiPath });
      }
    }
    console.error(`Successfully generated ${mocoTools.length} MCP tools from MOCO OpenAPI spec.`);
  } catch (error) {
    console.error("Failed to load MOCO OpenAPI specification:", error);
    process.exit(1);
  }
}

// Set up the ListTools request handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: mocoTools,
  };
});

// Set up the CallTool request handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const operation = toolOperations.get(toolName);
  
  if (!operation) {
    throw new Error(`Tool not found: ${toolName}`);
  }
  
  const args = request.params.arguments || {};
  let urlPath = operation.path;
  const queryParams: Record<string, any> = {};
  let requestBody = args.body || undefined;
  
  // Replace path parameters and collect query parameters
  for (const [key, value] of Object.entries(args)) {
    if (key === 'body') continue;
    
    if (urlPath.includes(`{${key}}`)) {
      urlPath = urlPath.replace(`{${key}}`, encodeURIComponent(String(value)));
    } else {
      queryParams[key] = value;
    }
  }
  
  try {
    const response = await mocoClient.request({
      method: operation.method,
      url: urlPath,
      params: queryParams,
      data: requestBody,
    });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  } catch (error: any) {
    let errorMessage = error.message;
    if (error.response) {
      errorMessage = `MOCO API Error ${error.response.status}: ${JSON.stringify(error.response.data)}`;
    }
    
    return {
      content: [
        {
          type: "text",
          text: `API Request failed: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function run() {
  await loadOpenApiSpec();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MOCO MCP Server is running and listening on stdio.");
}

run().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
