import os
import json
import uuid
import PyPDF2
import chromadb
from docx import Document
from sentence_transformers import SentenceTransformer
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
load_dotenv()

# --- Agent Prompts ---
ANALYSIS_PROMPT_TEMPLATE = """
You are a highly specialized AI legal assistant for a top-tier US law firm. Your task is to analyze a legal document and provide a clear, concise, and actionable intelligence report for a senior partner. The analysis must be sharp, precise, and framed within the context of US legal practice.

**Document Content:**
<document_text>
{document_text}
</document_text>

Based *only* on the text provided in the <document_text> tags, perform the following analysis. Structure your response as a single, valid JSON object with the keys "summary", "key_points", and "risks".

1.  **Executive Summary (`summary`):**
    - Provide a high-level overview of the document's purpose, key parties involved, and the primary legal implications.
    - This must be a single, dense paragraph that a busy partner can read in under 30 seconds to grasp the essence of the document.

2.  **Key Points & Clauses (`key_points`):**
    - Identify and list the most critical articles, sections, and clauses that define obligations, rights, and financial terms.
    - For each point, provide a brief, one-sentence explanation of its direct significance. Avoid generic descriptions.
    - Present this as an array of strings.

3.  **Potential Risks & Areas of Concern (`risks`):**
    - Proactively flag any ambiguous language, potential liabilities, unfavorable terms, or clauses that deviate from standard US legal practice.
    - Identify any elements that could foreseeably lead to future disputes or litigation.
    - Present this as an array of strings.

**CRITICAL INSTRUCTIONS:**
- Your entire output must be a single, minified JSON object. Do not include any text, explanations, or markdown formatting before or after the JSON.
- Your analysis must be strictly confined to the provided text. Do not invent facts or make assumptions beyond the document's content.
"""

CHAT_PROMPT_TEMPLATE = """
You are an AI legal assistant providing answers about a specific legal document. Your task is to answer the user's question based *exclusively* on the provided context from the document. Do not use any external knowledge or make assumptions.

**Context from Document:**
<context>
{context}
</context>

**User's Question:**
<question>
{question}
</question>

**Instruction:**
Based on the context above, provide a direct and concise answer to the user's question. If the context does not contain the information to answer the question, you must respond with: "The provided document excerpts do not contain specific information on this topic."
"""

# --- Helper Functions ---
def extract_text_from_pdf(file_path):
    text = ""
    with open(file_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            text += page.extract_text() or ""
    return text

def extract_text_from_docx(file_path):
    doc = Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs])

def get_text_from_file(file_path, filename):
    _, ext = os.path.splitext(filename)
    if ext.lower() == '.pdf':
        return extract_text_from_pdf(file_path)
    elif ext.lower() == '.docx':
        return extract_text_from_docx(file_path)
    elif ext.lower() == '.txt':
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    else:
        raise ValueError(f"Unsupported file type: {ext}")

# --- LangChain LLM Setup ---
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise ValueError("GOOGLE_API_KEY environment variable is not set!")

# ✅ Important: Use `api_key`, NOT `google_api_key`
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",   # you can also use "gemini-1.5-pro" if you want
    api_key=api_key,
    temperature=0.2,
    max_output_tokens=2048
)

# --- Embedding Model ---
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# --- LLM Call Wrappers ---
def generate_analysis(prompt):
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content

def generate_chat(prompt):
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content

class DocumentProcessor:
    def __init__(self, upload_folder):
        self.upload_folder = upload_folder
        self.document_store = {}
        self.client = chromadb.Client()
        print("Document processor initialized")
        print(f"ChromaDB client initialized: {self.client}")

    def process_document(self, file):
        """Process uploaded document and return analysis"""
        try:
            filename = file.filename
            file_path = os.path.join(self.upload_folder, filename)
            file.save(file_path)
            print(f"File saved at: {file_path}")

            # Extract text from document
            doc_text = get_text_from_file(file_path, filename)
            if not doc_text or not doc_text.strip():
                raise ValueError("Could not extract text from the document.")

            # Create ChromaDB collection and store embeddings
            document_id = str(uuid.uuid4())
            collection = self.client.create_collection(name=document_id)
            chunks = [doc_text[i:i+1000] for i in range(0, len(doc_text), 800)]
            embeddings = embedding_model.encode(chunks).tolist()
            chunk_ids = [str(i) for i in range(len(chunks))]
            collection.add(embeddings=embeddings, documents=chunks, ids=chunk_ids)
            
            # Store collection reference
            self.document_store[document_id] = {'collection_name': document_id}

            # Generate document analysis
            prompt = ANALYSIS_PROMPT_TEMPLATE.format(document_text=doc_text[:20000])
            analysis_json_str = generate_analysis(prompt)
            analysis_data = json.loads(analysis_json_str)
            analysis_data['document_id'] = document_id

            return analysis_data

        except Exception as e:
            print(f"Error processing document: {e}")
            raise

    def chat_with_document(self, question, document_id):
        """Process chat request and return answer"""
        if document_id not in self.document_store:
            raise ValueError("Document not found or session expired")

        try:
            collection = self.client.get_collection(name=document_id)
            query_embedding = embedding_model.encode([question]).tolist()
            results = collection.query(
                query_embeddings=query_embedding,
                n_results=5
            )
            context = "\n---\n".join(results['documents'][0])
            prompt = CHAT_PROMPT_TEMPLATE.format(context=context, question=question)
            return generate_chat(prompt)

        except Exception as e:
            print(f"Error during chat: {e}")
            raise