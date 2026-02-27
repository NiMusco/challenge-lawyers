import type { ReactNode } from 'react';

export function Layout(props: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-background to-muted/30">
      {props.header}
      <main className="flex-1 overflow-hidden px-0 py-0 flex flex-col">{props.children}</main>
    </div>
  );
}

