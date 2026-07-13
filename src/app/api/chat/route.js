import { NextResponse } from "next/server";
import { runMemoConversationStep, memoDbTools } from "@/utils/memo-ai";

// Basic rate limiting/abuse prevention in-memory store
const ipStore = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const limit = 20; // max 20 requests
  const windowMs = 60 * 1000; // per minute
  
  if (!ipStore.has(ip)) {
    ipStore.set(ip, []);
  }
  
  const timestamps = ipStore.get(ip).filter(time => now - time < windowMs);
  timestamps.push(now);
  ipStore.set(ip, timestamps);
  
  return timestamps.length <= limit;
}

export async function POST(request) {
  try {
    // Basic rate limit
    const ip = request.headers.get("x-forwarded-for") || "local";
    if (!rateLimit(ip)) {
      return NextResponse.json({ 
        message: "تم طلب الكثير من الرسائل. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.",
        products: []
      }, { status: 429 });
    }

    const { messages, phone } = await request.json().catch(() => ({}));
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ 
        message: "الرسالة فارغة أو غير صالحة.",
        products: []
      }, { status: 400 });
    }

    // Limit conversation history sent to the model to the last 10 messages
    const slicedMessages = messages.slice(-10);

    // Keep track of products retrieved by tool calls
    let lastRetrievedProducts = [];

    // Copy sliced messages for the tool execution loop
    const conversationHistory = [...slicedMessages];

    // Inject active phone context if provided
    if (phone && phone.brand && phone.model) {
      conversationHistory.push({
        role: "system",
        content: `CRITICAL REMINDER: The user's active device is ${phone.brand} ${phone.model}. All product searches, recommendations, and compatibility statements must target this model by default. Do not suggest anything incompatible.`
      });
    }

    let loopLimit = 5;
    let finalMessage = null;

    while (loopLimit > 0) {
      loopLimit--;
      
      const assistantMessage = await runMemoConversationStep(conversationHistory);
      if (!assistantMessage) {
        throw new Error("لم يتم استلام رد من مساعد الذكاء الاصطناعي.");
      }

      // Add assistant message to history
      conversationHistory.push(assistantMessage);

      // Check if the assistant wants to execute tool calls
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        for (const toolCall of assistantMessage.tool_calls) {
          const { id: toolCallId } = toolCall;
          const { name, arguments: argsString } = toolCall.function || {};
          const args = JSON.parse(argsString || "{}");
          
          let toolResult = [];
          try {
            if (typeof memoDbTools[name] === "function") {
              // Execute the tool safely on the server
              if (name === "search_products") {
                toolResult = await memoDbTools.search_products(args.query);
              } else if (name === "search_by_device_compatibility") {
                toolResult = await memoDbTools.search_by_device_compatibility(args.device);
              } else if (name === "search_by_category") {
                toolResult = await memoDbTools.search_by_category(args.category);
              } else if (name === "search_by_price_range") {
                toolResult = await memoDbTools.search_by_price_range(args.min_price, args.max_price);
              } else if (name === "get_featured_products") {
                toolResult = await memoDbTools.get_featured_products();
              } else if (name === "get_new_arrivals") {
                toolResult = await memoDbTools.get_new_arrivals();
              }

              // Update last retrieved products
              if (Array.isArray(toolResult) && toolResult.length > 0) {
                lastRetrievedProducts = toolResult;
              }
            } else {
              toolResult = { error: `Tool ${name} not found.` };
            }
          } catch (toolError) {
            toolResult = { error: toolError.message };
          }

          // Push tool response to the history
          conversationHistory.push({
            role: "tool",
            tool_call_id: toolCallId,
            name: name,
            content: JSON.stringify(toolResult)
          });
        }
      } else {
        // No tool calls, assistant returned final text
        finalMessage = assistantMessage;
        break;
      }
    }

    if (!finalMessage) {
      throw new Error("تجاوز الحد الأقصى لمحاولات معالجة الطلب.");
    }

    // Format retrieved products for card rendering
    const formattedProducts = lastRetrievedProducts.map(p => ({
      id: p.id,
      name: p.name,
      name_en: p.name_en,
      price: p.price,
      image: p.image,
      stockStatus: p.is_in_stock ? "in_stock" : "out_of_stock",
      is_in_stock: p.is_in_stock,
      stock_quantity: p.stock_quantity,
      compatibility: p.compatible_models,
      category: p.category,
      badge: p.badge
    })).slice(0, 3); // Return max 3 matching products

    // Return final output
    return NextResponse.json({
      message: finalMessage.content || "",
      products: formattedProducts,
      suggestedActions: []
    });

  } catch (error) {
    console.error("AI Chat API Error:", error);
    
    // Friendly localized fallback errors
    const errorResponse = {
      message: "ثانية واحدة، واضح إن ميمو اتخانق مع السيرفر. جرّب تاني كمان لحظة.",
      products: []
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
