'use client'; // Mark this as a Client Component

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './providers/AuthProvider'; // Import AuthProvider

// Create a React Query client instance (only once per app load)
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default options for queries if needed
        staleTime: 60 * 1000, // 1 minute
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize queryClient using state to ensure it's stable across re-renders
  // NOTE: useState ensures the client is created only once per component instance.
  // Use getQueryClient to handle server/client differences.
  const [queryClient] = useState(() => getQueryClient());

  return (
    // Wrap with AuthProvider
    <AuthProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthProvider>
  );
}
