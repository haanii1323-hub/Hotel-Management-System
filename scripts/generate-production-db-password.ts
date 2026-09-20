import crypto from 'crypto'

export function generateProductionDbCredentials() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*(-_=+)'
  const user = 'apex_admin_' + crypto.randomBytes(4).toString('hex')
  const password = crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, 'X') + '!9'
  const dbName = 'apex_inn_pms_prod'

  console.log('\n=============================================')
  console.log('🔒 SECURE PRODUCTION POSTGRESQL CREDENTIALS:')
  console.log('=============================================')
  console.log(`• Database User:     ${user}`)
  console.log(`• Database Name:     ${dbName}`)
  console.log(`• Secure Password:   ${password}`)
  console.log('---------------------------------------------')
  console.log('📝 Connection String Format (Keep Private in .env):')
  console.log(`DATABASE_URL="postgresql://${user}:${password}@YOUR_HOST:5432/${dbName}?sslmode=require"`)
  console.log('=============================================\n')
}

generateProductionDbCredentials()
