import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI client securely on the server
const client = new OpenAI({
  apiKey: process.env.VITE_AI_KEY,
  baseURL: process.env.VITE_AI_URL,
});

// The main API endpoint for gift requests
app.post("/api/gift", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  // Set headers for Server-Sent Events (SSE) to allow streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await client.chat.completions.create({
      model: process.env.VITE_AI_MODEL,
      messages: messages,
      temperature: 1.2,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        // Send each chunk to the client natively as an SSE message
        // We use JSON.stringify to safely encode newlines and special characters
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Tell the frontend that we're done streaming
    res.write("data: [DONE]\n\n");
    res.end();

  } catch (error) {
    console.error("Server Error:", error);
    // Send error message safely
    res.write(`data: ${JSON.stringify({ error: "The magical realm is currently too busy." })}\n\n`);
    res.end();
  }
});

// Start the server only if we aren't running in a serverless environment like Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`🧞 Backend Genie Server listening on local port ${port}`);
  });
}

// Export the Express API for Vercel's serverless platform
export default app;
