const axios = require('axios');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Function to read lines from a .txt file
function readLines(filePath) {
  const data = fs.readFileSync(filePath, 'utf8').split('\n');
  return data.map(line => line.trim()).filter(line => line !== ''); // Clean up and remove empty lines
}

// Load wallets and private keys from text files
const wallets = readLines(path.join(__dirname, 'wallet.txt'));
const privateKeys = readLines(path.join(__dirname, 'privatekey.txt'));

// Ensure the number of wallets matches the number of private keys
if (wallets.length !== privateKeys.length) {
  console.error('Number of wallets and private keys do not match!');
  process.exit(1);
}

// Mapping wallet addresses to their corresponding private keys
const walletDetails = wallets.map((wallet, index) => ({
  address: wallet,
  privateKey: privateKeys[index]
}));

// Configuration common to all wallets
const config = {
  campaignId: '30ea55e5-cf99-4f21-a577-5c304b0c61e2',
  referralCode: 'HM4fm4qfzlrB',
  privyAppId: 'clphlvsh3034xjw0fvs59mrdc'
};

// Common headers for API requests
const getBaseHeaders = (additionalHeaders = {}) => ({
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  'origin': 'https://ofc.onefootball.com',
  'referer': 'https://ofc.onefootball.com/',
  'privy-app-id': config.privyAppId,
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  ...additionalHeaders
});

// Function to add delay between API calls
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to authenticate a single wallet
async function authenticate(wallet, privateKey) {
  try {
    const configWithWallet = {
      privateKey,
      address: wallet
    };

    // Get nonce
    const { data: { nonce } } = await axios.post(
      'https://auth.privy.io/api/v1/siwe/init',
      { address: configWithWallet.address },
      {
        headers: getBaseHeaders({
          'privy-ca-id': '14435a4b-d7fe-4f46-ac46-41d5e7f0d10b',
          'privy-client': 'react-auth:1.80.0-beta-20240821191745'
        })
      }
    );
    
    console.log(`Nonce received for wallet ${wallet}:`, nonce);

    // Sign message
    const walletInstance = new ethers.Wallet(configWithWallet.privateKey);
    const message = `ofc.onefootball.com wants you to sign in with your Ethereum account:\n${configWithWallet.address}\n\nBy signing, you are proving you own this wallet and logging in. This does not initiate a transaction or cost any fees.\n\nURI: https://ofc.onefootball.com\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}\nResources:\n- https://privy.io`;
    const signature = await walletInstance.signMessage(message);

    // Authenticate
    const { data: authData } = await axios.post(
      'https://auth.privy.io/api/v1/siwe/authenticate',
      {
        chainId: 'eip155:1',
        connectorType: 'injected',
        message,
        signature,
        walletClientType: 'metamask',
      },
      { 
        headers: getBaseHeaders({
          'privy-ca-id': '14435a4b-d7fe-4f46-ac46-41d5e7f0d10b',
          'privy-client': 'react-auth:1.80.0-beta-20240821191745'
        })
      }
    );

    const { token: authToken, identity_token: privyIdToken } = authData;
    console.log(`Auth tokens received for wallet ${wallet}`);

    // Accept terms
    await axios.post(
      'https://auth.privy.io/api/v1/users/me/accept_terms',
      {},
      {
        headers: getBaseHeaders({
          'authorization': `Bearer ${authToken}`,
          'privy-ca-id': '5b4cd1f9-1285-4dda-9b01-d248d0bdec68',
          'privy-client': 'react-auth:1.80.0-beta-20240821191745'
        })
      }
    );

    // Get deform token
    const { data: { data: { userLogin: deToken } } } = await axios.post(
      'https://api.deform.cc/',
      {
        operationName: 'UserLogin',
        variables: { data: { externalAuthToken: authToken } },
        query: 'mutation UserLogin($data: UserLoginInput!) { userLogin(data: $data) }'
      },
      { 
        headers: getBaseHeaders({
          'x-apollo-operation-name': 'UserLogin'
        })
      }
    );
    
    console.log(`Deform token received for wallet ${wallet}`);

    // Verify activities
    const verifyActivityHeaders = getBaseHeaders({
      'authorization': `Bearer ${deToken}`,
      'privy-id-token': privyIdToken,
      'x-apollo-operation-name': 'VerifyActivity'
    });

    await Promise.all([
      // Verify first activity
      axios.post('https://api.deform.cc/', {
        operationName: 'VerifyActivity',
        variables: {
          data: {
            activityId: '14f59386-4b62-4178-9cd0-cc3a8feb1773',
            metadata: { referralCode: config.referralCode }
          }
        },
        query: 'mutation VerifyActivity($data: VerifyActivityInput!) { verifyActivity(data: $data) { record { id status } } }'
      }, { headers: verifyActivityHeaders }),

      // Verify second activity
      axios.post('https://api.deform.cc/', {
        operationName: 'VerifyActivity',
        variables: {
          data: { activityId: 'c326c0bb-0f42-4ab7-8c5e-4a648259b807' }
        },
        query: 'mutation VerifyActivity($data: VerifyActivityInput!) { verifyActivity(data: $data) { record { id status } } }'
      }, { headers: verifyActivityHeaders })
    ]);

    console.log(`Authentication and verification completed successfully for wallet ${wallet}`);

  } catch (error) {
    console.error(`Error for wallet ${wallet}:`, error.response?.data || error.message);
  }
}

// Function to authenticate all wallets with a delay between each
async function authenticateAll() {
  for (let i = 0; i < walletDetails.length; i++) {
    const { address, privateKey } = walletDetails[i];

    // Authenticate each wallet with a delay between each
    await authenticate(address, privateKey);

    // Delay for 2 seconds (2000 milliseconds) between each API call
    await delay(10000); // You can adjust the delay time as needed
  }

  console.log('All wallets authenticated successfully');
}

// Start the process
authenticateAll().catch(console.error);
