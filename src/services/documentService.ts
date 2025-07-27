
import { supabase } from "@/integrations/supabase/client";

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const getFileType = (mimeType: string): "PDF" | "DOC" | "PPT" | "CSV" | "URL" => {
  switch (mimeType) {
    case 'application/pdf':
      return 'PDF';
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'DOC';
    case 'application/vnd.ms-powerpoint':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return 'PPT';
    case 'text/csv':
      return 'CSV';
    default:
      return 'PDF';
  }
};

export const uploadFile = async (file: File) => {
  console.log(`Uploading file: ${file.name} (${file.size} bytes)`);
  
  // Check if 'documents' bucket exists, create if not
  const { data: buckets } = await supabase.storage.listBuckets();
  const documentsBucket = buckets?.find(bucket => bucket.name === 'documents');
  
  if (!documentsBucket) {
    console.log("Creating 'documents' bucket");
    const { error: createError } = await supabase.storage.createBucket('documents', {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
    });
    
    if (createError) {
      console.error("Error creating bucket:", createError);
      throw createError;
    }
  }

  const fileExt = file.name.split('.').pop();
  const filePath = `${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError, data } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.error("Error uploading file:", uploadError);
    throw uploadError;
  }

  console.log("File uploaded successfully:", data?.path);
  return filePath;
};

export const createDocument = async (data: {
  title: string;
  description: string;
  type: "PDF" | "DOC" | "PPT" | "CSV" | "URL";
  domain: string;
  size: number;
  file_path?: string;
  url?: string;
  tags: string[];
  is_default: boolean;
  owner_id: string;
}) => {
  console.log("Creating document in database:", data.title);
  
  const { data: document, error } = await supabase
    .from('documents')
    .insert({
      content: '',
      ...data,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating document:", error);
    throw error;
  }

  console.log("Document created successfully:", document.id);
  return document;
};

export const getDocument = async (id: string) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', parseInt(id) as any)
    .single();

  if (error) throw error;
  return data;
};

export const deleteDocument = async (document: { id: string, file_path?: string, type?: string }) => {
  console.log("Deleting document:", document.id);
  
  // If it's a file (not URL), delete from storage first
  if (document.type !== 'URL' && document.file_path) {
    console.log("Deleting file from storage:", document.file_path);
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path]);

    if (storageError) {
      console.error("Error deleting file from storage:", storageError);
      throw storageError;
    }
  }

  // Delete document from database
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', parseInt(document.id) as any);

  if (dbError) {
    console.error("Error deleting document from database:", dbError);
    throw dbError;
  }
  
  console.log("Document deleted successfully");
  return true;
};
