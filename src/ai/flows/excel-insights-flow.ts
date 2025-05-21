
'use server';
/**
 * @fileOverview Generates AI-driven insights from Excel column percentage data.
 *
 * - generateExcelInsights - A function to call the AI flow.
 * - ExcelInsightsInput - The input type for the AI flow.
 * - ExcelInsightsOutput - The return type for the AI flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Internal schema for individual column data
const ColumnPercentageDataSchema = z.object({
  columnName: z.string(),
  percentageValue: z.union([z.number(), z.literal(null)]), // Allows number or null
  notes: z.string(),
});

// Input schema for the flow
const ExcelInsightsInputSchema = z.object({
  columnData: z.array(ColumnPercentageDataSchema),
});
export type ExcelInsightsInput = z.infer<typeof ExcelInsightsInputSchema>;

// Output schema for the flow
const ExcelInsightsOutputSchema = z.object({
  insights: z.string(),
});
export type ExcelInsightsOutput = z.infer<typeof ExcelInsightsOutputSchema>;

// Exported wrapper function to call the flow
export async function generateExcelInsights(input: ExcelInsightsInput): Promise<ExcelInsightsOutput> {
  return excelInsightsFlow(input);
}

const insightsPrompt = ai.definePrompt({
  name: 'excelInsightsPrompt',
  input: {schema: ExcelInsightsInputSchema},
  output: {schema: ExcelInsightsOutputSchema},
  prompt: `You are an AI data analyst. Based on the following column percentage data from an Excel spreadsheet, provide a concise summary of key insights, trends, or anomalies.
Focus on significant changes and noteworthy patterns.
If percentageValue is null, refer to the 'notes' field for context (e.g., change from zero, insufficient data).

Data:
{{#each columnData}}
- Column: "{{columnName}}"
  Percentage Change: {{#if (eq percentageValue null)}}null (Refer to notes: "{{notes}}"){{else}}{{percentageValue}}{{/if}}
  Notes: "{{notes}}"
{{/each}}

Generate a brief textual summary of your findings.
Your response MUST be a JSON object with a single key "insights", and the value should be your summary string. For example: {"insights": "Your summary here."}
`,
});

const excelInsightsFlow = ai.defineFlow(
  {
    name: 'excelInsightsFlow',
    inputSchema: ExcelInsightsInputSchema,
    outputSchema: ExcelInsightsOutputSchema,
  },
  async (input) => {
    // Ensure data is in the correct format for the prompt, especially handling nulls
    const processedInput = {
      columnData: input.columnData.map(item => ({
        ...item,
        percentageValue: item.percentageValue,
      })),
    };
    const {output} = await insightsPrompt(processedInput);
    if (!output) {
      throw new Error('AI failed to generate insights.');
    }
    return output; // output should be ExcelInsightsOutput here
  }
);

