import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Initialize the Google Generative AI SDK
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, difficulty, questionType } = body;

    // Basic validation
    if (!topic || !difficulty || !questionType) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    if (questionType !== "Multiple Choice") {
      return NextResponse.json(
        { error: "Invalid question type. Only 'Multiple Choice' is supported for now." },
        { status: 400 },
      );
    }

    // Construct the prompt for the Gemini model
    const prompt = `
      Generate 3 multiple-choice questions about the topic: "${topic}".
      The difficulty level should be: "${difficulty}".
      Each question must have:
      - "questionText": A string for the question itself.
      - "options": An array of 4 distinct string options.
      - "correctAnswer": A string that exactly matches one of the provided options.
      - "explanation": A string explaining why the answer is correct.

      The entire output must be a valid JSON array of question objects. Do not include any text outside of the JSON array.
      Ensure the JSON is well-formed and can be directly parsed.

      Example format:
      [
        {
          "questionText": "What is the capital of France?",
          "options": ["Berlin", "Madrid", "Paris", "Rome"],
          "correctAnswer": "Paris",
          "explanation": "Paris is the capital and most populous city of France."
        },
        {
          "questionText": "What is 2 + 2?",
          "options": ["3", "4", "5", "6"],
          "correctAnswer": "4",
          "explanation": "The sum of 2 and 2 is 4."
        }
      ]
    `;

    // Get the generative model
    const model = genAI.getGenerativeModel({
      model: process.env.GOOGLE_GEMINI_MODEL ? process.env.GOOGLE_GEMINI_MODEL : "gemini-1.5-pro",
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Attempt to parse the LLM's response
    let questions;
    try {
      // Sometimes the model might return the JSON wrapped in ```json ... ```
      const cleanedText = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      questions = JSON.parse(cleanedText);
    } catch (error: unknown) {
      if (error instanceof SyntaxError) {
        console.error("Failed to parse JSON response from LLM:", text);
        return NextResponse.json(
          { error: "Failed to parse quiz data from AI response. The response was not valid JSON.", rawResponse: text },
          { status: 500 },
        );
      } else {
        return NextResponse.json(
          { error: "Failed to parse quiz data from AI response. The response was not valid JSON.", rawResponse: text },
          { status: 500 },
        );
      }
    }

    // Further validation to ensure the structure is as expected
    if (
      !Array.isArray(questions) ||
      questions.some((q) => !q.questionText || !q.options || !q.correctAnswer || !q.explanation)
    ) {
      console.error("Invalid JSON structure received from LLM:", questions);
      return NextResponse.json(
        { error: "AI response did not follow the expected JSON structure.", data: questions },
        { status: 500 },
      );
    }

    return NextResponse.json(questions, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error generating quiz:", error);
      if (error.message && error.message.includes("API key not valid")) {
        return NextResponse.json({ error: "Server configuration error: Invalid API key." }, { status: 500 });
      }
      return NextResponse.json({ error: "An unexpected error occurred.", details: error.message }, { status: 500 });
    } else {
      console.error("Error generating quiz:", error);
      return NextResponse.json({ error: "Server configuration error: Invalid API key." }, { status: 401 });
    }
  }
}
