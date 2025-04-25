use solana_client::rpc_client::RpcClient;
use solana_program::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    system_instruction,
};
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use std::str::FromStr;

// Token creation client functions
pub struct TokenClient {
    rpc_client: RpcClient,
    payer: Keypair,
    program_id: Pubkey,
}

impl TokenClient {
    pub fn new(rpc_url: &str, payer: Keypair, program_id: &str) -> Self {
        let rpc_client = RpcClient::new(rpc_url.to_string());
        let program_id = Pubkey::from_str(program_id).unwrap();
        
        Self {
            rpc_client,
            payer,
            program_id,
        }
    }
    
    // Create and initialize a new token
    pub fn create_token(&self, name: &str, symbol: &str, decimals: u8) -> Result<Pubkey, Box<dyn std::error::Error>> {
        // Create a new account for the token
        let token_account = Keypair::new();
        let space = 200; // Space for token data
        let rent = self.rpc_client.get_minimum_balance_for_rent_exemption(space)?;
        
        // Create transaction to allocate space for the token
        let create_account_ix = system_instruction::create_account(
            &self.payer.pubkey(),
            &token_account.pubkey(),
            rent,
            space as u64,
            &self.program_id,
        );
        
        // Initialize token instruction
        let init_token_ix = Instruction {
            program_id: self.program_id,
            accounts: vec![
                AccountMeta::new(token_account.pubkey(), false),
                AccountMeta::new_readonly(solana_program::sysvar::rent::id(), false),
            ],
            data: vec![0, // Initialize token instruction
                      // In real code, we would serialize name, symbol, decimals here
                     ],
        };
        
        // Create and send transaction
        let recent_blockhash = self.rpc_client.get_latest_blockhash()?;
        let transaction = Transaction::new_signed_with_payer(
            &[create_account_ix, init_token_ix],
            Some(&self.payer.pubkey()),
            &[&self.payer, &token_account],
            recent_blockhash,
        );
        
        self.rpc_client.send_and_confirm_transaction(&transaction)?;
        
        println!("Created token: {} ({})", name, symbol);
        Ok(token_account.pubkey())
    }
    
    // Mint tokens to an account
    pub fn mint_tokens(
        &self, 
        token: &Pubkey, 
        destination: &Pubkey, 
        amount: u64
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Mint instruction
        let mint_ix = Instruction {
            program_id: self.program_id,
            accounts: vec![
                AccountMeta::new(*token, false),
                AccountMeta::new(*destination, false),
                AccountMeta::new(self.payer.pubkey(), true),
            ],
            data: vec![1, // Mint instruction
                      // In real code, we would serialize the amount here
                     ],
        };
        
        // Create and send transaction
        let recent_blockhash = self.rpc_client.get_latest_blockhash()?;
        let transaction = Transaction::new_signed_with_payer(
            &[mint_ix],
            Some(&self.payer.pubkey()),
            &[&self.payer],
            recent_blockhash,
        );
        
        self.rpc_client.send_and_confirm_transaction(&transaction)?;
        
        println!("Minted {} tokens to {}", amount, destination);
        Ok(())
    }
    
    // Transfer tokens between accounts
    pub fn transfer_tokens(
        &self,
        source: &Pubkey,
        destination: &Pubkey,
        amount: u64
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Transfer instruction
        let transfer_ix = Instruction {
            program_id: self.program_id,
            accounts: vec![
                AccountMeta::new(*source, false),
                AccountMeta::new(*destination, false),
                AccountMeta::new(self.payer.pubkey(), true),
            ],
            data: vec![2, // Transfer instruction
                      // In real code, we would serialize the amount here
                     ],
        };
        
        // Create and send transaction
        let recent_blockhash = self.rpc_client.get_latest_blockhash()?;
        let transaction = Transaction::new_signed_with_payer(
            &[transfer_ix],
            Some(&self.payer.pubkey()),
            &[&self.payer],
            recent_blockhash,
        );
        
        self.rpc_client.send_and_confirm_transaction(&transaction)?;
        
        println!("Transferred {} tokens from {} to {}", amount, source, destination);
        Ok(())
    }
}

// Example usage
pub fn main() {
    // Set up client (in real-world code, you would load keys and config properly)
    let payer = Keypair::new();
    let rpc_url = "https://api.devnet.solana.com";
    let program_id = "Your_Program_ID"; // Replace with actual program ID
    
    let client = TokenClient::new(rpc_url, payer, program_id);
    
    // Create a new token
    let token_pubkey = client.create_token("My Token", "MTK", 9).unwrap();
    
    // Create token account for a recipient
    let recipient = Keypair::new();
    
    // Mint tokens to recipient
    client.mint_tokens(&token_pubkey, &recipient.pubkey(), 1_000_000_000).unwrap();
    
    // Transfer tokens to another account
    let another_recipient = Keypair::new();
    client.transfer_tokens(&recipient.pubkey(), &another_recipient.pubkey(), 500_000_000).unwrap();
}
