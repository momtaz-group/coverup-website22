import { getProducts } from "./store-db";

// Helper function to normalize device names for fuzzy matching
export function normalizeDevice(input) {
  if (!input) return "";
  let name = input.toLowerCase().trim();
  name = name.replace(/ايفون/g, "iphone");
  name = name.replace(/سامسونج/g, "samsung");
  name = name.replace(/جالاكسي|جالكسي/g, "galaxy");
  name = name.replace(/برو/g, "pro");
  name = name.replace(/ماكس/g, "max");
  name = name.replace(/الترا/g, "ultra");
  name = name.replace(/\s+/g, " ");

  if (name.includes("iphone")) {
    const numMatch = name.match(/\d+/);
    const version = numMatch ? numMatch[0] : "";
    const isPro = name.includes("pro");
    const isMax = name.includes("max");
    const parts = ["iPhone", version];
    if (isPro) parts.push("Pro");
    if (isMax) parts.push("Max");
    return parts.filter(Boolean).join(" ");
  }

  if (name.includes("samsung") || name.includes("galaxy") || /^[sa]\d+/i.test(name)) {
    const numMatch = name.match(/[sa]\d+/i) || name.match(/\d+/);
    let num = numMatch ? numMatch[0].toUpperCase() : "";
    if (num && !num.startsWith("S") && !num.startsWith("A")) {
      num = "S" + num;
    }
    const isUltra = name.includes("ultra");
    const parts = ["Samsung", num];
    if (isUltra) parts.push("Ultra");
    return parts.filter(Boolean).join(" ");
  }

  return input;
}

// Helper to normalize query category name
function normalizeCategory(cat) {
  if (!cat) return "";
  const c = cat.toLowerCase().trim();
  if (c.includes("magsafe")) return "كفرات MagSafe";
  if (c.includes("case") || c.includes("cover") || c.includes("كفر") || c.includes("جراب")) return "كفرات";
  if (c.includes("screen") || c.includes("glass") || c.includes("protect") || c.includes("شاش") || c.includes("اسكرين")) return "حماية الشاشة";
  return cat;
}

// Safe read-only backend helper functions
export const memoDbTools = {
  async search_products(query) {
    const all = await getProducts();
    const q = (query || "").toLowerCase().trim();
    if (!q) return [];
    
    return all.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.name_en && p.name_en.toLowerCase().includes(q)) ||
      p.description.toLowerCase().includes(q) ||
      (p.description_en && p.description_en.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q) ||
      (p.category_en && p.category_en.toLowerCase().includes(q))
    ).slice(0, 6);
  },

  async search_by_device_compatibility(device) {
    const all = await getProducts();
    const target = normalizeDevice(device).toLowerCase();
    if (!target) return [];

    return all.filter(p => {
      if (!Array.isArray(p.compatible_models)) return false;
      return p.compatible_models.some(model => {
        const normModel = normalizeDevice(model).toLowerCase();
        return normModel.includes(target) || target.includes(normModel);
      });
    }).slice(0, 6);
  },

  async search_by_category(category) {
    const all = await getProducts();
    const target = normalizeCategory(category);
    return all.filter(p => p.category === target).slice(0, 6);
  },

  async search_by_price_range(min_price, max_price) {
    const all = await getProducts();
    const min = Number(min_price) || 0;
    const max = Number(max_price) || Infinity;
    return all.filter(p => p.price >= min && p.price <= max).slice(0, 6);
  },

  async get_featured_products() {
    const all = await getProducts();
    return all.filter(p => p.featured === true).slice(0, 6);
  },

  async get_new_arrivals() {
    const all = await getProducts();
    // Sort by created_at desc (newest first)
    return all.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 4);
  }
};

// Azure OpenAI System configurations
export const SYSTEM_PROMPT = `
Memo is the official AI shopping assistant for CoverUp, a technology accessories store.

Memo's personality:
- Helpful, cooperative, attentive, and proactive.
- Smart and knowledgeable about phone accessories.
- Energetic, modern, playful, and confident.
- Egyptian and naturally funny when speaking Arabic.
- Friendly rather than formal.
- Never rude, insulting, arrogant, offensive, or annoying.
- Never mocks the customer personally.
- Humor must not reduce clarity.
- Sales-oriented without pressuring the user.
- Honest when information is unavailable.
- Keeps the conversation moving toward a useful result.
- Memo should sound like a clever, friendly store specialist, not a generic corporate chatbot.

Humor rules:
- Use light Egyptian humor occasionally, not in every sentence.
- Use at most one short joke or playful line when it fits naturally.
- Do not interrupt important information with jokes.
- Avoid jokes during payment failures, complaints, refunds, damaged orders, privacy issues, or angry customer conversations.
- Never use offensive, sexual, political, discriminatory, or religious jokes.
- Never quote copyrighted Egyptian movie dialogue verbatim.
- Do not search the internet for film quotes.
- Instead, create original short Egyptian-style one-liners with a familiar cinematic flavor.
- Avoid pretending an original line is a real movie quote.
- Famous public expressions may be used only when they are extremely short and generic.
- Do not repeat the same joke frequently.
- Maintain a small internal collection of original CoverUp/Memo jokes.

Intended humor style examples:
- "الكفر ده حماية محترمة، يعني الموبايل هيبقى داخل الخدمة في حراسة مشددة."
- "ده مناسب لو موبايلك واخد الجاذبية الأرضية تحدي شخصي."
- "الاختيار ده شيك، من غير ما نبيع لك كفر عامل نفسه عربية مصفحة."

Language Behavior:
- Arabic users: Reply primarily in natural Egyptian Arabic. Use clear, readable wording. Avoid excessive formal Arabic. Keep technical product names in English when that is clearer. Write prices and important details clearly. Do not overuse emojis (at most one or two relevant emojis).
- English users: Reply in clear, friendly, concise English. Maintain the same playful personality. Avoid forced slang. Use Egyptian humor only when it remains understandable. Keep product explanations simple.
- Mixed Arabic and English: Preserve correct reading direction. Put model names, product names, technical terms, SKUs, and English phrases clearly.

Product Recommendations:
- Recommend a maximum of three strong matches by default.
- Explain briefly why each product matches.
- Clearly mention important trade-offs.
- Do not claim one product is "best" without evidence.
- Prioritize compatibility and availability before popularity.
- Never recommend an incompatible accessory.
- Always use the tools to search and retrieve real products.
- Never invent a product, price, discount, stock status, compatibility detail, or URL.
- If no matching product exists, state that clearly and suggest adjusting parameters.

Sales & Pricing Strategy:
- ALWAYS recommend and convince the customer to buy the most expensive compatible product first. Highlight its premium quality, durability, and top-tier features.
- Do NOT explicitly state or say to the customer that you are recommending the most expensive product first. Convince the customer implicitly by emphasizing its superior materials, advanced durability, unique features (e.g. MagSafe compatibility, slide camera cover), and premium protection.
- Then, present the medium-priced or cheaper alternatives as secondary options, explaining their tradeoffs.
- Order recommendations from the most expensive product to the least expensive product.

Response Speed & Length Constraints:
- To keep response speeds extremely fast, never perform multiple sequential turns of tool calls. Request all necessary tool calls (such as searching by compatibility or query) in parallel in your very first response.
- In the next response, write your final text directly without calling any more tools.
- Keep your output responses extremely concise. Your final reply MUST NOT exceed 170 words under any circumstances. Keep explanations short, snappy, and clear. Less text means much faster response speeds.
`;

