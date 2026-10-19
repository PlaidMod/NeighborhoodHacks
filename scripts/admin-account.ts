// Accounts for the admin pages. The admin list is ADMIN_EMAILS in .env.local.
//   npm run admin -- create-all             P5: create an account, with no password, for every admin email
//   npm run admin -- set-password <email>   Each admin: choose your own password (typed twice, never shown)
import { config } from 'dotenv'
import { ensureAdminAccount, NotAdminEmailError, passwordProblem, setAdminPassword } from '../lib/adminAccounts'
import { db } from '../lib/db'
import { adminEmails } from '../lib/env'

config({ path: '.env.local', quiet: true })

/** Reads a line from the keyboard without showing it. */
function askHidden(prompt: string): Promise<string> {
  const stdin = process.stdin
  if (!stdin.isTTY) {
    throw new Error('Run this in PowerShell, Command Prompt or the VS Code terminal, so the password stays hidden.')
  }
  process.stdout.write(prompt)
  stdin.setRawMode(true)
  stdin.setEncoding('utf8')
  stdin.resume()
  return new Promise((resolve, reject) => {
    let value = ''
    const finish = () => {
      stdin.off('data', onData)
      stdin.setRawMode(false)
      stdin.pause()
      process.stdout.write('\n')
    }
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') return (finish(), resolve(value))
        if (char === '\u0003') return (finish(), reject(new Error('Cancelled.'))) // Ctrl+C
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1)
        else value += char
      }
    }
    stdin.on('data', onData)
  })
}

async function main() {
  const [command, email] = process.argv.slice(2)
  const admin = db().auth.admin

  if (command === 'create-all') {
    const emails = adminEmails()
    if (emails.length === 0) throw new Error('ADMIN_EMAILS in .env.local is empty.')
    for (const address of emails) {
      const { created } = await ensureAdminAccount(admin, address)
      console.log(`${address}: ${created ? 'account created' : 'already has an account'}`)
    }
    console.log('Each admin now runs: npm run admin -- set-password <their email>')
  } else if (command === 'set-password' && email) {
    // Check the list before asking for a password, so nobody types one for nothing.
    if (!adminEmails().includes(email.trim().toLowerCase())) throw new NotAdminEmailError(email)
    let password = ''
    for (;;) {
      password = await askHidden(`New password for ${email}: `)
      const problem = passwordProblem(password, await askHidden('Type it again: '))
      if (!problem) break
      console.log(problem)
    }
    await setAdminPassword(admin, email, password)
    console.log('Password set. Sign in at /admin/login on the site.')
  } else {
    console.log('Usage:\n  npm run admin -- create-all\n  npm run admin -- set-password <email>')
    process.exitCode = 1
  }
}

// Show just the message, not a stack trace.
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
