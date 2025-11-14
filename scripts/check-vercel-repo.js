#!/usr/bin/env node

/**
 * Vercel Repository Verification Script
 * Checks if Vercel is configured to deploy from the correct GitHub repository
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EXPECTED_REPO = 'mel-koku/koku-travel';
const EXPECTED_REPO_URL = 'https://github.com/mel-koku/koku-travel.git';
const EXPECTED_BRANCH = 'main';

console.log('🔍 Vercel Configuration Verification\n');
console.log('=====================================\n');

// Check git remote
console.log('📋 Checking Git Configuration...\n');
try {
  const gitRemote = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
  console.log(`✅ Git Remote: ${gitRemote}`);
  
  // Normalize the URL for comparison
  const normalizedRemote = gitRemote
    .replace(/^git@github.com:/, 'https://github.com/')
    .replace(/\.git$/, '');
  
  const expectedNormalized = EXPECTED_REPO_URL.replace(/\.git$/, '');
  
  if (normalizedRemote.includes(EXPECTED_REPO) || gitRemote.includes(EXPECTED_REPO)) {
    console.log(`✅ Repository matches expected: ${EXPECTED_REPO}\n`);
  } else {
    console.log(`⚠️  Repository may not match expected: ${EXPECTED_REPO}\n`);
  }
} catch (error) {
  console.log('❌ Could not read git remote\n');
}

// Check current branch
try {
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  console.log(`📍 Current Branch: ${currentBranch}`);
  if (currentBranch === EXPECTED_BRANCH) {
    console.log(`✅ On production branch: ${EXPECTED_BRANCH}\n`);
  } else {
    console.log(`ℹ️  On branch: ${currentBranch} (production branch is: ${EXPECTED_BRANCH})\n`);
  }
} catch (error) {
  console.log('⚠️  Could not determine current branch\n');
}

// Check if Vercel CLI is available
console.log('🔧 Checking Vercel CLI...\n');
try {
  const vercelVersion = execSync('vercel --version', { encoding: 'utf-8' }).trim();
  console.log(`✅ Vercel CLI: ${vercelVersion}\n`);
  
  // Check if logged in
  try {
    const vercelUser = execSync('vercel whoami', { encoding: 'utf-8' }).trim();
    console.log(`👤 Logged in as: ${vercelUser}\n`);
    
    // Check if project is linked
    const vercelProjectPath = path.join(process.cwd(), '.vercel', 'project.json');
    if (fs.existsSync(vercelProjectPath)) {
      const projectConfig = JSON.parse(fs.readFileSync(vercelProjectPath, 'utf-8'));
      console.log('✅ Project is linked locally');
      console.log(`   Project ID: ${projectConfig.projectId}`);
      console.log(`   Org ID: ${projectConfig.orgId}\n`);
      
      // Try to get project details
      try {
        console.log('📦 Fetching project details...\n');
        const projectDetails = execSync('vercel inspect --json', { encoding: 'utf-8' });
        const details = JSON.parse(projectDetails);
        
        if (details.git) {
          console.log('📋 Vercel Git Configuration:');
          if (details.git.repo) {
            console.log(`   Repository: ${details.git.repo}`);
            if (details.git.repo.includes(EXPECTED_REPO)) {
              console.log(`   ✅ Repository matches expected\n`);
            } else {
              console.log(`   ⚠️  Repository does not match expected: ${EXPECTED_REPO}\n`);
            }
          }
          if (details.git.productionBranch) {
            console.log(`   Production Branch: ${details.git.productionBranch}`);
            if (details.git.productionBranch === EXPECTED_BRANCH) {
              console.log(`   ✅ Production branch matches expected\n`);
            } else {
              console.log(`   ⚠️  Production branch should be: ${EXPECTED_BRANCH}\n`);
            }
          }
        }
      } catch (error) {
        console.log('⚠️  Could not fetch project details via CLI\n');
        console.log('   This is normal if the project is not linked or CLI version is older\n');
      }
    } else {
      console.log('⚠️  Project not linked locally\n');
      console.log('   Run: vercel link\n');
    }
    
    // List projects
    try {
      console.log('📦 Checking projects...\n');
      const projects = execSync('vercel project ls --json', { encoding: 'utf-8' });
      const projectList = JSON.parse(projects);
      
      const kokuProject = projectList.find(p => 
        p.name && p.name.toLowerCase().includes('koku')
      );
      
      if (kokuProject) {
        console.log(`✅ Found project: ${kokuProject.name}`);
        console.log(`   Project ID: ${kokuProject.id}`);
        console.log(`   Updated: ${kokuProject.updatedAt || 'N/A'}\n`);
      } else {
        console.log('⚠️  Could not find koku-travel project in your projects\n');
        console.log('   Available projects:');
        projectList.forEach(p => {
          console.log(`   - ${p.name} (${p.id})`);
        });
        console.log('');
      }
    } catch (error) {
      console.log('⚠️  Could not list projects\n');
    }
    
  } catch (error) {
    console.log('⚠️  Not logged in to Vercel\n');
    console.log('   Run: vercel login\n');
  }
} catch (error) {
  console.log('❌ Vercel CLI not found\n');
  console.log('   Install with: npm install -g vercel\n');
}

console.log('=====================================\n');
console.log('📝 Manual Verification Steps:\n');
console.log('1. Go to: https://vercel.com/dashboard');
console.log('2. Select your "koku-travel" project');
console.log('3. Click "Settings" → "Git"');
console.log('4. Verify:');
console.log(`   ✅ Repository: ${EXPECTED_REPO}`);
console.log(`   ✅ Production Branch: ${EXPECTED_BRANCH}`);
console.log(`   ✅ Root Directory: ./ (or blank)`);
console.log('');
console.log('5. Check "Deployments" tab:');
console.log('   ✅ Latest deployment should show:');
console.log(`      "Cloning github.com/${EXPECTED_REPO}.git"`);
console.log('');