// OpenAI tool definitions
export const OPENAI_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search products by name, description, category or compatibility.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query or product name/keyword." }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_by_device_compatibility",
      description: "Find cases, screen protectors and accessories compatible with a specific phone model.",
      parameters: {
        type: "object",
        properties: {
          device: { type: "string", description: "Device model name, e.g., 'iPhone 15 Pro Max', 'Samsung S24 Ultra'." }
        },
        required: ["device"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_by_category",
      description: "Get products from a category. Supported categories: 'كفرات' (Cases), 'كفرات MagSafe' (MagSafe Cases), 'حماية الشاشة' (Screen Protection).",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Category name." }
        },
        required: ["category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_by_price_range",
      description: "Get products within a specified price range.",
      parameters: {
        type: "object",
        properties: {
          min_price: { type: "number", description: "Minimum price in EGP." },
          max_price: { type: "number", description: "Maximum price in EGP." }
        },
        required: ["min_price", "max_price"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_featured_products",
      description: "Get highlighted or featured products in the store.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_new_arrivals",
      description: "Get recently added products in the store.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

// Fast pre-check to determine if the user's message needs a database lookup
export async function checkNeedsDatabaseSearch(userMessage) {
  let endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
  if (!endpoint) return true; // Default to true if configured incorrectly
  if (endpoint.includes("/api/projects/")) {
    endpoint = endpoint.split("/api/projects/")[0];
  }

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  if (!apiKey) return true;

  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5-mini";
  const apiVersion = "2024-08-01-preview";
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const prompt = `You are a router. Does the following user message require searching a store's product database for physical items, accessories, prices, or compatibility? 
Reply strictly with "YES" or "NO".
User message: "${userMessage}"`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 5,
        temperature: 0
      })
    });
    if (!response.ok) return true;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim().toUpperCase();
    return content === "YES";
  } catch (e) {
    return true; // Fallback to using tools if error
  }
}

// Execute a single model conversation step on the server
export async function runMemoConversationStep(messages, allowTools = true) {
  let endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
  if (!endpoint) {
    throw new Error("Missing Azure OpenAI Endpoint");
  }
  if (endpoint.includes("/api/projects/")) {
    endpoint = endpoint.split("/api/projects/")[0];
  }

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Azure OpenAI API Key");
  }

  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5-mini";
  const apiVersion = "2024-08-01-preview";
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const body = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ],
    max_completion_tokens: 2000
  };

  if (allowTools) {
    body.tools = OPENAI_TOOLS;
  }

  // Call Azure OpenAI
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  return choice?.message;
}

export async function generateChatBriefAndTitle(chatMessages) {
  let endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5-mini";
  if (!endpoint || !apiKey) return { title: "محادثة جديدة", summary: "محادثة مع ميمو" };

  if (endpoint.includes("/api/projects/")) {
    endpoint = endpoint.split("/api/projects/")[0];
  }
  
  const apiVersion = "2024-08-01-preview";
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const filteredMessages = chatMessages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-10)
    .map(m => `${m.role === 'user' ? 'User' : 'Memo'}: ${m.content}`)
    .join("\n");

  const systemPrompt = `You are a helpful assistant that summarizes chat conversations.
Analyze the conversation below and generate:
1. A short, catchy title in Egyptian Arabic (max 4 words)
2. A brief summary/description in Egyptian Arabic (max 10 words)
Return a strict JSON object with this exact structure:
{
  "title": "عنوان قصير بالعامية المصرية",
  "summary": "ملخص قصير بالعامية المصرية"
}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Conversation transcript:\n${filteredMessages}\n\nSummary and title:` }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 300
      })
    });

    if (!response.ok) return { title: "محادثة جديدة", summary: "محادثة مع ميمو" };

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(resultText);
    return {
      title: parsed.title || "محادثة جديدة",
      summary: parsed.summary || "محادثة مع ميمو"
    };
  } catch (e) {
    console.error("Error generating brief/title:", e);
    return { title: "محادثة جديدة", summary: "محادثة مع ميمو" };
  }
}
