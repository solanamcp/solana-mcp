# Solana Token Contract

This project demonstrates how to create and deploy an SPL token on Solana blockchain.

## Overview

The project consists of:

1. `spl_token_contract.rs` - A custom Solana program that implements token functionality
2. `token_client.rs` - A client for interacting with the token program

## Prerequisites

- Rust and Cargo installed
- Solana CLI tools installed
- A Solana wallet with SOL for paying transaction fees

## Building and Deploying

### Build the program

```bash
# In the project root directory
cargo build-bpf --manifest-path=/path/to/Cargo.toml
```

### Deploy to Solana

```bash
solana program deploy ./target/deploy/spl_token_contract.so
```

Note the program ID that is returned after deployment. You'll need this to interact with your token program.

## Using the Solana Token

### Creating a Token

Instead of creating a custom token program from scratch, it's recommended to use the official SPL Token program for production tokens. This example shows how to create an SPL token:

```bash
# Create a new token mint
solana-keygen new -o token_mint.json
spl-token create-token token_mint.json

# Create a token account
spl-token create-account <TOKEN_MINT_ADDRESS>

# Mint some tokens
spl-token mint <TOKEN_MINT_ADDRESS> <AMOUNT> <RECIPIENT_TOKEN_ACCOUNT>
```

### Using the Client

To use the provided token client:

1. Update the program ID in the `main` function of `token_client.rs`
2. Set up your payer keypair
3. Run the client:

```bash
cargo run --bin token_client
```

## Token Properties

When creating your SPL token, you can set:

- **Name**: The name of your token
- **Symbol**: The ticker symbol (usually 3-4 characters)
- **Decimals**: Number of decimal places (typically 9 for Solana)
- **Supply**: Initial and maximum supply of tokens

## Best Practices

For production tokens, consider:

1. Using the official SPL Token program rather than a custom implementation
2. Setting up token metadata using Metaplex standards
3. Implementing proper authority management for minting and freezing
4. Thorough testing on testnet before mainnet deployment
