/**
 * Numbers the backoffice shell shows. Mocked in this styling spike; each is a single function so it can later call the real
 * UA Finance API without touching the components.
 */

/** Dashboard "Total Users" card. Production: GET {API_VERSION}/dashboard (total users). */
export const getTotalUsersCount = async (): Promise<number> => 732

/** AI Newsroom badge: pending AI suggestions. Production: the newsroom ingest-status endpoint (`pendingSuggestionCount`). */
export const getPendingSuggestionCount = async (): Promise<number> => 17
