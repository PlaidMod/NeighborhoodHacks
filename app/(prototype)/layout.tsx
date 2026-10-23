import { getAccount, googleEnabled } from "@/lib/account"
import { ProfileProvider } from "@/lib/prototype/profile"
import { loadLiveData } from "@/lib/prototype/liveData"

// The app screens (/app/*) and onboarding (/start), carried over from the web/ prototype.
// Each screen shows the reader's real governments and P3's items once they've looked up an
// address (lib/prototype/liveData.ts); until then it shows the labeled demo data in lib/prototype/.
export default async function PrototypeLayout({ children }: { children: React.ReactNode }) {
  const [live, account, google] = await Promise.all([loadLiveData(), getAccount(), googleEnabled()])
  return (
    <ProfileProvider live={live} account={account ? { name: account.name, email: account.email, avatar: account.avatar } : null} canSignIn={google}>
      {children}
    </ProfileProvider>
  )
}
