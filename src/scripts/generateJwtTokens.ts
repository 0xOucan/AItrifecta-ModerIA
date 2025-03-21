import { config } from 'dotenv';
import { createJWT, ES256KSigner } from 'did-jwt';

// Load environment variables
config();

// Define node configs
const nodes = [
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
  },
];

// Define organization credentials
const orgCredentials = {
  secretKey: process.env.SV_PRIVATE_KEY || 'a1ebdb67d81c455e3f06b01a504cbc31b81c11c2aaff8331e160a56ddd090b21',
  orgDid: process.env.SV_ORG_DID || 'did:nil:testnet:nillion1h83dct4xg7g07jqwznzpkazr8t9llxzq6ucu7a',
};

/**
 * Create a JWT token for a specific node using did-jwt library
 */
async function createJwtToken(
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

/**
 * Generate JWT tokens for all nodes
 */
async function generateAllTokens(): Promise<Record<string, string>> {
  const tokens: Record<string, string> = {};
  
  for (const node of nodes) {
    const token = await createJwtToken(
      orgCredentials.secretKey,
      orgCredentials.orgDid,
      node.did
    );
    tokens[node.did] = token;
  }
  
  return tokens;
}

async function main() {
  try {
    console.log('Nillion JWT Token Generator');
    console.log('---------------------------');
    console.log('Organization DID:', orgCredentials.orgDid);
    
    console.log('\nGenerating tokens for all nodes...');
    const tokens = await generateAllTokens();
    
    console.log('\n🪙 API Tokens:');
    for (const [nodeDid, token] of Object.entries(tokens)) {
      const node = nodes.find(n => n.did === nodeDid);
      console.log(`\nNode: ${node?.url}`);
      console.log(`DID: ${nodeDid}`);
      console.log(`Token: ${token}`);
    }
    
    console.log('\nTokens will expire in 1 hour.');
    console.log('Add these tokens to your .env file:');
    const nodeNames = ['SV_NODE1_JWT', 'SV_NODE2_JWT', 'SV_NODE3_JWT'];
    let i = 0;
    
    for (const [nodeDid, token] of Object.entries(tokens)) {
      if (i < nodeNames.length) {
        console.log(`\n${nodeNames[i]}=${token}`);
        i++;
      }
    }
  } catch (error: any) {
    console.error('❌ Failed to generate tokens:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main(); 