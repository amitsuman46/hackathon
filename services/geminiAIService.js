const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load API Key
const API_KEY = process.env.GEMINI_API_KEY || '';
// Initialize Gemini API
const googleAI = new GoogleGenerativeAI(API_KEY);
const geminiConfig = {
    temperature: 0.9,
    topP: 1,
    topK: 1,
    maxOutputTokens: 4096,
};
let chatSession;

const initializeChatSession = () => {
    chatSession = geminiModel.startChat({
        history: [], // Initialize history
        generationConfig: geminiConfig,
    });
};

const geminiModel = googleAI.getGenerativeModel({ model: 'gemini-1.5-flash', geminiConfig });
initializeChatSession(); // Initialize session on startup

// Function to process response with Gemini AI (Placeholder)
const processWithGeminiTaskUpdate = async (prompt) => {
    try {
        if (!chatSession) {
            console.error("Chat session not initialized. Re-initializing...");
            initializeChatSession();
        }
        const result = await chatSession.sendMessage(prompt);
        const geminiResponse = result.response.text();
        if (chatSession.history) {
            chatSession.history.push({
                role: memberDetail.assignee,
                parts: [{ text: prompt }],
            });
            chatSession.history.push({
                role: 'model',
                parts: [{ text: geminiResponse }],
            });
        } else {
            console.warn('Chat session history is undefined');
        }
        console.log('gemini Response ' + geminiResponse)
        return geminiResponse;
    } catch (error) {
        console.error('Error fetching response from Gemini API:', error);
    }
};

const processWithGeminiFinalStatusUpdate = async (prompt) => {
    try {
        const result = await chatSession.sendMessage(prompt);
        const geminiResponse = result.response.text();
        return geminiResponse;
    } catch (error) {
        console.error('Error fetching response from Gemini API:', error);
    }
};
// Export functions for external use
module.exports = {
    processWithGeminiTaskUpdate,
    processWithGeminiFinalStatusUpdate,
};
