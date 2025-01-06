import { parentPort } from 'worker_threads';
import { findBlock } from './blockchain';

let isMining: boolean = false;
let index = null;
let previousHash = null;
let timestamp = null;
let data = null;
let difficulty = null;

let minedBlocks = 0;
let blocksToMine = 0;

parentPort.on('message', (messageData) => {
  console.log('Getting message from parent')
  if (messageData.isMining !== undefined) {
    isMining = messageData.isMining;
    blocksToMine=messageData.blocksToMine;
    minedBlocks=0;
  }
  index = messageData.blockData.index;
  previousHash = messageData.blockData.previousHash;
  timestamp = messageData.blockData.timestamp;
  data = messageData.blockData.data;
  difficulty = messageData.blockData.difficulty;
  if(minedBlocks < blocksToMine){
    mine();
    ++minedBlocks;
  }
});

function mine() {
  if (isMining && minedBlocks < blocksToMine) {
    const newBlock = findBlock(index, previousHash, timestamp, data, difficulty);
    if (newBlock) {
      parentPort.postMessage({ success: true, block: newBlock });
    } else {
      parentPort.postMessage({ success: false, error: 'Failed to generate block' });
    }
  }
}
