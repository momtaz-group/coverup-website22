import { NextResponse } from "next/server";
import { runMemoConversationStep, memoDbTools, generateChatBriefAndTitle, checkNeedsDatabaseSearch } from "@/utils/memo-ai";
import { getAuthenticatedUser } from "@/utils/server-auth";
import { getSupabaseServerClient } from "@/utils/supabase";

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

    const { messages, phone, chatId } = await request.json().catch(() => ({}));
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ 
        message: "الرسالة فارغة أو غير صالحة.",
        products: []
      }, { status: 400 });
    }

    const user = await getAuthenticatedUser(request).catch(() => null);

    // Advanced Rate Limit: 10 messages from user each 3 hours
    if (user) {
      try {
        const supabaseClient = getSupabaseServerClient();
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        const { data: recentChats } = await supabaseClient
          .from("memo_chats")
          .select("messages")
          .eq("user_id", user.id)
          .gte("updated_at", threeHoursAgo);

        let userMsgCount = 0;
        if (recentChats) {
          recentChats.forEach(c => {
            if (Array.isArray(c.messages)) {
              userMsgCount += c.messages.filter(m => m.role === "user").length;
            }
          });
        }
        
        if (userMsgCount >= 10) {
          return NextResponse.json({ 
            message: "لقد وصلت للحد الأقصى للمحادثات مع ميمو (10 رسائل كل 3 ساعات). يرجى المحاولة لاحقاً.",
            products: []
          }, { status: 429 });
        }
      } catch (err) {
        console.error("Rate limit check error:", err);
      }
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

    // Fast Pre-check to determine if we should allow database tools
    const lastUserMsg = messages[messages.length - 1]?.content || "";
    const needsDb = await checkNeedsDatabaseSearch(lastUserMsg);

    while (loopLimit > 0) {
      loopLimit--;
      
      const assistantMessage = await runMemoConversationStep(conversationHistory, needsDb);
      if (!assistantMessage) {
        throw new Error("لم يتم استلام رد من مساعد الذكاء الاصطناعي.");
      }

      // Add assistant message to history
      conversationHistory.push(assistantMessage);

      // Check if the assistant wants to execute tool calls
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        const batchProducts = [];
        const toolPromises = assistantMessage.tool_calls.map(async (toolCall) => {
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

              if (Array.isArray(toolResult) && toolResult.length > 0) {
                batchProducts.push(...toolResult);
              }
            } else {
              toolResult = { error: `Tool ${name} not found.` };
            }
          } catch (toolError) {
            toolResult = { error: toolError.message };
          }

          return {
            role: "tool",
            tool_call_id: toolCallId,
            name: name,
            content: JSON.stringify(toolResult)
          };
        });

        const toolResponses = await Promise.all(toolPromises);
        conversationHistory.push(...toolResponses);

        if (batchProducts.length > 0) {
          // Remove duplicates
          const seen = new Set();
          const uniqueProducts = [];
          for (const p of batchProducts) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              uniqueProducts.push(p);
            }
          }
          lastRetrievedProducts = uniqueProducts;
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

    // Sync chat to database if logged in
    let savedChatId = chatId;
    let chatTitle = "محادثة جديدة";
    let chatSummary = "محادثة مع ميمو";

    if (user) {
      try {
        const supabaseClient = getSupabaseServerClient();
        const finalChatMessages = [
          ...messages,
          { role: "assistant", content: finalMessage.content }
        ];

        const isNewChat = !chatId || chatId === "new" || chatId === "null" || chatId === "undefined";

        if (isNewChat) {
          // Only generate brief and title for NEW chats
          const brief = await generateChatBriefAndTitle(finalChatMessages);
          chatTitle = brief.title || chatTitle;
          chatSummary = brief.summary || chatSummary;

          const { data: newChat, error: insertError } = await supabaseClient
            .from("memo_chats")
            .insert({
              user_id: user.id,
              messages: finalChatMessages,
              title: chatTitle,
              summary: chatSummary
            })
            .select("id")
            .single();

          if (insertError) {
            console.error("Error inserting new chat:", insertError);
          } else if (newChat) {
            savedChatId = newChat.id;
          }
        } else {
          // Update existing chat WITHOUT overwriting title and summary
          const { error: updateError } = await supabaseClient
            .from("memo_chats")
            .update({
              messages: finalChatMessages,
              updated_at: new Date().toISOString()
            })
            .eq("id", chatId)
            .eq("user_id", user.id);
          
          if (updateError) {
            console.error("Error updating chat:", updateError);
          }
        }
      } catch (dbErr) {
        console.error("Database save error in chat route:", dbErr);
      }
    }

    // Return final output
    return NextResponse.json({
      message: finalMessage.content || "",
      products: formattedProducts,
      suggestedActions: [],
      chatId: savedChatId || null,
      title: chatTitle,
      summary: chatSummary
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
