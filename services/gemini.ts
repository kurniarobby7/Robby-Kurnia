
import { GoogleGenAI } from "@google/genai";
import { SavedReport, ChecklistItem } from "../types";
import { CHECKLIST_ITEMS } from "../constants";

export const analyzeVehicleHealth = async (report: Partial<SavedReport>) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prepare issues list for the prompt
  const issues: string[] = [];
  CHECKLIST_ITEMS.forEach(item => {
    const check = report.checks?.[item.id];
    if (check?.week1 === 'issue' || check?.week3 === 'issue') {
      issues.push(`${item.label} (Issues in Week ${check.week1 === 'issue' ? '1' : ''}${check.week1 === 'issue' && check.week3 === 'issue' ? ' & ' : ''}${check.week3 === 'issue' ? '3' : ''})`);
    }
  });

  const prompt = `
    As a professional fleet maintenance expert for a government agency (BPMP Lampung), 
    analyze this vehicle inspection report and provide a concise, professional summary 
    of the vehicle's health and urgent maintenance recommendations.

    Vehicle: ${report.vehicleType} (${report.plateNumber})
    Odometer: ${report.odometer} KM
    Fuel Level: ${report.fuelLevel}%
    
    Identified Issues:
    ${issues.length > 0 ? issues.join('\n') : 'No mechanical issues identified.'}

    Additional Inspector Notes: ${report.additionalNote || 'None'}

    Format your response in Markdown:
    1. **Executive Summary** (Status: Good/Needs Attention/Urgent)
    2. **Key Findings**
    3. **Expert Recommendations**
    4. **Maintenance Urgency Score** (0-10)

    Keep it professional and action-oriented. Respond in Indonesian.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
      },
    });

    return response.text;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "Maaf, analisis AI saat ini tidak tersedia. Silakan tinjau laporan secara manual.";
  }
};
