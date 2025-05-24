import { GenerateContentRequest, GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Initialize the Google Generative AI SDK
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { difficulty } = body;

    if (!difficulty) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const prompt = `
      Return a random quiz topic (max topic words: 5) with the following difficulty level: ${difficulty}.

      The entire output must be a valid JSON object. Do not include any text outside of the JSON object.
      Ensure the JSON is well-formed and can be directly parsed.

      Example format for easy level:
      { "topic": "basic multiplication" }
      { "topic": "identifying shapes" }
      { "topic": "animal sounds" }

      Example format for college level:
      { "topic": "postmodernism" }
      { "topic": "quantum mechanics" }
      { "topic": "ethical dilemmas" }
    `;

    // Define the generation configuration
    const generationConfig = {
      temperature: 1.1, // Adjust this value (e.g., 0.8 to 1.1) for desired randomness
      // topP: 0.95,
      // topK: 40,
    };

    const model = genAI.getGenerativeModel({
      model: process.env.GOOGLE_GEMINI_MODEL ? process.env.GOOGLE_GEMINI_MODEL : "gemini-1.5-pro",
    });

    const conf: GenerateContentRequest = {
      contents: [{ role: "user", parts: [{ text: prompt }] }], // The prompt content
      generationConfig: generationConfig, // The generation configuration
    };
    // THIS IS THE CORRECT WAY TO PASS generationConfig to generateContent
    const result = await model.generateContent(conf);

    const response = result.response;
    let text = response.text();

    console.log("LLM Raw Response Text before parsing:", text);

    let data;
    try {
      const cleaned = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      data = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse JSON response from LLM (Error in JSON.parse):", e);
      return NextResponse.json(
        {
          error: "Failed to parse quiz data from AI response. The response was not valid JSON.",
          rawResponseFromLLM: response.text(),
          cleanedTextAttemptedToParse: text,
          parseErrorDetails: (e as Error).message,
        },
        { status: 500 },
      );
    }

    if (!data || !("topic" in data) || typeof data.topic !== "string") {
      return NextResponse.json(
        {
          error: "Invalid response from LLM. Expected a JSON object with a string 'topic' key.",
          rawResponseFromLLM: response.text(),
          parsedData: data,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Error generating quiz (Top-level catch):", error);
    if (error.message && error.message.includes("API key not valid")) {
      return NextResponse.json({ error: "Server configuration error: Invalid API key." }, { status: 500 });
    }
    return NextResponse.json({ error: "An unexpected error occurred.", details: error.message }, { status: 500 });
  }
}
