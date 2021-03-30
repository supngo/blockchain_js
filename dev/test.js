const Blockchain = require('./blockchain');

const bitcoin = new Blockchain();

// bitcoin.createNewBlock(123, 'REFEFEE', 'EFEK343ED');
// bitcoin.createNewTransaction(10, 'ALEXFRSFRF', 'JEN3WRFEFR');

// bitcoin.createNewBlock(232, 'FEAFEFE', 'RFRFRT232DW');

// bitcoin.createNewTransaction(10, 'ALEXFRSFRF', 'JEN3WRFEFR');
// bitcoin.createNewTransaction(10, 'ALEXFRSFRF', 'JEN3WRFEFR');
// bitcoin.createNewTransaction(10, 'ALEXFRSFRF', 'JEN3WRFEFR');

// bitcoin.createNewBlock(4353, 'THTDGDGD', 'GHTHTDGFSFSDE');
// console.log(bitcoin.chain[2]);

const prevBlockHash = 'FSFESFSFSFSFS';
const currentBlockData = [
  {
    amount: 10,
    sender: 'GDFgDGHJYEADW',
    recipient: 'GDTGFGSRFESF'
  },
  {
    amount: 20,
    sender: 'GDFgDGHJYEADW',
    recipient: 'GDTGFGSRFESF'
  },
  {
    amount: 30,
    sender: 'GDFgDGHJYEADW',
    recipient: 'GDTGFGSRFESF'
  }
];
// const nonce = 1000;
// console.log(bitcoin.hashBlock(prevBlockHash, currentBlockData, nonce));

console.log(bitcoin.proofOfWork(prevBlockHash, currentBlockData));