"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
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

  const resolveRole = (clerkUser: any, agents: AgentMember[]) => {
    // 1. Prefer Clerk publicMetadata.role (set by backend on invite accept)
    const metaRole = clerkUser.publicMetadata?.role as Role | undefined;
    if (metaRole && ["super_admin", "admin", "moderator"].includes(metaRole)) {
      setCurrentRole(metaRole);
      const matched = agents.find(
        (a) => a.email === clerkUser.primaryEmailAddress?.emailAddress || a.username === clerkUser.username
      );
      setCurrentAgent(matched ?? {
        username: clerkUser.username ?? clerkUser.firstName ?? "You",
        email: clerkUser.primaryEmailAddress?.emailAddress,
        role: metaRole,
      });
      return;
    }

    // 2. Fallback: match by Clerk username or email username part to agent list
    const clerkEmail = clerkUser.primaryEmailAddress?.emailAddress ?? "";
    const clerkUsername = clerkUser.username ?? "";
    const matched = agents.find(
      (a) =>
        (a.email && a.email === clerkEmail) ||
        (a.username && (a.username === clerkUsername || a.username === clerkEmail.split("@")[0]))
    );

    if (matched) {
      setCurrentRole(matched.role);
      setCurrentAgent(matched);
      return;
    }

    // 3. Default: if the agents list exists and has a super_admin, check if current user is the first/only super_admin
    // For Ben's single-user setup, default to super_admin
    const superAdmins = agents.filter((a) => a.role === "super_admin");
    if (superAdmins.length === 1 || agents.length === 0) {
      // Only one super admin or no agents configured yet — current user is super admin
      setCurrentRole("super_admin");
      setCurrentAgent({
        username: clerkUser.username ?? clerkEmail.split("@")[0] ?? "Admin",
        email: clerkEmail,
        role: "super_admin",
      });
      return;
    }

    // 4. Unknown user — most restrictive
    setCurrentRole("moderator");
    setCurrentAgent({
      username: clerkUser.username ?? "Unknown",
      email: clerkEmail,
      role: "moderator",
    });
  };

  useEffect(() => {
    if (!isLoaded) return;

    const init = async () => {
      setLoading(true);
      const agents = await fetchAgents();
      if (user) {
        resolveRole(user, agents);
      }
      setLoading(false);
    };

    init();
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
