import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from Agents import DocumentProcessor

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({"status": "Server is running"}), 200

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create document processor instance
doc_processor = DocumentProcessor(UPLOAD_FOLDER)

@app.route('/analyze', methods=['POST'])
def analyze_document():
    print("Received analyze request")
    if 'document' not in request.files:
        print("No document in request files")
        return jsonify({"error": "No document file provided"}), 400
    
    file = request.files['document']
    if file.filename == '':
        print("Empty filename received")
        return jsonify({"error": "No selected file"}), 400
    
    try:
        print(f"Processing file: {file.filename}")
        analysis_data = doc_processor.process_document(file)
        return jsonify(analysis_data)
    except ValueError as ve:
        print(f"Validation error: {ve}")
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        print(f"Error during analysis: {e}")
        return jsonify({"error": "An internal server error occurred."}), 500

@app.route('/chat', methods=['POST'])
def chat_with_document():
    print("Received chat request")
    data = request.get_json()
    print(f"Chat request data: {data}")
    
    question = data.get('question')
    document_id = data.get('document_id')
    
    if not all([question, document_id]):
        print("Missing required chat parameters")
        return jsonify({"error": "Missing 'question' or 'document_id'"}), 400
    
    try:
        answer = doc_processor.chat_with_document(question, document_id)
        return jsonify({"answer": answer})
    except ValueError as ve:
        print(f"Validation error: {ve}")
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        print(f"Error during chat: {e}")
        return jsonify({"error": "An internal server error occurred during chat processing."}), 500

if __name__ == '__main__':
    app.run(debug=True)