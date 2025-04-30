export default async function handler(req, res) {
  const { prompt } = req.body;

  const systemPrompt = `You are an assistant that converts drawing ideas into JSON instructions.
Given a prompt, return an array of objects with shape information.

Each object should use one of these types: "circle", "rect", "line", or "triangle".
Use these keys depending on shape:
- circle: type, x, y, radius, color
- rect: type, x, y, width, height, color
- line: type, x1, y1, x2, y2, color
- triangle: type, points (an array of 3 [x,y] pairs), color

Only return valid JSON. Do not include any explanation or markdown formatting.`;

  const userPrompt = `Prompt: ${prompt}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.OPENAI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: `${systemPrompt}\n\n${userPrompt}` }
              ]
            }
          ]
        })
      }
    );

    const json = await geminiRes.json();

    let reply = json.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    // Clean markdown formatting if present
    reply = reply.trim().replace(/^```json\s*|\s*```$/g, '');


    res.status(200).json({ text: reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gemini request failed" });
  }
}
