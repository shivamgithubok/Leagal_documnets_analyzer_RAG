const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

export const analyzeDocument = async (file) => {
  const formData = new FormData();
  formData.append("document", file);

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to analyze the document. Please try again.");
  }
  return await response.json();
};

export const chatWithDocument = async (question, documentId) => {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      document_id: documentId,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to get chat response. Please try again.");
  }
  return await response.json();
};