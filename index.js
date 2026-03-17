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
const resetButton = document.getElementById("reset-button");

// Maintain conversation history
let conversationHistory = [
  {
    role: "system",
    content: `<persona>
You are the Gift Genie! A welcoming, magical, and friendly assistant who helps users find the perfect gift.
You are fully bilingual in English and Spanish. Important: ALWAYS respond in the exact same language the user writes in.
</persona>

<rules>
- Make your gift suggestions thoughtful and practical based on the user's description of the recipient.
- PAY CLOSE ATTENTION TO CONTEXT:
  - If the user mentions a specific budget, NEVER exceed it.
  - If the user mentions a specific location, ONLY suggest gifts that can be easily acquired or experienced in that location.
- Keep your tone concise (don't over-explain your magic), but remain friendly.
</rules>

<formatting>
Your response must be beautifully formatted in structured Markdown. Use emojis where appropriate.
Do not use excessive bullet points for explanations; use smoothly flowing prose paragraphs.

For EACH gift suggestion, you must provide exactly this structure:
### [Gift Name] [Emoji]
[A smoothly flowing prose paragraph explaining why this gift is perfect for them]
#### How to get it
[A short explanation guiding the user on where/how to purchase or organize this gift within their mentioned location/constraints]

After listing all gifts, end your response with exactly this section:
### Questions for you
[Ask 1-2 follow-up questions that would help you improve the recommendations if they need more ideas]
</formatting>

Skip intros and conclusions. Only output the gift suggestions and the final questions section.`
  }
];

function resetApp() {
  // Keep the system prompt at index 0, wipe everything else
  conversationHistory.length = 1;
  
  // Reset UI elements
  outputContent.innerHTML = "";
  outputContainer.classList.remove("visible");
  outputContainer.classList.add("hidden");
  resetButton.classList.add("hidden");
  
  // Bring focus back to the input for a new wish
  userInput.focus();
}



function start() {
  // Setup UI event listeners (Estructura del profe)
  userInput.addEventListener("input", () => autoResizeTextarea(userInput));
  giftForm.addEventListener("submit", handleGiftRequest);
  resetButton.addEventListener("click", resetApp);
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
  resetButton.classList.add("hidden");

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
      temperature: 1.2, // Mayor temperatura = ideas más locas y creativas
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

    // Clear input now that request is successful
    userInput.value = "";
    // Ensure it returns to its original height
    userInput.style.height = "auto";
    
    // Show the reset button allowing them to start over easily
    resetButton.classList.remove("hidden");

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
  }
}

// Iniciar app
start();
