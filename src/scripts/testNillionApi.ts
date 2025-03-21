import axios from 'axios';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import readline from 'readline';
import { createJWT, ES256KSigner } from 'did-jwt';

// Load environment variables
config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Sample data for automated testing
const sampleData = {
  serviceListing: {
    providerName: "Maria Garcia",
    providerId: "provider-123",
    serviceType: "language_lesson",
    serviceDetails: {
      title: "Spanish Language Lessons",
      description: "Learn Spanish with a native speaker. Perfect for beginners to intermediate learners.",
      durationMinutes: 60
    },
    availability: {
      date: "2023-05-15",
      startTime: "15:00",
      endTime: "18:00",
      timezone: "America/Mexico_City"
    },
    price: {
      amount: 30,
      currency: "USD"
    },
    contactInfo: "maria@example.com"
  },
  booking: {
    customerId: "customer-456",
    customerName: "John Smith",
    meetingLink: "https://meet.example.com/abcd1234",
    customerEmail: "john@example.com"
  },
  feedback: {
    customerRating: 5,
    customerFeedback: "Maria was an excellent teacher and I learned a lot in just one session.",
    agentNotes: "High satisfaction from customer. Provider delivered quality service."
  },
  dispute: {
    reason: "Lesson was shorter than advertised",
    desiredResolution: "50% refund",
    evidenceDetails: "The session lasted only 30 minutes instead of the promised 60 minutes."
  }
};

// Display info message
function displayInfo(message: string): void {
  console.log(`${colors.blue}${message}${colors.reset}`);
}

// Display success message
function displaySuccess(message: string): void {
  console.log(`${colors.green}${message}${colors.reset}`);
}

// Display error message
function displayError(message: string): void {
  console.error(`${colors.red}ERROR: ${message}${colors.reset}`);
}

// Log timestamp
function logWithTimestamp(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`${colors.magenta}[${timestamp}] ${message}${colors.reset}`);
}

