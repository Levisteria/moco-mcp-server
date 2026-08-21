import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function run() {
  console.log("Starting MOCO MCP Client to fetch users...");
  
  if (!process.env.MOCO_DOMAIN || !process.env.MOCO_API_KEY) {
    console.error("Error: MOCO_DOMAIN or MOCO_API_KEY is not set.");
    process.exit(1);
  }
  
  const transport = new StdioClientTransport({
    command: "node",
    args: ["./build/index.js"],
    env: {
      ...process.env,
      MOCO_READ_ONLY: "true"
    }
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    
    // According to OpenAPI, the path is /users, so the tool should be get_users
    console.log("Calling get_users tool...");
    const result = await client.callTool({
      name: "get_users",
      arguments: {}
    });
    
    if (result.isError) {
      console.error("Tool execution returned an error:");
      console.error(result.content);
      process.exit(1);
    } else {
      const users = JSON.parse(result.content[0].text);
      console.log(`\nFound ${users.length} users in the system.`);
      
      console.log("\nUser Details:");
      users.forEach(u => {
        console.log(`- ${u.firstname} ${u.lastname} (${u.email}) - Active: ${u.active}`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error("\nTest failed with error:", err);
    process.exit(1);
  }
}

run();
