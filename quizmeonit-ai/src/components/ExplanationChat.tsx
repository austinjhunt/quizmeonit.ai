"use client";

import { useState, FormEvent, useEffect, useRef } from "react";

interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface ExplanationChatProps {
  question: QuizQuestion;
}

interface Message {
  sender: "user" | "ai";
  text: string;
}

export default function ExplanationChat({ question }: ExplanationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add an initial AI message when the component mounts and messages are empty
    if (messages.length === 0) {
      setMessages([{ sender: "ai", text: "Hello! How can I help you understand this explanation better?" }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question]); // Rerun if the question changes, to reset the chat with a new greeting

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userMessageText = currentMessage.trim();
    if (userMessageText === "") return;

    const newUserMessage: Message = { sender: "user", text: userMessageText };

    // Prepare chat history for API: all messages *before* adding the new user message
    // but for the display, we add it immediately.
    const historyForAPI = [...messages, newUserMessage];

    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setCurrentMessage("");
    setIsLoading(true);
    setChatError(null);

    try {
      const response = await fetch("/api/chat-explanation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question,
          userMessage: userMessageText,
          chatHistory: historyForAPI, // Send history including the latest user message
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || `Error: ${response.status} ${response.statusText}`;
        setChatError(errorMsg);
        // Optionally add AI error message to chat for immediate visibility
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "ai", text: `Sorry, I encountered an error: ${errorMsg}` },
        ]);
      } else {
        setMessages((prevMessages) => [...prevMessages, { sender: "ai", text: data.aiMessage }]);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.error("Failed to send message or parse response:", e);
        const errorMsg = e.message || "An unexpected error occurred while sending your message.";
        setChatError(errorMsg);
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "ai", text: `Sorry, an unexpected error occurred: ${errorMsg}` },
        ]);
      } else {
        setChatError("An unexpected error occurred while sending your message.");
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "ai", text: `Sorry, an unexpected error occurred.` },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 p-5 bg-slate-800/80 border border-slate-700/80 rounded-xl shadow-lg backdrop-blur-md">
      <h3 className="text-lg font-semibold text-purple-300 mb-2">Need Clarification?</h3>
      <p className="text-xs text-slate-400 mb-1">
        Original Question: <i className="text-slate-300">{question.questionText}</i>
      </p>
      <p className="text-xs text-slate-400 mb-4">
        Provided Explanation: <i className="text-slate-300">{question.explanation}</i>
      </p>

      {/* Scrollable chat messages area */}
      <div className="h-60 overflow-y-auto mb-4 p-3 bg-slate-900/60 rounded-lg space-y-3 border border-slate-700/70">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`px-3 py-2 rounded-xl max-w-[85%] text-sm shadow-md break-words ${
                msg.sender === "user"
                  ? "bg-purple-600 text-white rounded-br-lg" // User messages
                  : "bg-slate-600 text-slate-100 rounded-bl-lg" // AI messages
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* Anchor for scrolling to bottom */}
      </div>

      {/* Display chat error messages */}
      {chatError && (
        <div
          className="mb-3 bg-red-600/20 border border-red-500/50 text-red-300 px-3.5 py-2.5 rounded-lg text-xs shadow"
          role="alert"
        >
          <strong className="font-semibold text-red-200">Chat Error:</strong> {chatError}
        </div>
      )}

      {/* Chat input form */}
      <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder="Ask a follow-up question..."
          className="flex-grow px-3.5 py-2.5 bg-slate-700/90 border border-slate-600/80 rounded-lg shadow-sm 
                     focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-purple-500/70 
                     sm:text-sm text-slate-50 placeholder-slate-400/80 disabled:opacity-50 transition-colors duration-150"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || currentMessage.trim() === ""}
          className="px-5 py-2.5 border border-transparent rounded-lg shadow 
                     text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800/80 focus:ring-purple-500/70 
                     disabled:bg-slate-500/70 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-150"
        >
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            "Send"
          )}
        </button>
      </form>
    </div>
  );
}
