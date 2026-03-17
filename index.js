// 1. IMPORTACIÓN
import { autoResizeTextarea, setLoading } from "./utils.js"

// Import marked for markdown parsing and DOMPurify for security
import { marked } from "marked";
import DOMPurify from "dompurify";



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
- Make your gift suggestions thoughtful and practical based on the user's description.
- IMPORTANT: You have access to a web search tool. Use it to find real, currently available products. Prefer products that are widely available and well-reviewed.
- PAY CLOSE ATTENTION TO CONTEXT:
  - If the user mentions a specific budget, NEVER exceed it. You must find real items that fit the budget.
  - If the user mentions a specific location, ONLY suggest gifts that can be easily acquired or experienced in that location.
- If you can't find a working link, say so rather than guessing.
</rules>

<formatting>
Your response must be beautifully formatted in structured Markdown. Use emojis where appropriate.
Do not use excessive bullet points for explanations; use smoothly flowing prose paragraphs.

For EACH gift suggestion, you must provide exactly this structure:
### [Gift Name] [Emoji]
[A smoothly flowing prose paragraph explaining why this gift is perfect for them]
#### How to get it
[A short explanation guiding the user on where to purchase this gift, including one or more REAL links to websites/businesses where the gift can be bought. Also include the estimated current price.]

After listing all gifts, end your response with exactly these two sections:

### Questions for you
[Ask 1-2 follow-up questions that would help you improve the recommendations]

## Wanna browse yourself?
[Provide 2-3 markdown links to various ecommerce sites (like Amazon, Etsy, etc.) with relevant search queries and filters already applied in the URL based on the user's request]
</formatting>

Skip intros and conclusions. Only output the gift suggestions and the final sections.`
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

  // Allow submitting with Enter key (but Shift+Enter allows new lines)
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent default new line
      
      // Don't submit if it's currently loading
      if (!lampButton.disabled) {
        handleGiftRequest(e);
      }
    }
  });
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
    // Determine the correct API URL based on where the app is running
    const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:3000/api/gift' 
      : '/api/gift';

    // Send the request to our secure Node.js backend
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: conversationHistory }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Prepare to read the streamed SSE response
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullResponse = "";

    // Read chunks as they arrive from the backend
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode the byte stream into text
      const chunkText = decoder.decode(value, { stream: true });
      
      // The chunks come in SSE format like: "data: {"content":"Hello"}\n\n"
      // We need to parse each data line
      const lines = chunkText.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataString = line.slice(6); // Remove "data: "
          
          if (dataString === "[DONE]") {
             // Server sent completion signal
             continue; 
          }

          try {
            const parsedData = JSON.parse(dataString);
            
            // Check for server errors
            if (parsedData.error) {
               throw new Error(parsedData.error);
            }
            
            if (parsedData.content) {
              fullResponse += parsedData.content;
              
              // Parse current accumulated text from markdown to safe HTML
              const rawHtml = marked.parse(fullResponse);
              const cleanHtml = DOMPurify.sanitize(rawHtml);

              // Update the UI *and* keep the blinking cursor at the end
              outputContent.innerHTML = cleanHtml + '<span class="typing-active"></span>';
            }
          } catch (e) {
            console.error("Error parsing JSON chunk:", e, dataString);
          }
        }
      }
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
