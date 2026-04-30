"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { api, Role, AgentMember } from "@/lib/api";

interface RoleContextValue {
  currentRole: Role;
  currentAgent: AgentMember | null;
  allAgents: AgentMember[];
  loading: boolean;
  refetchAgents: () => Promise<void>;
}

const RoleContext = createContext<RoleContextValue>({
  currentRole: "moderator",
  currentAgent: null,
  allAgents: [],
  loading: true,
  refetchAgents: async () => {},
});

// Routes that signed-in but not-on-team users are still allowed to visit.
// Everything else triggers a redirect to /not-on-team.
const TEAM_BYPASS_PATHS = ["/not-on-team", "/sign-in", "/sign-up", "/invite"];

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const [currentRole, setCurrentRole] = useState<Role>("moderator");
  const [currentAgent, setCurrentAgent] = useState<AgentMember | null>(null);
  const [allAgents, setAllAgents] = useState<AgentMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      const data: any = await api.agents();
      const agents: AgentMember[] = data.agents ?? [];
      setAllAgents(agents);
      return agents;
    } catch {
      return [];
    }
  };

  const refetchAgents = async () => {
    const agents = await fetchAgents();
    if (user) {
      resolveRole(user, agents);
    }
  };

  // DB is the single source of truth for roles. Match the Clerk user to an
  // agents row by ANY of their Clerk email addresses (primary + secondaries),
  // then fall back to Telegram username. If nothing matches, the user is not
  // on the team — redirect them away.
  //
  // Clerk's publicMetadata.role is intentionally NOT consulted: it's set at
  // invite-accept time and goes stale after transfer-ownership / role updates.
  const resolveRole = (clerkUser: any, agents: AgentMember[]) => {
    // Collect every email Clerk knows about for this user (not just primary).
    // Some users sign up with one email and later add the invited email as a
    // secondary — we need to match on either.
    const clerkEmails = new Set<string>();
    const primary = clerkUser.primaryEmailAddress?.emailAddress;
    if (primary) clerkEmails.add(primary.toLowerCase());
    for (const e of clerkUser.emailAddresses ?? []) {
      const addr = e?.emailAddress;
      if (addr) clerkEmails.add(addr.toLowerCase());
    }
    const clerkUsername = (clerkUser.username ?? "").toLowerCase();

    const matched = agents.find((a) => {
      const aEmail = (a.email ?? "").toLowerCase();
      const aUsername = (a.username ?? "").toLowerCase();
      if (aEmail && clerkEmails.has(aEmail)) return true;
      if (aUsername && clerkUsername && aUsername === clerkUsername) return true;
      return false;
    });

    if (matched) {
      const validRole: Role =
        matched.role === "super_admin" || matched.role === "admin" || matched.role === "moderator"
          ? matched.role
          : "moderator";
      setCurrentRole(validRole);
      setCurrentAgent(matched);
      return true;
    }

    // No agent row matches — user is not on the team.
    setCurrentRole("moderator");
    setCurrentAgent(null);
    return false;
  };

  useEffect(() => {
    if (!isLoaded) return;

    const init = async () => {
      setLoading(true);
      if (!user) {
        setLoading(false);
        return;
      }
      const agents = await fetchAgents();
      const onTeam = resolveRole(user, agents);
      setLoading(false);

      // Bounce non-team members away from the rest of the dashboard.
      const isBypassed = TEAM_BYPASS_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
      if (!onTeam && !isBypassed) {
        router.replace("/not-on-team");
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]);

  return (
    <RoleContext.Provider value={{ currentRole, currentAgent, allAgents, loading, refetchAgents }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
