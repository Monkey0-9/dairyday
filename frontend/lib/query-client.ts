"use client"

import { QueryClient } from "@tanstack/react-query"

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // Data considered fresh for 30 seconds (reduces refetches)
                staleTime: 30_000,
                // Keep unused data in cache for 5 minutes
                gcTime: 5 * 60_000,
                // Retry failed requests twice
                retry: 2,
                // Don't refetch on window focus for better performance
                refetchOnWindowFocus: false,
                // Refetch on reconnect
                refetchOnReconnect: true,
            },
            mutations: {
                // Retry mutations once on failure
                retry: 1,
            },
        },
    })
}

let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
    if (typeof window === "undefined") {
        // Server: always make a new query client
        return makeQueryClient()
    } else {
        // Browser: make a new query client if we don't already have one
        if (!browserQueryClient) browserQueryClient = makeQueryClient()
        return browserQueryClient
    }
}
