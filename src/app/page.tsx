"use client";

import { useState, FormEvent } from "react";
import ExplanationChat from "@/components/ExplanationChat";

interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

// Extend the QuizQuestion interface for local state management
interface QuizQuestionWithState extends QuizQuestion {
  selectedAnswer: string | null;
  isChecked: boolean;
}

export default function Home() {
  const [topic, setTopic] = useState<string>("");
  const [randomTopicLoading, setRandomTopicLoading] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<string>("Elementary");
  // Change quizData to hold the new state-extended type
  const [quizData, setQuizData] = useState<QuizQuestionWithState[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const questionType = "Multiple Choice";

  const handleGetRandomTopic = async () => {
    try {
      const response = await fetch("/api/get-random-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulty: difficulty,
        }),
      });
      const data = await response.json();
      return data.topic;
    } catch (error) {
      console.error("Error fetching random topic:", error);
    }
  };

  const handleGenerateQuiz = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setQuizData(null); // Clear previous quiz

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic, difficulty, questionType }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Error: ${response.status} ${response.statusText}`);
      } else {
        // Initialize selectedAnswer and isChecked for each question
        const initialQuizData: QuizQuestionWithState[] = data.map((q: QuizQuestion) => ({
          ...q,
          selectedAnswer: null,
          isChecked: false,
        }));
        setQuizData(initialQuizData);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.error("Failed to fetch quiz:", e);
        setError(e.message || "An unexpected error occurred while fetching the quiz.");
      } else {
        setError("An unexpected error occurred while fetching the quiz.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for selecting an answer
  const handleOptionSelect = (questionIndex: number, selectedOption: string) => {
    if (quizData) {
      const updatedQuizData = quizData.map((q, qIndex) => {
        if (qIndex === questionIndex && !q.isChecked) {
          // Only allow selection if not already checked
          return { ...q, selectedAnswer: selectedOption };
        }
        return q;
      });
      setQuizData(updatedQuizData);
    }
  };

  // Handler for checking the answer
  const handleCheckAnswer = (questionIndex: number) => {
    if (quizData) {
      const updatedQuizData = quizData.map((q, qIndex) => {
        if (qIndex === questionIndex) {
          return { ...q, isChecked: true };
        }
        return q;
      });
      setQuizData(updatedQuizData);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 to-slate-700 text-white">
      <div className="w-full max-w-3xl space-y-10">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            QuizMeOnIt.AI
          </h1>
          <p className="mt-3 text-lg sm:text-xl text-slate-300">Generate challenging quizzes on any topic with AI.</p>
        </header>

        <form
          onSubmit={handleGenerateQuiz}
          className="bg-slate-800 p-6 sm:p-8 shadow-2xl rounded-xl space-y-6 border border-slate-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-slate-300 mb-1">
                Topic
              </label>
              <input
                type="text"
                id="topic"
                name="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-slate-100 placeholder-slate-400"
                placeholder="e.g., Quantum Physics, Renaissance Art"
                required
              />
              {randomTopicLoading ? (
                <div role="status" className="mt-4 display-flex justify-center">
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    />
                  </svg>
                  <span className="sr-only">Loading...</span>
                </div>
              ) : (
                <button
                  type="button"
                  title="Generate a random topic idea"
                  className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors duration-150 cursor-hover opacity-75"
                  onClick={async (e) => {
                    e.preventDefault();
                    setRandomTopicLoading(true);
                    const topic = await handleGetRandomTopic();
                    setTopic(topic);
                    setRandomTopicLoading(false);
                  }}
                >
                  ✨ Feeling uninspired? Get a random topic!
                </button>
              )}
            </div>

            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-slate-300 mb-1">
                Difficulty
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-slate-100"
              >
                <option>Elementary</option>
                <option>High School</option>
                <option>College</option>
                <option>Expert</option>
              </select>
            </div>
          </div>

          {/* <div>
            <label htmlFor="questionType" className="block text-sm font-medium text-slate-300 mb-1">
              Question Type
            </label>
            <select
              id="questionType"
              name="questionType"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-slate-100"
            >
              <option>Multiple Choice</option>
            </select>
          </div> */}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-purple-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                Generating...
              </>
            ) : (
              "Generate Quiz"
            )}
          </button>
        </form>

        <div id="quiz-display-area" className="mt-12 w-full">
          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <div className="animate-pulse text-center">
                <svg
                  className="mx-auto h-12 w-12 text-purple-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-3 text-lg font-medium text-slate-300">Generating your quiz, please wait...</p>
                <p className="text-sm text-slate-400">This might take a few moments.</p>
              </div>
            </div>
          )}

          {error && (
            <div
              className="bg-red-500/10 border border-red-700 text-red-300 px-4 py-4 rounded-lg shadow-md"
              role="alert"
            >
              <div className="flex">
                <div className="py-1">
                  <svg
                    className="fill-current h-6 w-6 text-red-400 mr-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M12.432 0c1.34 0 2.01 1.43 1.438 2.432L10.136 14.02c-.495.936-1.398 1.432-2.432 1.432s-1.937-.496-2.432-1.432L1.568 2.432C1 1.43.66 0 2 0h10.432zM11 14a1 1 0 11-2 0 1 1 0 012 0zm-1-3a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-red-200">Oops! Something went wrong.</p>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {quizData && quizData.length > 0 && (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-8">
                Your Quiz is Ready!
              </h2>
              {quizData.map((question, index) => (
                <div
                  key={index}
                  className="bg-slate-800 p-6 shadow-xl rounded-lg border border-slate-700 hover:shadow-purple-500/20 transition-shadow duration-300"
                >
                  <h3 className="font-semibold text-xl text-purple-300 mb-3">
                    <span className="text-slate-400 mr-2">Q{index + 1}:</span> {question.questionText}
                  </h3>
                  <ul className="space-y-2 mb-4">
                    {question.options.map((option, optIndex) => (
                      <li
                        key={optIndex}
                        onClick={() => handleOptionSelect(index, option)}
                        className={`
                          block w-full p-3 rounded-md border cursor-pointer transition-colors duration-150
                          ${
                            question.selectedAnswer === option
                              ? "bg-purple-600/30 border-purple-500 text-purple-200" // Selected but not checked
                              : "bg-slate-700 border-slate-600 hover:bg-slate-600/70 text-slate-300"
                          }
                          ${
                            question.isChecked && option === question.correctAnswer
                              ? "bg-green-500/20 border-green-500 text-green-300 font-medium !cursor-default" // Correct after checking
                              : ""
                          }
                          ${
                            question.isChecked &&
                            question.selectedAnswer === option &&
                            option !== question.correctAnswer
                              ? "bg-red-500/20 border-red-500 text-red-300 font-medium !cursor-default" // Incorrect after checking
                              : ""
                          }
                          ${question.isChecked ? "!cursor-default" : ""}
                        `}
                      >
                        {String.fromCharCode(65 + optIndex)}. {option}
                      </li>
                    ))}
                  </ul>

                  {!question.isChecked &&
                    question.selectedAnswer && ( // Show check button if an answer is selected and not yet checked
                      <button
                        onClick={() => handleCheckAnswer(index)}
                        className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 transition-colors duration-150"
                      >
                        Check Answer
                      </button>
                    )}

                  {question.isChecked && ( // Show explanation only if checked
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <details className="group">
                        <summary className="font-semibold text-sm text-purple-400 hover:text-purple-300 cursor-pointer list-none flex justify-between items-center">
                          <span>View Answer & Explanation</span>
                          <svg
                            className="w-5 h-5 transform transition-transform duration-200 group-open:rotate-180"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            ></path>
                          </svg>
                        </summary>
                        <div className="mt-3 space-y-3 text-sm">
                          <p className="text-green-400">
                            <strong className="text-green-300">Correct Answer:</strong> {question.correctAnswer}
                          </p>
                          <p className="text-slate-300">
                            <strong className="text-purple-300">Explanation:</strong> {question.explanation}
                          </p>
                          {/* Integrate ExplanationChat component here */}
                          <ExplanationChat question={question} />
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {quizData && quizData.length === 0 && !isLoading && (
            <p className="text-center text-slate-400 py-10 text-lg">
              The AI couldn&apos;t generate questions for this topic. Please try a different or more specific topic.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
