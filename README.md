# 📸 Locket Social DApp

Locket Social DApp is a decentralized Web3 social application inspired by Locket. It allows users to capture moments, share them with friends, and permanently verify their digital memories on the blockchain.

With Locket Social DApp, users can mint their favorite photos as **Collectible Moment NFTs** and commemorate their connections through **Friendship Milestone NFTs**.

## ✨ Features

- **📸 Capture & Share**: Take photos directly from your web browser or upload from your gallery.
- **👫 Friends System**: Add friends and view their moments in a seamless, vertical scroll feed.
- **💎 NFT Collectibles**: Mint your posts as non-fungible tokens on the Ethereum blockchain (Sepolia Testnet) to prove original ownership.
- **🤝 Friendship Milestones**: Celebrate your social connections by minting Friendship NFTs.
- **🏆 Achievement Showcase**: Display your minted NFTs and milestones on your personal profile.
- **🔗 On-Chain Verification**: Every moment is hashed and can be verified transparently on-chain.

## 🏗️ Technology Stack

- **Frontend**: React.js, Context API, CSS (Responsive Mobile-first Design)
- **Backend**: Node.js, Express.js, PostgreSQL
- **Blockchain**: Solidity, Hardhat, Ethers.js
- **Storage**: Cloudinary (for fast image delivery)
- **Deployment**: Docker, Docker Compose, Nginx

## 🚀 Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) (for local blockchain development)
- A [Cloudinary](https://cloudinary.com/) account
- An [Alchemy](https://www.alchemy.com/) account (for Sepolia RPC)

### Installation

1. **Clone the repository** (or navigate to the project directory).

2. **Configure Environment Variables**
   Copy the `.env.example` file to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
   *Make sure to configure your Cloudinary API keys and Ethereum Wallet private keys.*

3. **Start the Application**
   Run the following command to build and start the PostgreSQL database, Backend API, and Frontend Web server:
   ```bash
   npm run docker:up
   ```

4. **Access the Application**
   - Frontend Web App: `http://localhost:3000`
   - Backend API: `http://localhost:4000`

### 🛑 Stopping the Application
To stop the Docker containers, run:
```bash
npm run docker:down
```

## ⛓️ Blockchain Development (Hardhat)

If you wish to modify or redeploy the smart contracts:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile contracts:
   ```bash
   npm run blockchain:compile
   ```

3. Deploy to Sepolia Testnet:
   ```bash
   npm run blockchain:deploy:sepolia
   npm run blockchain:deploy:proof:sepolia
   npm run blockchain:deploy:collectible:sepolia
   npm run blockchain:deploy:milestone:sepolia
   ```

## 🗄️ Database

The database schema and initial mock data are located in `backend/sql/init.sql`. When you run `docker compose up`, PostgreSQL will automatically initialize using this file if the database is empty.

## 📄 License

This project was developed as a major assignment for a Master's degree in Blockchain.
