
export interface Document {
  id: string;
  title: string;
  description: string | null;
  type: "PDF" | "DOC" | "PPT" | "CSV" | "URL";
  domain: string;
  tags: string[];
  size: number;
  file_path: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  url?: string;
  url_content?: string;
  content: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}
