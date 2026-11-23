"use client";

import { Tabs } from "@heroui/react";

/** Model page sections as tabs; each panel is rendered on the server and handed in. */
export function ModelTabs({ panels }: { panels: { id: string; label: string; content: React.ReactNode }[] }) {
  return (
    <Tabs defaultSelectedKey={panels[0]?.id}>
      <Tabs.ListContainer className="mb-5">
        <Tabs.List aria-label="Bagian model">
          {panels.map((p) => (
            <Tabs.Tab key={p.id} id={p.id}>
              {p.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {panels.map((p) => (
        <Tabs.Panel key={p.id} id={p.id}>
          {p.content}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
