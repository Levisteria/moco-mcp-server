import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function run() {
  console.log("Starting MOCO MCP Server Live Test...");
  
  if (!process.env.MOCO_DOMAIN || !process.env.MOCO_API_KEY) {
    console.error("Error: MOCO_DOMAIN or MOCO_API_KEY is not set in the environment.");
    process.exit(1);
  }
  
  console.log(`Testing against MOCO Domain: ${process.env.MOCO_DOMAIN}`);

  // Create transport pointing to our local server
  const transport = new StdioClientTransport({
    command: "node",
    args: ["./build/index.js"],
    env: {
      ...process.env,
      MOCO_READ_ONLY: "true" // Enforce read-only mode for safety
    }
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log("Connected to MCP Server!");
    
    // Request tools
    console.log("Fetching tools list...");
    const tools = await client.listTools();
    console.log(`Success: Received ${tools.tools.length} tools from server.`);
    
    // Find the get_profile tool
    const profileTool = tools.tools.find(t => t.name === "get_profile" || t.name === "get_session");
    
    if (!profileTool) {
      console.log("Could not find get_profile tool. Available tools:");
      tools.tools.slice(0, 5).forEach(t => console.log(`- ${t.name}`));
      process.exit(1);
    }
    
    console.log(`\nFound test tool: ${profileTool.name}`);
    console.log("Executing tool call...");
    
    // Call the tool
    const result = await client.callTool({
      name: profileTool.name,
      arguments: {}
    });
    
    if (result.isError) {
      console.error("Tool execution returned an error:");
      console.error(result.content);
    } else {
      console.log("\nSuccess! Tool execution result:");
      const jsonResult = JSON.parse(result.content[0].text);
      // Only log safe fields to avoid leaking sensitive data in logs
      console.log(`User ID: ${jsonResult.id || 'N/A'}`);
      console.log(`Firstname: ${jsonResult.firstname || 'N/A'}`);
      console.log(`Lastname: ${jsonResult.lastname || 'N/A'}`);
      console.log(`Email: ${jsonResult.email || 'N/A'}`);
    }
    
    console.log("\nLive test completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("\nTest failed with error:", err);
    process.exit(1);
  }
}

run();
