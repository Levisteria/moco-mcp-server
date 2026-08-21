import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function run() {
  console.log("Starting test client...");
  
  // Create transport pointing to our local server
  const transport = new StdioClientTransport({
    command: "node",
    args: ["./build/index.js"],
    env: {
      ...process.env,
      MOCO_DOMAIN: process.env.MOCO_DOMAIN || "test-domain",
      MOCO_API_KEY: process.env.MOCO_API_KEY || "test-key"
    }
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log("Connected to server!");
    
    // Request tools
    const tools = await client.listTools();
    console.log(`Received ${tools.tools.length} tools from server.`);
    
    // Print a few tool names to verify
    console.log("Sample tools:");
    tools.tools.slice(0, 5).forEach(t => console.log(`- ${t.name}: ${t.description}`));
    
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

run();
