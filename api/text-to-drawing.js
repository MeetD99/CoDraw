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
      const geminiRes = await fetch("https://api.gemini.com/v1/assistant/completions", {
          method: "POST",
          headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json"
          },
          body: JSON.stringify({
              model: "gemini-3.5-turbo",  // Make sure to use the correct model name for Gemini.
              messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt }
              ],
              temperature: 0.7
          })
      });

      const json = await geminiRes.json();
      res.status(200).json({ text: json.choices?.[0]?.message?.content || "[]" });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Gemini request failed" });
  }
}
