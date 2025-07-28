const axios = require('axios');
const { ethers } = require('ethers');

// Configuration
const config = {
  privateKey: '0xef26ef771d0d0d18604f440349e0c72d5457b8870573de9739bdda96bd41cb6a', // ADD Your Ethereum private key
  address: '0x25E7208cbb99F7FEC6dAA6165E08f2beb3857601', // ADD Your Ethereum address
  campaignId: '30ea55e5-cf99-4f21-a577-5c304b0c61e2',
  referralCode: 'zYOSb638vGZC', // ADD your referral code
  privyAppId: 'clphlvsh3034xjw0fvs59mrdc'
};


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

async function authenticate() {
  try {
    
    const { data: { nonce } } = await axios.post(
      'https://auth.privy.io/api/v1/siwe/init',
      { address: config.address },
      {
        headers: getBaseHeaders({
          'privy-ca-id': '14435a4b-d7fe-4f46-ac46-41d5e7f0d10b',
          'privy-client': 'react-auth:1.80.0-beta-20240821191745'
        })
      }
    );
    
    console.log('Nonce received:', nonce);

    
    const wallet = new ethers.Wallet(config.privateKey);
    const message = `ofc.onefootball.com wants you to sign in with your Ethereum account:\n${config.address}\n\nBy signing, you are proving you own this wallet and logging in. This does not initiate a transaction or cost any fees.\n\nURI: https://ofc.onefootball.com\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}\nResources:\n- https://privy.io`;
    const signature = await wallet.signMessage(message);

    
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
    console.log('Auth tokens received');

    
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
    
    console.log('Deform token received');

    
    const verifyActivityHeaders = getBaseHeaders({
      'authorization': `Bearer ${deToken}`,
      'privy-id-token': privyIdToken,
      'x-apollo-operation-name': 'VerifyActivity'
    });

    await Promise.all([
      
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

      
      axios.post('https://api.deform.cc/', {
        operationName: 'VerifyActivity',
        variables: {
          data: { activityId: 'c326c0bb-0f42-4ab7-8c5e-4a648259b807' }
        },
        query: 'mutation VerifyActivity($data: VerifyActivityInput!) { verifyActivity(data: $data) { record { id status } } }'
      }, { headers: verifyActivityHeaders })
    ]);

    console.log('Authentication and verification completed successfully');

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

authenticate();
