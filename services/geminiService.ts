import { GoogleGenAI } from "@google/genai";
import { MindNode } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getSuggestedThoughts = async (
  currentContent: string,
  contextNodes: MindNode[]
): Promise<string[]> => {
  const client = getClient();
  if (!client) return ["请检查 API Key"];

  // Sort context by timestamp to give chronological flow
  const sortedContext = [...contextNodes].sort((a, b) => a.timestamp - b.timestamp);
  const flow = sortedContext.map(n => n.content).join(" -> ");

  const prompt = `
    我正在创建一个非线性思维导图来进行头脑风暴。
    这是我目前的思考流程：${flow}
    上一个想法是：“${currentContent}”
    
    请提供 3 个简短、简洁的短语或相关概念作为扩展，自然地接续这个想法。
    每个短语请保持在 8 个字以内。
    仅返回用竖线 (|) 分隔的 3 个短语，不要包含其他任何内容。
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || "";
    return text.split('|').map(s => s.trim()).filter(s => s.length > 0);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};