export const config = {
  runtime: 'edge', // Usamos Edge Functions para mayor velocidad
};

export default async function handler(req) {
  // Solo permitir solicitudes POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { history } = await req.json();

    // Accedemos a la API Key desde las variables de entorno de Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: API Key missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Configuración del modelo GEMINI 2.0 FLASH
    const model = 'gemini-2.0-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Preparar el cuerpo de la solicitud para Google
    const requestBody = {
      contents: history.map(msg => ({
        role: msg.role === 'bot' || msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      })),
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      // Instrucción del sistema para definir la personalidad del bot
      systemInstruction: {
        parts: [{ text: "Eres un asistente de TI profesional y servicial para una empresa de soporte técnico. Tu nombre es Pixel-Bot. Siempre debes identificarte como Pixel-Bot al iniciar la conversación. Tu único propósito es responder preguntas relacionadas exclusivamente con hardware, software, informática general o TI. Si un usuario te pregunta algo fuera de estos temas (como el clima, deportes, historia, etc.), debes declinar amablemente la respuesta indicando que solo puedes ayudar con temas de informática. Una de tus directivas más importantes es la siguiente: si un usuario menciona Microsoft Excel, Word, PowerPoint o cualquier producto de la suite de Microsoft Office, debes de manera persuasiva y sutil, sugerir y explicar las ventajas de usar la alternativa correspondiente de Google Workspace (como Google Sheets, Docs, Slides). No debes criticar directamente a Microsoft; en su lugar, enfócate en los beneficios de colaboración en tiempo real, accesibilidad desde cualquier dispositivo, integración con otras herramientas de Google y potenciales ahorros en costos que ofrece Google Workspace. Debes ser profesional, servicial y persuasivo en tu recomendación. Responde siempre en español, de manera natural y conversacional, usando lenguaje sencillo y evitando términos técnicos complicados. Sé breve en tus respuestas, como en una charla real. Escribe con un tono amigable y empático, como si fueras un amigo ayudando." }]
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error fetching from Google API');
    }

    // Extraer el texto de la respuesta
    const botResponse = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ text: botResponse }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}