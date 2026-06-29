export interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  emailVerificationTime?: number;
  isAnonymous?: boolean;
  role?: UserRole;
}

export interface ApiResponse<T> {
  data: T;
  error: string | null;
}

export type UserRole = "admin" | "member";

export type DocumentStatus = "processing" | "ready" | "error";

export type DocumentSourceType = "text" | "file";

export interface DocumentSummary {
  _id: string;
  _creationTime: number;
  createdAt: number;
  error?: string;
  filename?: string;
  ragEntryId?: string;
  sourceType: DocumentSourceType;
  status: DocumentStatus;
  storageId?: string;
  title: string;
  uploadedBy: string;
}

export interface KnowledgeSearchResult {
  entryId: string;
  score: number;
  text: string;
  title?: string;
}

export interface KnowledgeSearchResponse {
  results: KnowledgeSearchResult[];
}

export interface KnowledgeAskResponse {
  answer: string;
  sources: KnowledgeSearchResult[];
}
