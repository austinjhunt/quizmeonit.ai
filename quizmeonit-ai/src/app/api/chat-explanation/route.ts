import { GoogleGenerativeAI, GoogleGenerativeAIResponseError, SafetyRating } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Initialize the Google Generative AI SDK
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, userMessage, chatHistory } = body as {
      question: QuizQuestion;
      userMessage: string;
      chatHistory: ChatMessage[];
    };

    // Basic validation
    if (!question || !question.questionText || !question.explanation) {
      return NextResponse.json({ error: "Missing or invalid 'question' object in request body." }, { status: 400 });
    }
    if (!userMessage || typeof userMessage !== "string" || userMessage.trim() === "") {
      return NextResponse.json({ error: "Missing or invalid 'userMessage' in request body." }, { status: 400 });
    }
    if (!chatHistory || !Array.isArray(chatHistory)) {
      return NextResponse.json({ error: "Missing or invalid 'chatHistory' array in request body." }, { status: 400 });
    }

    // Construct the prompt for the Gemini model
    let prompt = `You are a helpful AI assistant and tutor. The user is asking a follow-up question about an explanation to a quiz question.
The original quiz question was: "${question.questionText}"
The provided explanation was: "${question.explanation}"
The correct answer was: "${question.correctAnswer}"

Here is the conversation history so far:
`;

    chatHistory.forEach((msg) => {
      prompt += `${msg.sender === "user" ? "User" : "AI"}: ${msg.text}\n`;
    });

    prompt += `
The user's latest message is: "${userMessage}"

Based on all this context, please provide a concise and helpful response to the user's latest message. 
If the user is challenging the explanation, review it carefully against the question and correct answer.
If they are asking for clarification or more details, provide it.
If the query seems unrelated to the question or explanation, gently guide them back or state that you can only discuss the quiz item.
Your response should be directly addressing the user's latest message.
`;

    // Get the generative model
    const model = genAI.getGenerativeModel({
      model: process.env.GOOGLE_GEMINI_MODEL ? process.env.GOOGLE_GEMINI_MODEL : "gemini-1.5-pro",
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const aiTextResponse = response.text();

    return NextResponse.json({ aiMessage: aiTextResponse }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof GoogleGenerativeAIResponseError) {
      console.error("Error in chat-explanation API:", error);
      if (error.message && error.message.includes("API key not valid")) {
        return NextResponse.json({ error: "Server configuration error: Invalid API key." }, { status: 500 });
      }
      // Check if it's a GoogleGenerativeAI error (e.g., safety filters)
      if (error.constructor && error.constructor.name === "GoogleGenerativeAIResponseError") {
        const response = error.response;
        const safetyRatings = response?.promptFeedback?.safetyRatings || [];
        let message = "The AI could not generate a response due to content restrictions.";
        if (safetyRatings.length > 0) {
          message += ` Blocked due to: ${safetyRatings.map((r: SafetyRating) => r.category).join(", ")}.`;
        }
        return NextResponse.json({ error: message, details: safetyRatings }, { status: 400 });
      }
      return NextResponse.json(
        { error: "An unexpected error occurred while processing the chat.", details: error.message },
        { status: 500 },
      );
    } else {
      return NextResponse.json({ error: "Server configuration error: Invalid API key." }, { status: 401 });
    }
  }
}