// Helper function to wait for user to press any key
function waitForKeyPress(message = 'Press any key to continue...'): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${message}${colors.reset}`, () => {
      rl.close();
      resolve();
    });
  });
}

// Display bot response
function displayBotResponse(message: string): void {
  console.log(`${colors.green}Bot: ${message}${colors.reset}`);
  console.log(`${colors.yellow}-------------------${colors.reset}`);
}

/**
 * Generate a JWT token for a specific node using did-jwt library
 */
async function generateJwtToken(
  secretKey: string,
  orgDid: string,
  nodeDid: string,
  ttl: number = 3600
): Promise<string> {
  try {
    // Create signer from private key
    const hexPrivateKey = Buffer.from(secretKey, 'hex');
    const signer = ES256KSigner(hexPrivateKey);

    // Create payload
    const payload = {
      iss: orgDid,
      aud: nodeDid,
      exp: Math.floor(Date.now() / 1000) + ttl,
    };

    // Generate JWT with proper issuer and signer
    const token = await createJWT(payload, { issuer: orgDid, signer });
    return token;
  } catch (error: any) {
    throw new Error(`Failed to create JWT token: ${error.message}`);
  }
}

// Class to handle nilDB API calls
class NillionApiClient {
  private nodes: { url: string, did: string, jwt: string }[];
  private orgDid: string;

  constructor(
    nodes: { url: string, did: string, jwt: string }[], 
    orgDid: string
  ) {
    this.nodes = nodes;
    this.orgDid = orgDid;
  }

  // Make a request to each node and collect responses
  private async makeRequestToNodes(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE', 
    data?: any
  ): Promise<any[]> {
    const results = [];
    
    for (const node of this.nodes) {
      try {
        const url = `${node.url}${endpoint}`;
        logWithTimestamp(`Making ${method} request to ${url}`);
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${node.jwt}`
        };

        const response = await axios({
          method,
          url,
          headers,
          data: data ? JSON.stringify(data) : undefined
        });

        logWithTimestamp(`Response from ${node.url}: ${response.status}`);
        displaySuccess(`${method} to ${endpoint} successful for node ${node.url}`);
        
        results.push({
          status: response.status,
          data: response.data,
          node
        });
      } catch (error: any) {
        const errorMessage = error.response ? 
          `${error.message}: ${JSON.stringify(error.response.data)}` : 
          error.message;
        
        displayError(`Failed to ${method} ${endpoint} from ${node.url}: ${errorMessage}`);
        
        results.push({
          status: error.response?.status || 500,
          error: error.response?.data || { message: error.message },
          node
        });
      }
    }
    
    return results;
  }

  // Check health of nodes
  async checkNodesHealth(): Promise<boolean> {
    let allHealthy = true;
    
    for (const node of this.nodes) {
      try {
        const url = `${node.url}/health`;
        logWithTimestamp(`Checking health of node ${node.url}`);
        
        const response = await axios.get(url);
        
        if (response.status === 200) {
          displaySuccess(`Node ${node.url} is healthy`);
        } else {
          displayError(`Node ${node.url} returned unexpected status: ${response.status}`);
          allHealthy = false;
        }
      } catch (error: any) {
        displayError(`Failed to check health of node ${node.url}: ${error.message}`);
        allHealthy = false;
      }
    }
    
    return allHealthy;
  }

  // Get node details
  async getNodeDetails(): Promise<any[]> {
    const results = [];
    
    for (const node of this.nodes) {
      try {
        const url = `${node.url}/about`;
        logWithTimestamp(`Getting details for node ${node.url}`);
        
        const response = await axios.get(url);
        
        displaySuccess(`Got details for node ${node.url}`);
        displayInfo(`Node DID: ${response.data.did}`);
        displayInfo(`Node Public Key: ${response.data.publicKey}`);
        
        results.push({
          status: response.status,
          data: response.data,
          node
        });
      } catch (error: any) {
        displayError(`Failed to get details for node ${node.url}: ${error.message}`);
        
        results.push({
          status: error.response?.status || 500,
          error: error.response?.data || { message: error.message },
          node
        });
      }
    }
    
    return results;
  }

  // Get schemas
  async getSchemas(): Promise<any[]> {
    return this.makeRequestToNodes('/api/v1/schemas', 'GET');
  }

  // Upload data
  async uploadData(data: any[]): Promise<any[]> {
    // Make sure each record has the schema ID
    const requestData = {
      data
    };
    
    return this.makeRequestToNodes('/api/v1/data/create', 'POST', requestData);
  }

  // Read data
  async readData(query: any): Promise<any[]> {
    return this.makeRequestToNodes('/api/v1/data/read', 'POST', query);
  }

  // Add additional API methods as needed...
}

