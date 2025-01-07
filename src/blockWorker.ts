import { parentPort } from 'worker_threads';
import { findBlock } from './blockchain';

let isMining: boolean = false;
let minedBlocks = 0;
let blocksToMine = 0;

parentPort.on('message', (messageData) => {
  console.log('Getting message from parent')
  if (messageData.isMining !== undefined) {
    isMining = messageData.isMining;
    blocksToMine = messageData.blocksToMine;
    minedBlocks = 0;
  }
  if (isMining === true && minedBlocks < blocksToMine) {
    const newBlock = findBlock(
      messageData.blockData.index,
      messageData.blockData.previousHash,
      messageData.blockData.timestamp,
      messageData.blockData.data,
      messageData.blockData.difficulty
    );
    if (newBlock) {
      parentPort.postMessage({ success: true, block: newBlock });
    } else {
      parentPort.postMessage({ success: false, error: 'Failed to generate block' });
    }
    ++minedBlocks;
  }
});

// setInterval(() => {
//   const used = process.memoryUsage();
//   console.log({
//     rss: (used.rss / 1024 / 1024).toFixed(2) + ' MB',
//     heapTotal: (used.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
//     heapUsed: (used.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
//     external: (used.external / 1024 / 1024).toFixed(2) + ' MB',
//   });
// }, 5000);