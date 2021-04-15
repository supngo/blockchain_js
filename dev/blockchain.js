const sha256 = require('sha256');
const currentNodeUrl = process.argv[3];
const { v4: uuidv4 } = require('uuid');

function Blockchain() {
  this.chain = [];
  this.pendingTransactions = [];

  this.currentNodeUrl = currentNodeUrl;
  this.networkNode = [];
  this.createNewBlock(100, '0', '0'); //creating genesis block
}

Blockchain.prototype.createNewBlock = function(nonce, previousBlockHash, hash) {
  const newBlock = {
    index: this.chain.length + 1,
    timestamp: Date.now(),
    transactions: this.pendingTransactions,
    nonce: nonce,
    hash: hash,
    previousBlockHash: previousBlockHash
  };
  this.pendingTransactions = [];
  this.chain.push(newBlock);
  return newBlock;
}

Blockchain.prototype.getLastBlock = function() {
  return this.chain[this.chain.length - 1];
}

Blockchain.prototype.createNewTransaction = function(amount, sender, recipient) {
  const newTransaction = {
    amount: amount,
    sender: sender,
    recipient: recipient,
    transactionId: uuidv4().split('-').join('')
  };
  return newTransaction;
}

Blockchain.prototype.addTransactionToPendingTransactions = function(transactionObj) {
  this.pendingTransactions.push(transactionObj);
  return this.getLastBlock()['index'] + 1;
}

Blockchain.prototype.hashBlock = function(preBlockHash, currentBlockData, nonce) {
  const dataAsString = preBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
  const hash = sha256(dataAsString);
  return hash;
}

Blockchain.prototype.proofOfWork = function(preBlockHash, currentBlockData) {
  let nonce = 0;
  let hash = this.hashBlock(preBlockHash, currentBlockData, nonce);
  while (hash.substring(0,4) !== '0000') {
    nonce++;
    hash = this.hashBlock(preBlockHash, currentBlockData, nonce);
  }
  return nonce;
}

Blockchain.prototype.chainIsValid = function(blockchain) {
  let validChain = true;

  // validate if hash and transactions are valid by comparing with prev block and rehashing trans
  for (var i = 1; i < blockchain.length; i++) {
    const currentBlock = blockchain[i];
    const prevBlock = blockchain[i-1];
    const blockHash = this.hashBlock(
      prevBlock['hash'], 
      { transactions: currentBlock['transactions'], index: currentBlock['index']},
      currentBlock['nonce'])
    if (blockHash.substring(0,4) !== '0000' || currentBlock['previousBlockHash'] !== prevBlock['hash']) {
      validChain = false;
      break;
    }
  }
  // validate if genesis Block is valid
  const genesisBlock = blockchain[0];
  const correctNonce = genesisBlock['nonce'] === 100;
  const correctPrevBlockHash = genesisBlock['previousBlockHash'] === '0';
  const correctHash = genesisBlock['hash'] === '0';
  const correctTransaction = genesisBlock['transactions'].length === 0;

  if(!correctNonce || !correctPrevBlockHash || !correctHash || !correctTransaction) {
    validChain = false;
  }
  return validChain;
}

Blockchain.prototype.getBlock = function(blockHash) {
  let correctBlock = null;
  var BreakException = {};
  try {
    this.chain.forEach(block => {
      if (block.hash === blockHash){
        correctBlock = block;
        throw BreakException;
      } 
    });
  } catch (e) {
    if (e !== BreakException) throw e;
  }
  return correctBlock;
}

Blockchain.prototype.getTransaction = function(transactionId) {
  let correctTransaction = null;
  let correctBlock = null;
  var BreakException = {};
  try {
    this.chain.forEach(block => {
      block.transactions.forEach(transaction => {
        if (transaction.transactionId === transactionId){
          correctTransaction = transaction;
          correctBlock = block;
          throw BreakException;
        } 
      });
    });
  } catch (e) {
    if (e !== BreakException) throw e;
  }
  return { transaction: correctTransaction, block: correctBlock };
}

Blockchain.prototype.getAddressData = function(address) {
  let addressTransactions = [];
  let balance = 0;
  this.chain.forEach(block => {
    block.transactions.forEach(transaction => {
      if (transaction.sender === address){
        addressTransactions.push(transaction);
        balance -= transaction.amount;
      } 
      if (transaction.recipient === address){
        addressTransactions.push(transaction)
        balance += transaction.amount;
      } 
    });
  });
  return { addressTransactions: addressTransactions, balance: balance }
}

module.exports = Blockchain;