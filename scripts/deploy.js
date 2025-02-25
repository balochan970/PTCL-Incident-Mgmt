#!/usr/bin/env node

/**
 * Firebase Hosting Deployment Script
 * 
 * This script automates the process of building and deploying to Firebase Hosting.
 * It can be used locally to mirror what the GitHub Actions workflow does.
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * Execute a command and log the output
 */
function executeCommand(command, errorMessage) {
  try {
    console.log(`${colors.cyan}> ${command}${colors.reset}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`${colors.red}${errorMessage || 'Command failed'}${colors.reset}`);
    console.error(error.message);
    return false;
  }
}

/**
 * Main deployment function
 */
async function deploy() {
  console.log(`\n${colors.bright}${colors.green}=== Firebase Hosting Deployment ====${colors.reset}\n`);
  
  // Check if user is logged in to Firebase
  try {
    execSync('firebase projects:list', { stdio: 'pipe' });
    console.log(`${colors.green}✓ Firebase CLI is authenticated${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}! You need to log in to Firebase first${colors.reset}`);
    if (!executeCommand('firebase login', 'Failed to log in to Firebase')) {
      return;
    }
  }
  
  // Ask for confirmation
  rl.question(`${colors.yellow}Are you sure you want to deploy to Firebase Hosting? (y/n) ${colors.reset}`, (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log(`${colors.yellow}Deployment cancelled${colors.reset}`);
      rl.close();
      return;
    }
    
    // Start deployment process
    console.log(`\n${colors.green}Starting deployment process...${colors.reset}\n`);
    
    // Install dependencies if needed
    if (!executeCommand('npm ci', 'Failed to install dependencies')) {
      rl.close();
      return;
    }
    
    // Run linting
    if (!executeCommand('npm run lint', 'Linting failed')) {
      rl.close();
      return;
    }
    
    // Build the Next.js app
    if (!executeCommand('npm run build', 'Build failed')) {
      rl.close();
      return;
    }
    
    // Deploy to Firebase Hosting
    if (!executeCommand('firebase deploy --only hosting', 'Deployment failed')) {
      rl.close();
      return;
    }
    
    console.log(`\n${colors.bright}${colors.green}✓ Deployment completed successfully!${colors.reset}\n`);
    rl.close();
  });
}

// Start the deployment process
deploy(); 