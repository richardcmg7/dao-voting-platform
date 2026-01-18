#!/usr/bin/env node

/**
 * DAO Proposal Execution Daemon
 * 
 * This script runs periodically to check and execute approved proposals
 * that have passed their deadline and execution delay period.
 * 
 * Usage:
 *   node daemon.js [interval_seconds]
 * 
 * Default interval: 60 seconds
 */

const http = require('http');

const INTERVAL = parseInt(process.argv[2]) || 60; // Default 60 seconds
const API_URL = process.env.API_URL || 'http://localhost:3000/api/execute-proposals';

console.log('🤖 DAO Execution Daemon Started');
console.log(`📊 Checking every ${INTERVAL} seconds`);
console.log(`🔗 API URL: ${API_URL}\n`);

let executionCount = 0;

async function checkAndExecuteProposals() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Checking for executable proposals...`);

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (data.success) {
      if (data.executed.length > 0) {
        executionCount += data.executed.length;
        console.log(`✅ Executed ${data.executed.length} proposal(s): ${data.executed.join(', ')}`);
      } else {
        console.log('ℹ️  No proposals ready for execution');
      }

      if (data.errors.length > 0) {
        console.log(`⚠️  Errors encountered:`);
        data.errors.forEach(err => {
          console.log(`   - Proposal ${err.id}: ${err.error}`);
        });
      }
    } else {
      console.error('❌ API request failed:', data.error);
    }

    console.log(`📈 Total proposals executed: ${executionCount}\n`);
  } catch (error) {
    console.error('❌ Error connecting to API:', error.message, '\n');
  }
}

// Run immediately on start
checkAndExecuteProposals();

// Then run on interval
setInterval(checkAndExecuteProposals, INTERVAL * 1000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Daemon shutting down...');
  console.log(`📊 Total proposals executed: ${executionCount}`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Daemon shutting down...');
  console.log(`📊 Total proposals executed: ${executionCount}`);
  process.exit(0);
});
