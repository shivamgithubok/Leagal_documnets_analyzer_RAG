Node.js and npm

Pip (Python package installer)

Backend Setup
Clone the repository and navigate to the backend:

git clone <repository-url>
cd <repository-folder>/backend

Create and activate a virtual environment:

python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

Install Python dependencies:

pip install -r requirements.txt

Run the Flask application:

flask run

The backend will now be running on http://127.0.0.1:5000.

Frontend Setup
Open a new terminal and navigate to the frontend directory:

cd ../frontend

Install npm dependencies:

npm install

Start the React development server:

npm start

The frontend will be running on http://localhost:3000 and should open automatically in your browser.


Legal Document Intelligence Platform
This project is a powerful, RAG-based document analysis and chat platform specifically designed for the needs of US law firms. It allows users to upload legal documents (PDF, DOCX, TXT), receive a comprehensive analysis, and interact with the document through a chat interface.

Features
Document Upload: Securely upload legal documents in various formats.

Automated Analysis: Get an instant breakdown of the document, including:

Executive Summary: A concise, high-level overview.

Key Points & Clauses: An itemized list of the most critical articles, sections, and clauses.

Potential Risks: Identification of potential liabilities, ambiguous language, and areas requiring further legal scrutiny.

Interactive Chat: "Chat" with your document. Ask specific questions and get context-aware answers based on the document's content.

Efficient & Fast: Utilizes an offline vector database (chromadb) for rapid similarity search and retrieval, ensuring low-latency responses.

Specialized Agents for US Law: The backend language model prompts are engineered to act as specialized "agents" that understand and analyze documents within the context of US legal practice.

Tech Stack
Frontend: React.js with Tailwind CSS and lucide-react for icons.

Backend: Python with Flask, serving a REST API.

Document Processing: pypdf2, python-docx to extract text.

AI Agents: Logic and powerful prompts designed to steer a Large Language Model (e.g., Gemini).

Vector Database: chromadb for efficient, local vector storage and retrieval.

Embeddings: sentence-transformers to create numerical representations of text.

Getting Started
Prerequisites
Python 3.8+


How the "Agents" Work (RAG Architecture)
The "intelligence" of this application comes from two specialized agents implemented in the backend:

The Analyst Agent (/analyze endpoint):

Ingestion & Chunking: When a document is uploaded, the backend extracts the text and splits it into smaller, semantically meaningful chunks.

Embedding: Each chunk is converted into a numerical vector (an embedding).

Indexing: These embeddings and their corresponding text chunks are stored in a new, unique chromadb collection for that document.

Generation: The full text is sent to an LLM with a highly-structured prompt (ANALYSIS_PROMPT_TEMPLATE), instructing it to act like a senior legal analyst and return a structured JSON with a summary, key points, and risks.

The Chat Agent (/chat endpoint):

Retrieval: When a user asks a question, the agent converts the question into an embedding and uses it to find the most relevant text chunks from the document's vector database collection.

Generation: These retrieved chunks (the "context") are combined with the user's original question and sent to the LLM. A second specialized prompt (CHAT_PROMPT_TEMPLATE) strictly forces the LLM to answer only based on the provided context, ensuring factual, document-grounded responses.