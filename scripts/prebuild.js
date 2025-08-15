// scripts/prebuild.js
const fs = require('fs')
const path = require('path')

console.log('🧹 Running pre-build cleanup...')

// Remove .next directory if it exists
const nextDir = path.join(process.cwd(), '.next')
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true })
  console.log('✅ Removed .next directory')
}

// Clear any potential cache issues
const nodeModulesNextDir = path.join(process.cwd(), 'node_modules', '.cache', 'next')
if (fs.existsSync(nodeModulesNextDir)) {
  fs.rmSync(nodeModulesNextDir, { recursive: true, force: true })
  console.log('✅ Cleared Next.js cache')
}

console.log('🚀 Ready for build!')
