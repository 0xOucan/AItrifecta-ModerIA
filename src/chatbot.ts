import {
  AgentKit,
  CdpWalletProvider,
  wethActionProvider,
  walletActionProvider,
  erc20ActionProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  pythActionProvider,
  Network,
  ViemWalletProvider,
} from "@coinbase/agentkit";

import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";
import { createReadStream, createWriteStream } from "fs";
import { createInterface } from "readline";
import { TelegramInterface } from "./telegram-interface.js";
import "reflect-metadata";
import { nillionSecretVaultActionProvider } from "./action-providers/nillion-secretvault/index.js";
import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient } from "viem";

config();

/**
 * Validates that required environment variables are set
 *
 * @throws {Error} - If required environment variables are missing
 * @returns {void}
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];

  const requiredVars = [
    "OPENAI_API_KEY",
    "WALLET_PRIVATE_KEY",
    "SV_ORG_DID",
    "SV_PRIVATE_KEY",
    "SV_NODE1_URL",
    "SV_NODE1_DID",
    "SV_NODE2_URL",
    "SV_NODE2_DID",
    "SV_NODE3_URL",
    "SV_NODE3_DID",
    "SCHEMA_ID_SERVICE_LISTING",
    "SCHEMA_ID_BOOKING",
    "SCHEMA_ID_FEEDBACK"
  ];
  
  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach((varName) => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    
    if (missingVars.includes("SCHEMA_ID_SERVICE_LISTING") || 
        missingVars.includes("SCHEMA_ID_BOOKING") || 
        missingVars.includes("SCHEMA_ID_FEEDBACK")) {
      console.error("\nMissing schema IDs. Run the schema creation script to generate them:");
      console.error("npm run create-schemas");
    }
    
    process.exit(1);
  }

  console.log("Environment validated successfully");
}

// Add this right after imports and before any other code
validateEnvironment();

/**
 * Initialize the agent with CDP Agentkit
 *
 * @returns Agent executor and config
 */
