import { ExtractedContent } from "../types";

const API_URL = "http://localhost:3002";

/**
 * Fetch X Article content via backend scraper
 */
export async function fetchTweet(url: string): Promise<ExtractedContent> {
  // Validate URL format
  if (!url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/i)) {
    throw new Error("Invalid Twitter/X URL. Please paste a valid tweet or article link.");
  }

  try {
    const response = await fetch(`${API_URL}/api/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to fetch article: ${response.status}`);
    }

    const data = await response.json();

    if (!data.content || data.content.length < 10) {
      throw new Error("Could not extract article content. The article may be private or require login.");
    }

    return data as ExtractedContent;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Cannot connect to scraper service. Make sure the backend server is running on port 3002.");
    }
    throw error;
  }
}
