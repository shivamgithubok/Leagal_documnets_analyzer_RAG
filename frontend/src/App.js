import React, { useState, useRef, useEffect } from 'react';
import { FileText, Upload, AlertCircle, MessageSquare, Send, Copy, Check } from 'lucide-react';
import './App.css';

const App = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedStates, setCopiedStates] = useState({});

  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setAnalysis(null);
      setError('');
      setChatHistory([]);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setFileName(droppedFile.name);
      setAnalysis(null);
      setError('');
      setChatHistory([]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please upload a document first.');
      return;
    }
    setIsLoading(true);
    setError('');
    setAnalysis(null);
    setChatHistory([]);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze the document. Please try again.');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!userMessage.trim() || isChatLoading || !analysis) return;

    const newChatHistory = [...chatHistory, { role: 'user', content: userMessage }];
    setChatHistory(newChatHistory);
    setUserMessage('');
    setIsChatLoading(true);

    try {
        const response = await fetch('http://127.0.0.1:5000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: userMessage,
                document_id: analysis.document_id 
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to get chat response. Please try again.');
        }

        const data = await response.json();
        setChatHistory([...newChatHistory, { role: 'assistant', content: data.answer }]);
    } catch (err) {
        setChatHistory([...newChatHistory, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
        setIsChatLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [id]: false })), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    document.body.removeChild(textArea);
  };


  const renderAnalysisSection = (title, content, contentId) => {
    if (!content) return null;
    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                <button
                    onClick={() => copyToClipboard(typeof content === 'string' ? content : JSON.stringify(content, null, 2), contentId)}
                    className="p-2 text-gray-500 hover:text-gray-800 transition-colors duration-200"
                    aria-label={`Copy ${title}`}
                >
                    {copiedStates[contentId] ? <Check className="text-green-500" /> : <Copy />}
                </button>
            </div>
            {typeof content === 'string' ? (
                 <p className="text-gray-600 whitespace-pre-wrap">{content}</p>
            ) : (
                <ul className="list-disc list-inside space-y-2">
                    {content.map((item, index) => <li key={index} className="text-gray-600">{item}</li>)}
                </ul>
            )}
        </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
            {/* <div className="inline-block bg-blue-600 text-white p-3 rounded-full mb-4">
               <FileText size={40} />
            </div> */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">Legal Document Intelligence</h1>
            <p className="text-lg text-gray-500 mt-2">Specialized Analysis for US Law Firms</p>
        </header>

        <main>
            {/* Initial Upload Section */}
            {!analysis && !isLoading && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <div 
                        className="bg-white p-8 rounded-lg shadow-md border-2 border-dashed border-gray-300 hover:border-blue-500 transition-all duration-300"
                        onDrop={handleFileDrop}
                        onDragOver={handleDragOver}
                    >
                        <div className="flex flex-col items-center justify-center text-center">
                            <Upload className="w-20 h-20 text-gray-400 mb-6" />
                            <h2 className="text-3xl font-semibold mb-4">Upload Your Document</h2>
                            <p className="text-gray-500 mb-6">Drag & drop a PDF, DOCX, or TXT file here, or click to select.</p>
                            <button onClick={triggerFileInput} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 text-lg">
                                Browse Files
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".pdf,.docx,.txt"
                            />
                        </div>
                        {fileName && (
                            <div className="mt-8 text-center bg-gray-100 p-4 rounded-lg">
                                <p className="text-gray-700 font-medium">Selected: {fileName}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || !file}
                        className="w-full bg-green-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center text-xl"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Analyzing...
                            </>
                        ) : 'Analyze Document'}
                    </button>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md text-center">
                    <p className="text-lg font-medium text-gray-700">Processing your document. This may take a moment...</p>
                    <div className="mt-4 text-sm text-gray-500">
                       <p>Extracting text, generating embeddings, and performing initial analysis.</p>
                    </div>
                </div>
            )}

            {/* Analysis and Chat View */}
            {analysis && !isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Analysis Results */}
                    <div className="space-y-6">
                        <div className="animate-fade-in">
                            {renderAnalysisSection("Executive Summary", analysis.summary, 'summary')}
                            {renderAnalysisSection("Key Points & Clauses", analysis.key_points, 'key_points')}
                            {renderAnalysisSection("Potential Risks & Areas of Concern", analysis.risks, 'risks')}
                        </div>
                    </div>

                    {/* Right Column: Chat */}
                    <div className="bg-white rounded-lg shadow-md flex flex-col h-[80vh]">
                        <div className="p-4 border-b flex items-center">
                            <MessageSquare className="w-6 h-6 mr-3 text-blue-600" />
                            <h2 className="text-xl font-semibold text-gray-800">Chat with Document</h2>
                        </div>
                        <div ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto bg-gray-50">
                            {chatHistory.length === 0 && (
                                <div className="text-center text-gray-500 h-full flex flex-col justify-center items-center">
                                    <MessageSquare size={48} className="mb-4 text-gray-300"/>
                                    <p>Start asking questions about your document.</p>
                                </div>
                            )}
                            <div className="space-y-4">
                                {chatHistory.map((msg, index) => (
                                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                        {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">A</div>}
                                        <div className={`p-3 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-200 text-gray-800'}`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                        {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-bold flex-shrink-0">Y</div>}
                                    </div>
                                ))}
                                {isChatLoading && (
                                   <div className="flex items-start gap-3">
                                       <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">A</div>
                                       <div className="p-3 rounded-lg bg-gray-200 text-gray-800">
                                           <div className="flex items-center">
                                               <div className="dot-flashing"></div>
                                           </div>
                                       </div>
                                   </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t bg-white">
                            <div className="flex items-center space-x-3">
                                <input
                                    type="text"
                                    value={userMessage}
                                    onChange={(e) => setUserMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Ask a question about the document..."
                                    className="flex-grow p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                    disabled={isChatLoading}
                                    
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isChatLoading || !userMessage.trim()}
                                    className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                   <Send size={24}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {error && (
                <div className="max-w-2xl mx-auto mt-6">
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center">
                        <AlertCircle className="w-6 h-6 mr-3" />
                        <span>{error}</span>
                    </div>
                </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default App;
