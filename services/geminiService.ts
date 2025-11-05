import { GoogleGenAI, Modality } from "@google/genai";

/**
 * Takes a model image, an outfit image, and a text prompt, and returns a new image
 * with the model dressed in the outfit.
 * The prompt has been enhanced to intelligently extract clothing from the outfit image.
 * @param modelImage The base64 encoded model image.
 * @param outfitImage The base64 encoded outfit image.
 * @param prompt Additional user instructions.
 * @returns A base64 data URI of the generated image.
 */
export async function styleModelWithOutfit(
  modelImage: { data: string; mimeType: string },
  outfitImage: { data: string; mimeType: string },
  prompt: string
): Promise<string> {
  // FIX: Initialize GoogleGenAI directly with the API key from environment variables as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  const pureModelBase64 = modelImage.data.split(',')[1];
  const pureOutfitBase64 = outfitImage.data.split(',')[1];

  if (!pureModelBase64 || !pureOutfitBase64) {
    throw new Error("Formato de dados da imagem base64 inválido.");
  }

  // Novo prompt estruturado e detalhado para garantir a intenção correta.
  const taskPrompt = `
TAREFA PRINCIPAL: Transferência de Roupa Fotorrealista.

INSTRUÇÕES DETALHADAS:
1.  **Identifique o Modelo:** A imagem rotulada como 'MODELO' contém a pessoa a ser vestida.
2.  **Identifique a Roupa:** A imagem rotulada como 'ROUPA' contém a peça de vestuário a ser aplicada. Ignore qualquer pessoa ou fundo que possa estar na imagem da 'ROUPA'.
3.  **Tarefa de Alfaiataria Digital:** Sua tarefa é uma transferência digital precisa. Vista o 'MODELO' com a 'ROUPA'.
4.  **Fidelidade Absoluta à Roupa:** Preserve *exatamente* todos os detalhes da 'ROUPA': padrões, logos, costuras, texturas e o corte. Não é uma reinterpretação, é uma réplica fiel.
5.  **Pose Dinâmica:** É obrigatório ajustar a pose do 'MODELO' para uma postura de moda mais dinâmica, elegante e profissional que valorize a roupa. Não use a pose original.
6.  **Consistência da Identidade do Modelo:** É absolutamente crucial manter as características faciais, tom de pele e cabelo do 'MODELO' original. O rosto deve permanecer idêntico.
7.  **Refinamentos do Usuário:** Incorpore as seguintes instruções adicionais do usuário no resultado final: "${prompt}"
8.  **Qualidade e Formato de Saída:** A imagem final deve ser uma fotografia ultra-realista, de alta definição, com qualidade de estúdio e ter uma proporção de 4:5 (retrato), ideal para postagens em redes sociais como Instagram e Facebook.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: "MODELO:" },
        {
          inlineData: {
            data: pureModelBase64,
            mimeType: modelImage.mimeType,
          },
        },
        { text: "ROUPA:" },
        {
          inlineData: {
            data: pureOutfitBase64,
            mimeType: outfitImage.mimeType,
          },
        },
        {
          text: taskPrompt,
        },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      const generatedMimeType = part.inlineData.mimeType;
      return `data:${generatedMimeType};base64,${base64ImageBytes}`;
    }
  }

  throw new Error("Nenhuma imagem foi gerada pelo modelo. Por favor, tente um prompt diferente.");
}


/**
 * Analyzes an outfit image and suggests a trendy name for it.
 * @param outfitImage The base64 encoded outfit image.
 * @returns A string containing the suggested trend name.
 */
export async function generateTrendName(outfitImage: { data: string; mimeType: string }): Promise<string> {
  // FIX: Initialize GoogleGenAI directly with the API key from environment variables as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  const pureOutfitBase64 = outfitImage.data.split(',')[1];
  if (!pureOutfitBase64) {
    throw new Error("Formato de dados da imagem base64 inválido.");
  }

  const prompt = "Analyze the clothing item in this image. Provide a short, trendy, and descriptive name for it suitable for a fashion catalog. For example: 'Quantum Weave Jacket', 'Holographic Parka', or 'Bio-Luminescent Gown'. Respond with only the name and nothing else.";

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            data: pureOutfitBase64,
            mimeType: outfitImage.mimeType,
          },
        },
        { text: prompt },
      ],
    },
  });

  const trendName = response.text.trim().replace(/["'*]/g, '');
  return trendName;
}

/**
 * Analyzes an outfit image and suggests suitable backgrounds, including neutral options.
 * @param outfitImage The base64 encoded outfit image.
 * @returns A promise that resolves to an array of background suggestions.
 */
export async function suggestBackgrounds(outfitImage: { data: string; mimeType: string }): Promise<string[]> {
  // FIX: Initialize GoogleGenAI directly with the API key from environment variables as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  const pureOutfitBase64 = outfitImage.data.split(',')[1];
  if (!pureOutfitBase64) {
    throw new Error("Formato de dados da imagem base64 inválido.");
  }

  const prompt = `Analyze the clothing in this image. Suggest 3-4 suitable and consistent background scenarios for a professional photoshoot. For example, if it's a bikini, suggest 'a sunny beach with turquoise water'. If it's a formal suit, suggest 'a modern city skyline at dusk'. Also include a simple option like 'a neutral studio backdrop' or 'a solid light gray background' if appropriate. Respond ONLY with a comma-separated list of these short, descriptive phrases and nothing else.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            data: pureOutfitBase64,
            mimeType: outfitImage.mimeType,
          },
        },
        { text: prompt },
      ],
    },
  });

  const suggestionsText = response.text.trim();
  if (!suggestionsText) {
      return [];
  }

  const suggestions = suggestionsText.split(',').map(s => s.trim()).filter(s => s);
  return suggestions;
}
