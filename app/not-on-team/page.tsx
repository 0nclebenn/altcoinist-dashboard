"use client";

import { useClerk, useUser } from "@clerk/nextjs";

export default function NotOnTeamPage() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-300 p-6">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md text-center">
        <h1 className="text-xl font-semibold text-white mb-2">You're not on this team</h1>
        <p className="text-gray-400 text-sm mb-6">
          {email ? (
            <>
              <strong className="text-white">{email}</strong> isn't a member of the Altcoinist
              support team. If you should have access, ask the workspace owner to send you a fresh
              invitation.
            </>
          ) : (
            "Your account isn't authorized to access this dashboard."
          )}
        </p>
        <button
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="bg-violet-600 hover:bg-violet-700 text-white font-medium px-4 py-2 rounded transition"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
