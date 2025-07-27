
import fitz
import json
import os
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from supabase import create_client
from openai import AsyncOpenAI
import re

@dataclass
class Document:
    id: str
    type: str
    file_path: str
    url: Optional[str]
    content: str

class TextProcessor:
    @staticmethod
    def clean_text(text: str) -> str:
        """Remove caracteres inválidos e normaliza o texto."""
        text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    @staticmethod
    def split_into_sentences(text: str) -> List[str]:
        """Divide o texto em sentenças preservando o contexto."""
        pattern = r'(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ])'
        sentences = re.split(pattern, text)
        return [s.strip() for s in sentences if s.strip()]

    @staticmethod
    def chunk_text(text: str, max_chunk_size: int = 1000) -> List[str]:
        """Divide o texto em chunks mantendo contexto e sentido."""
        if not text:
            return []

        text = TextProcessor.clean_text(text)
        sentences = TextProcessor.split_into_sentences(text)
        chunks: List[str] = []
        current_chunk: List[str] = []
        current_length = 0

        for sentence in sentences:
            sentence_length = len(sentence)
            
            if sentence_length > max_chunk_size:
                if current_chunk:
                    chunks.append(' '.join(current_chunk))
                    current_chunk = []
                    current_length = 0
                
                while len(sentence) > max_chunk_size:
                    chunks.append(sentence[:max_chunk_size])
                    sentence = sentence[max_chunk_size:]
                if sentence:
                    current_chunk.append(sentence)
                    current_length = len(sentence)
            else:
                if current_length + sentence_length > max_chunk_size:
                    chunks.append(' '.join(current_chunk))
                    current_chunk = []
                    current_length = 0
                
                current_chunk.append(sentence)
                current_length += sentence_length + 1

        if current_chunk:
            chunks.append(' '.join(current_chunk))

        return chunks

class PDFProcessor:
    @staticmethod
    async def extract_content(storage_client, file_path: str) -> str:
        """Extrai o conteúdo do PDF mantendo a estrutura do texto."""
        try:
            print(f"Downloading PDF from: {file_path}")
            response = await storage_client.storage.from_("documents").download(file_path)
            
            if not response.data:
                raise Exception("Failed to download file")

            temp_path = f"/tmp/{os.path.basename(file_path)}"
            with open(temp_path, "wb") as f:
                f.write(response.data)

            extracted_text = []
            with fitz.open(temp_path) as pdf:
                print(f"Processing PDF with {pdf.page_count} pages")
                for page_num in range(pdf.page_count):
                    page = pdf[page_num]
                    text = page.get_text()
                    if text.strip():
                        extracted_text.append(text)

            os.remove(temp_path)
            full_text = '\n\n'.join(extracted_text)
            print(f"Extracted {len(full_text)} characters of text")
            return full_text

        except Exception as e:
            print(f"Error extracting PDF content: {str(e)}")
            raise

class EmbeddingGenerator:
    def __init__(self, openai_client: AsyncOpenAI, supabase_client):
        self.openai_client = openai_client
        self.supabase_client = supabase_client

    async def generate_and_store(self, content: str, document_id: str) -> None:
        """Gera e armazena embeddings para o conteúdo."""
        try:
            chunks = TextProcessor.chunk_text(content)
            print(f"Generating embeddings for {len(chunks)} chunks")
            
            for i, chunk in enumerate(chunks):
                try:
                    response = await self.openai_client.embeddings.create(
                        input=chunk,
                        model="text-embedding-3-small"
                    )
                    
                    embedding = response.data[0].embedding
                    
                    if not isinstance(embedding, list) or not all(isinstance(x, float) for x in embedding):
                        raise ValueError("Invalid embedding format")
                    
                    await self.supabase_client.table("document_embeddings").insert({
                        "document_id": document_id,
                        "content_chunk": chunk,
                        "embedding": embedding,
                        "chunk_index": i
                    }).execute()
                    
                    print(f"Successfully processed chunk {i + 1}/{len(chunks)}")
                
                except Exception as e:
                    print(f"Error processing chunk {i}: {str(e)}")
                    raise

        except Exception as e:
            print(f"Error in embedding generation: {str(e)}")
            raise

async def process_document(supabase_client, openai_client, doc: Document) -> None:
    """Processa o documento, extraindo texto e gerando embeddings."""
    try:
        # Extract content based on document type
        extracted_content = ""
        if doc.type == "PDF" and doc.file_path:
            extracted_content = await PDFProcessor.extract_content(supabase_client, doc.file_path)
            # Update the document with extracted content
            await supabase_client.table("documents").update({
                "content": extracted_content,
                "is_processed": True,
                "processing_error": None
            }).eq("id", doc.id).execute()
        else:
            raise Exception(f"Unsupported document type: {doc.type}")

        if not extracted_content.strip():
            raise Exception("No content extracted from document")
            
        # Generate and store embeddings
        embedding_generator = EmbeddingGenerator(openai_client, supabase_client)
        await embedding_generator.generate_and_store(extracted_content, doc.id)
        
        print("Document processing completed successfully")

    except Exception as e:
        error_message = str(e)
        print(f"Error processing document: {error_message}")
        await supabase_client.table("documents").update({
            "is_processed": False,
            "processing_error": error_message
        }).eq("id", doc.id).execute()
        raise

async def main(req) -> Dict[str, Any]:
    """Função principal que coordena o processamento do documento."""
    if req.method == "OPTIONS":
        return {
            "statusCode": 204,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            }
        }

    try:
        body = await req.json()
        document_id = body.get("documentId")
        
        if not document_id:
            raise ValueError("Document ID is required")

        supabase_client = create_client(
            os.environ.get("SUPABASE_URL"),
            os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        openai_client = AsyncOpenAI(
            api_key=os.environ.get("OPENAI_API_KEY")
        )

        response = await supabase_client.table("documents").select("*").eq("id", document_id).execute()
        
        if not response.data:
            raise ValueError("Document not found")

        doc_data = response.data[0]
        document = Document(
            id=doc_data["id"],
            type=doc_data["type"],
            file_path=doc_data.get("file_path", ""),
            url=doc_data.get("url"),
            content=doc_data.get("content", "")
        )

        await process_document(supabase_client, openai_client, document)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"success": True, "documentId": document_id})
        }

    except Exception as e:
        error_message = str(e)
        print(f"Error in main: {error_message}")
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": error_message})
        }

