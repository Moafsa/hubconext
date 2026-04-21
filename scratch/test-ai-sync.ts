
import { analyzeChatAndUpdateContent } from "../src/app/actions/ai-actions";

async function testSync() {
  console.log("Testing AI Synchronization...");
  const data = {
    title: "Test Project",
    currentBriefing: { objective: "Test objective" },
    currentScope: "Old scope",
    currentContract: "Old contract",
    chatHistory: "Client: I want video testimonials.\nAgency: Sure, we will add that.",
    suggestedTech: "Next.js"
  };

  try {
    const result = await analyzeChatAndUpdateContent(data);
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testSync();
