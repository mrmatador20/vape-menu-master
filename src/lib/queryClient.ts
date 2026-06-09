import { QueryClient } from '@tanstack/react-query';

// Single shared QueryClient instance so logout helpers can clear cached data.
export const queryClient = new QueryClient();