async function main() {
  try {
    displayInfo('=== NILLION API TEST SCRIPT ===');
    displayInfo('This script tests direct interactions with the Nillion API');
    displayInfo('Each step will test a different API endpoint with actual data');
    displayInfo('Sample data will be automatically provided for all required fields');
    console.log(`${colors.yellow}-------------------${colors.reset}`);
    
    await waitForKeyPress('Press any key to start the test script...');
    
    // Verify environment variables
    if (!process.env.SV_ORG_DID || !process.env.SV_PRIVATE_KEY || 
        !process.env.SCHEMA_ID_SERVICE_LISTING || 
        !process.env.SCHEMA_ID_BOOKING || 
        !process.env.SCHEMA_ID_FEEDBACK) {
      displayError('Required environment variables are missing.');
      displayError('Make sure all Nillion SecretVault variables are set in your .env file.');
      process.exit(1);
    }
    
    // Store schema IDs for ease of use
    const SERVICE_LISTING_SCHEMA_ID = process.env.SCHEMA_ID_SERVICE_LISTING as string;
    const BOOKING_SCHEMA_ID = process.env.SCHEMA_ID_BOOKING as string;
    const FEEDBACK_SCHEMA_ID = process.env.SCHEMA_ID_FEEDBACK as string;
    
    // Log schema IDs for verification
    displayInfo(`Using Service Listing Schema ID: ${SERVICE_LISTING_SCHEMA_ID}`);
    displayInfo(`Using Booking Schema ID: ${BOOKING_SCHEMA_ID}`);
    displayInfo(`Using Feedback Schema ID: ${FEEDBACK_SCHEMA_ID}`);
    
    // Hard-coded node configuration from the provided user info
    const nodeConfigs = [
      {
        url: 'https://nildb-nx8v.nillion.network',
        did: 'did:nil:testnet:nillion1qfrl8nje3nvwh6cryj63mz2y6gsdptvn07nx8v',
      },
      {
        url: 'https://nildb-p3mx.nillion.network',
        did: 'did:nil:testnet:nillion1uak7fgsp69kzfhdd6lfqv69fnzh3lprg2mp3mx',
      },
      {
        url: 'https://nildb-rugk.nillion.network',
        did: 'did:nil:testnet:nillion1kfremrp2mryxrynx66etjl8s7wazxc3rssrugk',
      }
    ];

    // Organization credentials
    const orgDid = process.env.SV_ORG_DID || 'did:nil:testnet:nillion1h83dct4xg7g07jqwznzpkazr8t9llxzq6ucu7a';
    const secretKey = process.env.SV_PRIVATE_KEY || 'a1ebdb67d81c455e3f06b01a504cbc31b81c11c2aaff8331e160a56ddd090b21';
    
    displayInfo('Generating JWT tokens for API access...');
    
    // Check for existing JWT tokens in environment variables
    const useExistingTokens = process.env.SV_NODE1_JWT && process.env.SV_NODE2_JWT && process.env.SV_NODE3_JWT;
    
    let nodes;
    if (useExistingTokens) {
      displayInfo('Using JWT tokens from environment variables');
      nodes = [
        {
          ...nodeConfigs[0],
          jwt: process.env.SV_NODE1_JWT!
        },
        {
          ...nodeConfigs[1],
          jwt: process.env.SV_NODE2_JWT!
        },
        {
          ...nodeConfigs[2],
          jwt: process.env.SV_NODE3_JWT!
        }
      ];
    } else {
      displayInfo('Generating new JWT tokens - they will expire in 1 hour');
      // Generate tokens for all nodes
      const node1Token = await generateJwtToken(secretKey, orgDid, nodeConfigs[0].did, 3600);
      const node2Token = await generateJwtToken(secretKey, orgDid, nodeConfigs[1].did, 3600);
      const node3Token = await generateJwtToken(secretKey, orgDid, nodeConfigs[2].did, 3600);
      
      nodes = [
        {
          ...nodeConfigs[0],
          jwt: node1Token
        },
        {
          ...nodeConfigs[1],
          jwt: node2Token
        },
        {
          ...nodeConfigs[2],
          jwt: node3Token
        }
      ];
    }

    // Initialize API client
    const nillionApi = new NillionApiClient(nodes, orgDid);
    
    // Test 1: Check health of all nodes
    displayInfo('[TEST 1] Checking health of all nodes...');
    const allNodesHealthy = await nillionApi.checkNodesHealth();
    
    if (allNodesHealthy) {
      displaySuccess('All nodes are healthy');
    } else {
      displayError('Some nodes are not healthy');
    }
    
    await waitForKeyPress();
    
    // Test 2: Get node details
    displayInfo('[TEST 2] Getting node details...');
    const nodeDetails = await nillionApi.getNodeDetails();
    displayInfo(`Retrieved details for ${nodeDetails.length} nodes`);
    
    await waitForKeyPress();
    
    // Test 3: Get schemas
    displayInfo('[TEST 3] Getting schemas...');
    const schemas = await nillionApi.getSchemas();
    displayInfo(`Retrieved ${schemas.length} schema responses`);
    
    // Log one successful response if available
    const successfulSchema = schemas.find(s => s.status >= 200 && s.status < 300);
    if (successfulSchema) {
      displayInfo(`Schema data example: ${JSON.stringify(successfulSchema.data, null, 2)}`);
    }
    
    await waitForKeyPress();
    
    // Test 4: Create a service listing
    displayInfo('[TEST 4] Creating a service listing...');
    
    // Prepare the service listing data
    const serviceId = uuidv4();
    logWithTimestamp(`Generated Service ID: ${serviceId}`);
    
    const serviceListingData = {
      _id: serviceId,
      schema: SERVICE_LISTING_SCHEMA_ID, // Explicitly include schema ID
      provider_name: { '%allot': sampleData.serviceListing.providerName },
      provider_id: { '%allot': sampleData.serviceListing.providerId },
      service_type: sampleData.serviceListing.serviceType,
      service_details: {
        title: sampleData.serviceListing.serviceDetails.title,
        description: sampleData.serviceListing.serviceDetails.description,
        duration_minutes: sampleData.serviceListing.serviceDetails.durationMinutes
      },
      availability: {
        date: sampleData.serviceListing.availability.date,
        start_time: sampleData.serviceListing.availability.startTime,
        end_time: sampleData.serviceListing.availability.endTime,
        timezone: sampleData.serviceListing.availability.timezone
      },
      price: {
        amount: sampleData.serviceListing.price.amount,
        currency: sampleData.serviceListing.price.currency
      },
      contact_info: { '%allot': sampleData.serviceListing.contactInfo },
      status: 'available'
    };
    
    // Upload the service listing
    const serviceListingResult = await nillionApi.uploadData([serviceListingData]);
    
    // Check for success
    const successfulServiceCreation = serviceListingResult.some(res => 
      res.status >= 200 && res.status < 300 && 
      res.data && res.data.created && res.data.created.length > 0
    );
    
    if (successfulServiceCreation) {
      displaySuccess(`Service listing created successfully with ID: ${serviceId}`);
      
      // Display bot response
      displayBotResponse(`Service listing created successfully!
Service ID: ${serviceId}
Title: ${sampleData.serviceListing.serviceDetails.title}
Price: ${sampleData.serviceListing.price.amount} ${sampleData.serviceListing.price.currency}
Duration: ${sampleData.serviceListing.serviceDetails.durationMinutes} minutes`);
    } else {
      displayError('Service listing creation failed');
      displayInfo(`Response received: ${JSON.stringify(serviceListingResult, null, 2)}`);
    }
    
    await waitForKeyPress();
    
    // Test 5: Query service listings
    displayInfo('[TEST 5] Querying service listings...');
    
    // Prepare query
    const query = {
      schema: SERVICE_LISTING_SCHEMA_ID, // Include schema ID in query
      service_type: sampleData.serviceListing.serviceType,
      status: 'available'
    };
    
    // Execute the query
    const queryResults = await nillionApi.readData(query);
    
    // Check for successful results
    const successfulQueryResults = queryResults.filter(res => 
      res.status >= 200 && res.status < 300 && 
      res.data && Array.isArray(res.data)
    );
    
    if (successfulQueryResults.length > 0) {
      // Collect and merge results from all nodes
      const listings = successfulQueryResults.reduce((merged, result) => {
        if (Array.isArray(result.data)) {
          merged.push(...result.data);
        }
        return merged;
      }, []);
      
      displaySuccess(`Found ${listings.length} service listings`);
      
      if (listings.length > 0) {
        // Format listings for display
        const formattedListings = listings.map((listing: any) => {
          return {
            id: listing._id,
            title: listing.service_details?.title || 'Unknown title',
            price: `${listing.price?.amount || '?'} ${listing.price?.currency || '?'}`,
            duration: listing.service_details?.duration_minutes || 'Unknown duration'
          };
        });
        
        displayBotResponse(`Found ${formattedListings.length} language lessons:
${JSON.stringify(formattedListings, null, 2)}`);
      } else {
        displayBotResponse('No service listings found matching your criteria.');
      }
    } else {
      displayError('Query failed for all nodes');
      displayInfo(`Response received: ${JSON.stringify(queryResults, null, 2)}`);
    }
    
    // Final summary
    console.log(`${colors.yellow}-------------------${colors.reset}`);
    displaySuccess('API test script completed');
    displayInfo('The script has tested:');
    displayInfo('1. Checking node health');
    displayInfo('2. Getting node details');
    displayInfo('3. Getting schemas');
    displayInfo('4. Creating a service listing');
    displayInfo('5. Querying service listings');
    
  } catch (error: any) {
    displayError(`Test script failed: ${error.message}`);
    if (error.stack) {
      displayError(error.stack);
    }
    process.exit(1);
  }
}

main(); 