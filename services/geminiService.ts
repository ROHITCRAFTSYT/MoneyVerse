import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Transaction, NewsItem, LessonContent } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_ID = "gemini-2.5-flash";

export const getFinancialAdvice = async (transactions: Transaction[]): Promise<string> => {
  try {
    const transactionSummary = JSON.stringify(transactions.slice(0, 20)); // Limit to last 20 to save tokens
    
    const prompt = `
      You are a cool, gamified financial mentor for a teenager named "MoneyVerse AI".
      Analyze these recent transactions: ${transactionSummary}.
      
      Give 3 short, punchy, emoji-filled bullet points of advice. 
      Focus on spending habits, saving opportunities, or kudos for good behavior.
      Keep it under 100 words total.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
    });

    return response.text || "Keep tracking your spending to unlock insights! 🚀";
  } catch (error) {
    console.error("Gemini Advice Error:", error);
    return "Offline Mode: Great job tracking! Connect to the net for AI insights.";
  }
};

export const getExplainedNews = async (): Promise<NewsItem[]> => {
  try {
    // Step 1: Get Real-Time Information using Google Search Tool
    // Note: responseSchema is NOT allowed with googleSearch, so we get raw text first.
    const searchResponse = await ai.models.generateContent({
      model: MODEL_ID,
      contents: "Find 3 trending financial news stories from today or yesterday relevant to teens (crypto, big tech stocks, economy). Provide a summary for each.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawNewsText = searchResponse.text;

    if (!rawNewsText) {
      throw new Error("No news found");
    }

    // Step 2: Format the raw text into JSON using a standard generation call
    // This ensures we get the exact structure we need for the UI.
    const formattingPrompt = `
      Take the following news text and format it into a strictly valid JSON array of objects.
      
      News Text:
      "${rawNewsText}"
      
      Required JSON Structure:
      [
        {
          "id": "unique_string_id",
          "title": "Short Headline",
          "summary": "One sentence explanation for a teenager (under 20 words)",
          "tag": "Category (Crypto, Tech, or Economy)"
        }
      ]
      
      Return ONLY the JSON. No markdown formatting.
    `;

    const formatResponse = await ai.models.generateContent({
      model: MODEL_ID,
      contents: formattingPrompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const jsonText = formatResponse.text || "[]";
    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Gemini News Error:", error);
    // Fallback if API fails
    return [
      { id: '1', title: 'Live Data Unavailable', summary: 'Could not fetch real-time news. Check your connection.', tag: 'Error' },
      { id: '2', title: 'Market Watch', summary: 'Keep an eye on Bitcoin and Tech stocks today.', tag: 'Crypto' },
    ];
  }
};

export const getLearningContent = async (topic: string): Promise<LessonContent | null> => {
  try {
    const prompt = `
      You are a fun financial mentor for teens. 
      Create a short lesson about "${topic}".
      The lesson should be engaging, use analogies (gaming, food, sports), and be under 200 words.
      
      Crucially, generate a quiz with 3 multiple-choice questions to test their understanding of this specific lesson.
      
      Return the response as a strictly valid JSON object with the following schema:
      {
        "topic": "The exact topic title",
        "content": "The markdown lesson text (use bolding and emojis)",
        "quiz": [
          {
            "question": "Question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswerIndex": 0 // Integer 0-3
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as LessonContent;
  } catch (e) {
    console.error("Lesson generation error:", e);
    return {
      topic: topic,
      content: "Could not load lesson content. Please check your internet connection and try again.",
      quiz: []
    };
  }
}