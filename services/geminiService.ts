import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedContent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeUrl = async (url: string): Promise<ExtractedContent> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Go to this URL: ${url}. 
      
      The user wants to download a Twitter/X Article (long-form post) or a Thread as a PDF.
      
      1. If this is a Twitter Article (long-form), extract the entire body text.
      2. If this is a Thread, stitch together the main posts to form a coherent article.
      
      Format the output specifically as a structured JSON object. 
      - The 'content' field must be the full text, formatted as a clean article body. Use paragraph breaks.
      - The 'title' should be the first sentence or the headline of the article/thread.
      - The 'summary' should be a concise abstract.
      
      Generate 3 relevant tags based on the topic.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            content: { type: Type.STRING },
            summary: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "author", "content", "summary", "tags"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as ExtractedContent;
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Failed to extract content. Ensure the link is valid and public.");
  }
};