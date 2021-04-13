const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const { v4: uuidv4 } = require('uuid');
const rp = require('request-promise');

const port = process.argv[2];
const nodeAddress = uuidv4().split('-').join('');
const bitcoin = new Blockchain();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
 
app.get('/blockchain', function (req, res) {
  res.send(bitcoin);
});

app.post('/transaction', function (req, res) {
  const newTransaction = req.body;
  const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction);
  res.json({ note: `Transaction will be added in block ${blockIndex}.`});
});

app.post('/transaction/broadcast', function (req, res) {
  const newTransaction = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
  bitcoin.addTransactionToPendingTransactions(newTransaction);
  const regNodePromises = [];
  bitcoin.networkNode.forEach(networkNodeUrl => {
    const requestOptions = {
      uri: networkNodeUrl + '/transaction',
      method: 'POST',
      body: newTransaction,
      json: true
    };
    regNodePromises.push(rp(requestOptions));  
  });
  Promise.all(regNodePromises).then(data => {
    res.json({ note: 'Transaction created and broadcasted successfully.'});
  });
});

app.get('/mine', function (req, res) {
  const lastBlock = bitcoin.getLastBlock();
  const prevBlockHash = lastBlock['hash'];

  const currentBlockData = {
    transactions: bitcoin.pendingTransactions,
    index: lastBlock['index'] + 1
  }
  const nonce = bitcoin.proofOfWork(prevBlockHash, currentBlockData);
  const blockHash = bitcoin.hashBlock(prevBlockHash, currentBlockData, nonce);
  const newBlock = bitcoin.createNewBlock(nonce, prevBlockHash, blockHash);

  const regNodePromises = [];
  bitcoin.networkNode.forEach(networkNodeUrl => {
    const requestOptions = {
      uri: networkNodeUrl + '/receive-new-block',
      method: 'POST',
      body: newBlock,
      json: true
    };
    regNodePromises.push(rp(requestOptions));  
  });
  Promise.all(regNodePromises).then(data => {
    const bulkOptions = {
      uri: bitcoin.currentNodeUrl + '/transaction/broadcast',
      method: 'POST',
      body: { 
        amount: 12.5,
        sender: "00",
        recipient: nodeAddress
      },
      json: true
    };
    rp(bulkOptions);
  }).then(data => {
    res.json({
      Note: "New block mined successfully",
      block: newBlock
    });
  });
});

app.post('/receive-new-block', (req, res) => {
  const newBlock = req.body;
  const lastBlock = bitcoin.getLastBlock();
  const correctHash = lastBlock.hashBlock === newBlock.prevBlockHash;
  const correctIndex = lastBlock['index'] + 1 === newBlock['index'];
  if (correctHash & correctIndex) {
    bitcoin.chain.push(newBlock);
    bitcoin.pendingTransactions = [];
    res.json({
      Note: "New blocked received and accepted",
      newBlock: newBlock
    });
  } else {
    res.json({
      Note: "New blocked rejected",
      newBlock: newBlock
    });
  }
 });

app.post('/register-and-boardcast-node', (req, res) => {
  const newNodeUrl = req.body.newNodeUrl;
  if(bitcoin.networkNode.indexOf(newNodeUrl) == -1) {
    bitcoin.networkNode.push(newNodeUrl);
  }

  const regNodePromises = [];
  bitcoin.networkNode.forEach(networkNodeUrl => {
    const requestOption = {
      uri: networkNodeUrl + '/register-node',
      method: 'POST',
      body: { newNodeUrl: newNodeUrl },
      json: true
    };
    regNodePromises.push(rp(requestOption));
  });

  Promise.all(regNodePromises).then(data => {
    const bulkRegisterOptions = {
      uri: newNodeUrl + '/register-nodes-bulk',
      method: 'POST',
      body: { allNetworkNodes: [ ...bitcoin.networkNode, bitcoin.currentNodeUrl] },
      json: true
    };
    rp(bulkRegisterOptions);
  }).then(data => {
    res.json({ note: 'New Node registered with the Network successfully.'});
  });
});

app.post('/register-node', function(req, res) {
  const newNodeUrl = req.body.newNodeUrl;
  if (!bitcoin.networkNode.includes(newNodeUrl) && bitcoin.currentNodeUrl != newNodeUrl) {
    bitcoin.networkNode.push(newNodeUrl);
  }
  res.json({ note: 'New Node registered successfully.'});
});

app.post('/register-nodes-bulk', function(req, res) {
  const allNetworkNodes = req.body.allNetworkNodes;
  allNetworkNodes.forEach(networkNodeUrl => {
    if (!bitcoin.networkNode.includes(networkNodeUrl) && bitcoin.currentNodeUrl !== networkNodeUrl ) {
      bitcoin.networkNode.push(networkNodeUrl);
    }
  });
  res.json({ note: 'Bulk registration successfully.'});
});

app.get('/consensus', function (req, res) {
  const regNodePromises = [];
  bitcoin.networkNode.forEach(networkNodeUrl => {
    const requestOption = {
      uri: networkNodeUrl + '/blockchain',
      method: 'GET',
      json: true
    };
    regNodePromises.push(rp(requestOption));
  });
  Promise.all(regNodePromises).then(blockchains => {
    let maxChainLength = bitcoin.chain.length;
    let newLongestChain = null;
    let newPendingTransactions = null;
    blockchains.forEach(blockchain => {
      if (blockchain.chain.length > maxChainLength) {
        maxChainLength = blockchain.chain.length;
        newLongestChain = blockchain.chain;
        newPendingTransactions = blockchain.pendingTransactions;
      }
    });
    
    // This chain is up to date
    if (!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))) {
      res.json({ 
        note: 'This chain has not been replaced.',
        chain: bitcoin.chain
      });
    } else { // this chain is not up to date, need to update
      bitcoin.chain = newLongestChain;
      bitcoin.pendingTransactions = newPendingTransactions;
      res.json({ 
        note: 'This chain has been replaced.',
        chain: bitcoin.chain
      });
    }
  })
});
 
app.listen(port, function() {
  console.log(`Listening to port ${port}...`);
});