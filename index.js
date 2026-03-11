// 1. IMPORTACIÓN
import { checkEnvironment, autoResizeTextarea, setLoading } from "./utils.js"
import OpenAI from "openai";

// Import marked for markdown parsing and DOMPurify for security
import { marked } from "marked";
import DOMPurify from "dompurify";


// 2. CONFIGURACIÓN DEL CLIENTE
const client = new OpenAI({
  apiKey: import.meta.env.VITE_AI_KEY,
  baseURL: import.meta.env.VITE_AI_URL,
  dangerouslyAllowBrowser: true
});

// 3. SEGURIDAD
checkEnvironment();

// DOM Elements
const giftForm = document.getElementById("gift-form");
const userInput = document.getElementById("user-input");
const outputContainer = document.getElementById("output-container");
const outputContent = document.getElementById("output-content");
const lampButton = document.getElementById("lamp-button");

// Maintain conversation history
let conversationHistory = [
  {
    role: "system",
    content: `You are the Gift Genie!
    Make your gift suggestions thoughtful and practical.
    The user will describe the gift's recipient.
    You are fully bilingual in English and Spanish. Important: ALWAYS respond in the exact same language the user writes in.
    
    Your response must be beautifully formatted in structured Markdown. Use emojis where appropriate.
    
    Each gift must: 
      - Have a clear heading (using H3: ###)
      - A short explanation of why it would work

    Skip intros and conclusions. 
    Only output gift suggestions.
    End with a "Questions for you" section (using H3: ###) with follow-ups 
    that would help improve the recommendations.`
  }
];



function start() {
  // Setup UI event listeners (Estructura del profe)
  userInput.addEventListener("input", () => autoResizeTextarea(userInput));
  giftForm.addEventListener("submit", handleGiftRequest);
}

async function handleGiftRequest(e) {
  e.preventDefault();

  const userText = userInput.value.trim();
  if (!userText) return;

  // Set loading state (Usando función de utils.js)
  setLoading(true, lampButton, outputContainer, userInput);

  // UI Setup for new request immediately
  outputContent.innerHTML = "";
  outputContainer.classList.remove("hidden");
  outputContainer.classList.add("visible");

  // Add blinking cursor to indicate waiting for first byte
  outputContent.innerHTML = '<span class="typing-active"></span>';

  // Update history
  conversationHistory.push({
    role: "user",
    content: userText
  });

  try {
    const stream = await client.chat.completions.create({
      model: import.meta.env.VITE_AI_MODEL,
      messages: conversationHistory,
      stream: true // VITAL: Activa la respuesta en tiempo real
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      // Extract the text fragment from this specific chunk
      const content = chunk.choices[0]?.delta?.content || "";

      // Append to our full response tracker
      fullResponse += content;

      // Parse current accumulated text from markdown to safe HTML
      const rawHtml = marked.parse(fullResponse);
      const cleanHtml = DOMPurify.sanitize(rawHtml);

      // Update the UI *and* keep the blinking cursor at the end
      outputContent.innerHTML = cleanHtml + '<span class="typing-active"></span>';
    }

    // Done streaming. Save full response to history.
    conversationHistory.push({
      role: "assistant",
      content: fullResponse
    });

    // Remove the cursor when finished
    outputContent.innerHTML = DOMPurify.sanitize(marked.parse(fullResponse));

  } catch (error) {
    console.error("Error:", error);
    let errorMessage = "Oops! The magic fizzled out. Please try again.";

    if (error.status === 401 || error.status === 403) {
      errorMessage = "Authentication error: Please check your AI API key in the .env file.";
    } else if (error.status >= 500) {
      errorMessage = "The magical realm is currently too busy. Please wait a moment and try again.";
    }

    outputContainer.classList.remove("hidden");
    outputContainer.classList.add("visible");
    outputContent.innerHTML = `<p class="error-text">⚠️ ${errorMessage}</p>`;
  } finally {
    // Clear loading state (Usando función de utils.js)
    setLoading(false, lampButton, outputContainer, userInput);
    userInput.value = "";
    // Aseguramos que vuelva a su altura original si usamos autoResizeTextarea
    userInput.style.height = "auto";
  }
}

// Iniciar app
start();
