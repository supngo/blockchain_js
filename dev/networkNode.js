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
  const blockIndex = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
  res.json({ note: `Transaction will be added in block ${blockIndex}`});
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

  bitcoin.createNewTransaction(12.5, "00", nodeAddress);

  const newBlock = bitcoin.createNewBlock(nonce, prevBlockHash, blockHash);
  res.json({
    Note: "New block mined successfully",
    block: newBlock
  });
})

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
 
app.listen(port, function() {
  console.log(`Listening to port ${port}...`);
});