# ModerIA: AI-Powered Service Marketplace with Encrypted Data

ModerIA is an AI agent that helps connect service providers with customers while ensuring sensitive information remains secure using Nillion's SecretVault technology.


## 🔒 Features

### Secure Data Management

- **Private Information Storage**: All sensitive data is encrypted using Nillion's SecretVault
- **Distributed Security**: Data is split across multiple nodes for enhanced protection
- **Selective Sharing**: Only authorized parties can access specific information

### Service Marketplace

- **Service Listings**: Providers can create service listings with encrypted contact details
- **Booking Management**: Secure booking system with encrypted customer information
- **Meeting Coordination**: Generate and share encrypted meeting links

### Feedback and Resolution

- **Two-way Feedback**: Both providers and customers can leave feedback
- **Dispute Resolution**: AI agent helps mediate disputes with encrypted agent notes
- **Fair Compensation**: Resolution system for handling service quality issues

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+) and npm
- Nillion SecretVault organization account
- OpenAI API key for the AI agent

### Installation

1. Clone this repository
   ```bash
   git clone https://github.com/yourusername/ModerIA.git
   cd ModerIA
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create your environment file
   ```bash
   cp .env.example .env
   ```

4. Update your `.env` file with your credentials:
   - OpenAI API key
   - Nillion SecretVault organization credentials (SV_ORG_DID, SV_PRIVATE_KEY)
   - Nillion SecretVault node URLs and DIDs for all three nodes
   - Wallet private key (for blockchain interactions)

5. Initialize Nillion SecretVault schemas
   ```bash
   npm run create-schemas
   ```
   
   This script will:
   - Create three schemas in your Nillion SecretVault: Service Listing, Booking, and Feedback
   - Return the schema IDs for each schema
   - Instruct you to add these IDs to your .env file

6. Add the schema IDs to your `.env` file:
   ```
   SCHEMA_ID_SERVICE_LISTING="your-service-listing-schema-id"
   SCHEMA_ID_BOOKING="your-booking-schema-id"
   SCHEMA_ID_FEEDBACK="your-feedback-schema-id"
   ```

7. Build the project
   ```bash
   npm run build
   ```

## 🔧 Usage

ModerIA can be run in several modes:

1. **Chat Mode**: Interactive command-line interface
   ```bash
   npm run start
   ```
   Then select "chat" from the menu.

2. **Telegram Bot**: Interface through Telegram messenger
   ```bash
   npm run start
   ```
   Then select "telegram" from the menu. Requires a Telegram Bot token.

3. **Autonomous Mode**: AI agent operates independently, managing the marketplace
   ```bash
   npm run start
   ```
   Then select "auto" from the menu.

4. **Demo Mode**: Guided demonstration of the key features
   ```bash
   npm run start
   ```
   Then select "demo" from the menu.

## 🔐 Nillion SecretVault Implementation

ModerIA uses Nillion's SecretVault to implement a secure service marketplace:

1. **Schema Initialization**: Three schemas are created for storing data:
   - Service Listings: Details about services with encrypted provider information
   - Bookings: Appointments with encrypted customer details
   - Feedback: Service quality feedback with encrypted agent notes

2. **Encryption Pattern**: ModerIA uses the `%allot` pattern to mark fields for encryption:
   ```javascript
   // Example of marking data for encryption
   const serviceData = {
     provider_name: { '%allot': 'John Doe' }, // Will be encrypted
     service_type: 'Language Tutoring',       // Will remain unencrypted
   };
   ```

3. **Multi-Node Security**: Data is securely distributed across multiple Nillion nodes, with each node seeing:
   - Complete unencrypted data for fields not marked with `%allot`
   - Only a single share of encrypted data for sensitive fields
   - No ability to reconstruct the original data without collaborating with other nodes

4. **UUID Generation**: Each record in the system gets a unique identifier, which helps with referencing and retrieval.

## 📚 Documentation

For more information about the technologies used:

- [Nillion SecretVault Documentation](https://docs.nillion.com/build/secret-vault-quickstart)
- [AgentKit Documentation](https://docs.agentkit.ai/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
