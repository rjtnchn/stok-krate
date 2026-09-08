// Route-driven tab strip. Each tab is its own URL, so refresh, back/forward,
// bookmarks and the SideNav's deep links all land on the right panel — the URL
// is the source of truth, not component state. Built on the accessible
// Tabs/Tab/TabPanel primitives, so arrow-key navigation, roving tabindex and
// aria-selected come along unchanged.

import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, Tab, TabPanel } from "./tabs";

export function RouteTabs({ tabs, label = "Views" }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // An unrecognised path falls back to the first tab rather than rendering an
  // empty panel, so a stale bookmark still shows something useful.
  const active = tabs.find((tab) => tab.to === pathname) ?? tabs[0];

  return (
    <>
      <Tabs label={label}>
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            id={`tab-${tab.key}`}
            controls={`panel-${tab.key}`}
            active={tab.key === active.key}
            onClick={() => navigate(tab.to)}
          >
            {tab.label}
          </Tab>
        ))}
      </Tabs>

      {/* Only the active panel is mounted, so switching back to a list tab
          remounts and refetches it — a record created on a form tab shows up
          without a manual reload. */}
      <TabPanel id={`panel-${active.key}`} labelledBy={`tab-${active.key}`}>
        {active.element}
      </TabPanel>
    </>
  );
}