async function initializeAgent() {
  try {
    console.log("Initializing agent...");

    const privateKey = process.env.WALLET_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("Wallet private key not found in environment variables");
    }

    // Create Viem account and client
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    const transport = http('https://base-sepolia-rpc.publicnode.com', {
      batch: true,
      fetchOptions: {},
      retryCount: 3,
      retryDelay: 100,
      timeout: 30_000,
    });

    const client = createWalletClient({
      account,
      chain: baseSepolia,
      transport,
    });

    // Create Viem wallet provider
    const walletProvider = new ViemWalletProvider(client);

    // Initialize LLM
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    console.log("LLM initialized");

    // Initialize AgentKit with Nillion SecretVault
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        wethActionProvider(),
        pythActionProvider(),
        walletActionProvider(),
        erc20ActionProvider(),
        nillionSecretVaultActionProvider(),
      ],
    });

    const tools = await getLangChainTools(agentkit);
    const memory = new MemorySaver();
    const agentConfig = {
      configurable: { thread_id: "Moderia AI Agent" },
    };

    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
        You are Moderia AI, a powerful mediator for digital deals.
        You help service providers and clients connect, facilitating secure bookings, payments, and feedback.
        
        You leverage Nillion SecretVault for secure data storage, protecting sensitive information while allowing
        relevant parties to interact with non-sensitive data.
        
        Available Functionalities:
        
        1. Service Management:
           - Create and list service offerings
           - Browse available services
           - Manage service availability
        
        2. Booking Management:
           - Create bookings with encrypted customer information
           - Update booking status
           - Generate secure meeting links
        
        3. Feedback and Resolution:
           - Collect feedback from both parties
           - Mediate disputes
           - Manage resolution process
           - Determine fair compensation when necessary
        
        You act as an objective third party, joining service calls to take notes and ensuring
        quality standards are met. You can help resolve disputes by reviewing meeting notes
        and comparing against service claims.
        
        Remember that all sensitive data like personal information, meeting links, and payment details
        are securely encrypted using Nillion SecretVault.
      `,
    });

    console.log("Agent initialization complete");
    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

/**
 * Run the agent autonomously with specified intervals
 */
async function runAutonomousMode(agent: any, config: any, interval = 10) {
  console.log("Starting autonomous mode...");

  while (true) {
    try {
      const thought =
        "Check for any pending tasks like upcoming bookings, feedback that needs resolution, or disputes to handle.";

      const stream = await agent.stream(
        { messages: [new HumanMessage(thought)] },
        config,
      );

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }

      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      }
      process.exit(1);
    }
  }
}

/**
 * Run the agent interactively based on user input
 */
async function runChatMode(agent: any, config: any) {
  console.log("Starting chat mode... Type 'exit' to end.");

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  try {
    while (true) {
      const userInput = await question("\nPrompt: ");

      if (userInput.toLowerCase() === "exit") {
        break;
      }

      const stream = await agent.stream(
        { messages: [new HumanMessage(userInput)] },
        config,
      );

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

/**
 * Run the Telegram interface mode
 */
async function runTelegramMode(agent: any, config: any) {
  console.log("Starting Telegram mode... Waiting for /start command");

  return new Promise<void>((resolve) => {
    const telegram = new TelegramInterface(agent, config, {
      onExit: () => {
        console.log("Exiting Telegram mode...");
        resolve();
      },
      onKill: () => {
        console.log("Kill command received. Shutting down...");
        process.exit(0);
      },
    });
  });
}

/**
 * Choose whether to run in autonomous, chat, or telegram mode
 */
async function chooseMode(): Promise<"chat" | "auto" | "telegram" | "demo"> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  while (true) {
    console.log("\nAvailable modes:");
    console.log("1. chat      - Interactive chat mode");
    console.log("2. telegram  - Telegram bot mode");
    console.log("3. auto      - Autonomous action mode");
    console.log("4. demo      - Run a guided demonstration");

    const choice = (await question("\nChoose a mode (enter number or name): "))
      .toLowerCase()
      .trim();

    rl.close();

    if (choice === "1" || choice === "chat") {
      return "chat";
    } else if (choice === "2" || choice === "telegram") {
      return "telegram";
    } else if (choice === "3" || choice === "auto") {
      return "auto";
    } else if (choice === "4" || choice === "demo") {
      return "demo";
    }
    console.log("Invalid choice. Please try again.");
  }
}

/**
 * Run a guided demonstration
 */
async function runDemoMode(agent: any, config: any) {
  console.log("Starting demo mode...");
  
  const demoScenarios = [
    "Create a new language tutoring service listing with my information.",
    "Show me available services that I can book.",
    "Book the French tutoring session for tomorrow at 3 PM.",
    "Generate a secure meeting link for the French tutoring session.",
    "Mark the booking as completed and leave a 5-star review.",
    "There was an issue with the service quality. Open a dispute for partial refund."
  ];
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));
    
  try {
    for (const scenario of demoScenarios) {
      console.log(`\n[DEMO] Scenario: ${scenario}`);
      await question("Press Enter to continue with this scenario...");
      
      const stream = await agent.stream(
        { messages: [new HumanMessage(scenario)] },
        config,
      );
      
      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }
      
      await question("Press Enter to continue to the next scenario...");
    }
    
    console.log("\nDemo completed! Returning to mode selection.");
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
  } finally {
    rl.close();
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    console.log("Starting initialization...");
    const { agent, config } = await initializeAgent();
    console.log("Agent initialized successfully");

    while (true) {
      const mode = await chooseMode();
      console.log(`Selected mode: ${mode}`);

      if (mode === "chat") {
        await runChatMode(agent, config);
      } else if (mode === "telegram") {
        await runTelegramMode(agent, config);
      } else if (mode === "demo") {
        await runDemoMode(agent, config);
      } else {
        await runAutonomousMode(agent, config);
      }

      // After any mode exits, we'll loop back to mode selection
      console.log("\nReturning to mode selection...");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Fatal error:", error.message);
    }
    process.exit(1);
  }
}

main();
