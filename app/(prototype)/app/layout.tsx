import { AppShell } from "@/components/prototype/app-shell"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
