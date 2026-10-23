import { ViewTransition } from 'react'

export default function Template({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ViewTransition enter="site-route" exit="site-route" default="none">
      {children}
    </ViewTransition>
  )
}
