
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
// import Logo from '@/components/Logo'; // Logo import removed
import FileUpload from '@/components/FileUpload';
import DataTable, { type ColumnPercentageData } from '@/components/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, MessageSquareText } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { generateExcelInsights, type ExcelInsightsInput, type ExcelInsightsOutput } from '@/ai/flows/excel-insights-flow';

const processExcelFile = async (file: File): Promise<ColumnPercentageData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result;
        if (!arrayBuffer) {
          reject(new Error("Failed to read file."));
          return;
        }

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve([]);
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        let jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

        if (jsonData.length === 0) {
          resolve([]);
          return;
        }

        let headers: string[];
        let dataStartIndex = 1; // Default: headers in jsonData[0], data starts at jsonData[1]

        // Check if the first row looks like a header or data
        if (jsonData.length > 0 && Array.isArray(jsonData[0])) {
            const firstRow = jsonData[0] as any[];
            // Heuristic: if the first row contains predominantly numbers or looks like data, treat it as data
            const looksLikeData = firstRow.some(cell => cell !== null && cell !== undefined && !isNaN(parseFloat(String(cell).replace(/,/g, ''))));
            const hasNonEmptyString = firstRow.some(cell => typeof cell === 'string' && cell.trim() !== '');

            if (looksLikeData || !hasNonEmptyString && jsonData.length > 1) { // If first row is data-like OR if first row is empty and there's more data
                 // Or if no real text headers, assume no header row
                const numCols = jsonData.reduce((max, row) => Math.max(max, (row || []).length), 0);
                headers = Array.from({ length: numCols }, (_, i) => `Unnamed Column ${i + 1}`);
                dataStartIndex = 0; // Data starts from the first row
            } else {
                headers = jsonData[0] as string[];
                // If headers were present but some are null/empty, fill them
                headers = headers.map((h, i) => (h === null || String(h).trim() === '') ? `Unnamed Column ${i + 1}` : String(h));
            }
        } else { // Should not happen if jsonData.length > 0
            resolve([]);
            return;
        }

        if (dataStartIndex === 1 && jsonData.length === 1) { // Only header row, no data
            resolve([]);
            return;
        }


        const columnDataList: ColumnPercentageData[] = headers.map((header, colIndex) => {
          const numericValuesInColumn: number[] = [];
          for (let rowIndex = dataStartIndex; rowIndex < jsonData.length; rowIndex++) {
            const row = jsonData[rowIndex];
            if (row && colIndex < row.length) {
              const cellValue = row[colIndex];
              if (cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
                const cleanedCellValue = String(cellValue).replace(/,/g, '');
                const num = parseFloat(cleanedCellValue);
                if (!isNaN(num)) {
                  numericValuesInColumn.push(num);
                }
              }
            }
          }

          let calculatedPercentage: number | null = null;
          let notesMessage: string = '';

          if (numericValuesInColumn.length < 2) {
            calculatedPercentage = null;
            notesMessage = 'Needs at least two numeric values for comparison.';
            if (numericValuesInColumn.length === 1) {
                 notesMessage = `Only one numeric value (${numericValuesInColumn[0]}) found.`;
            }
          } else {
            const firstNum = numericValuesInColumn[0];
            const lastNum = numericValuesInColumn[numericValuesInColumn.length - 1];

            if (firstNum === 0) {
              if (lastNum === 0) {
                calculatedPercentage = 0;
                notesMessage = 'Change from 0 to 0.';
              } else {
                calculatedPercentage = lastNum > 0 ? Infinity : -Infinity;
                notesMessage = `Change from 0 to ${lastNum}. Percentage is effectively infinite.`;
              }
            } else {
              calculatedPercentage = (lastNum - firstNum) / firstNum;
              notesMessage = `Change from ${firstNum} to ${lastNum}.`;
            }
          }

          return {
            columnName: String(header || `Unnamed Column ${colIndex + 1}`),
            percentageValue: calculatedPercentage,
            notes: notesMessage,
          };
        });

        resolve(columnDataList);

      } catch (e) {
        console.error("Error processing Excel file:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during parsing.";
        reject(new Error(`Failed to parse the Excel file. ${errorMessage}`));
      }
    };

    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      reject(new Error("Error reading file."));
    };

    reader.readAsArrayBuffer(file);
  });
};


export default function HomePage() {
  const [parsedData, setParsedData] = useState<ColumnPercentageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const { toast } = useToast();
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);


  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.includes('spreadsheetml') && !file.type.includes('ms-excel') && !file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      setError("Invalid file type. Please upload an Excel file (.xls or .xlsx).");
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel file (.xls or .xlsx).",
        variant: "destructive",
      });
      setAiInsights(null);
      setInsightsError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setParsedData([]);
    setCurrentFile(file);
    setAiInsights(null);
    setInsightsError(null);

    try {
      const data = await processExcelFile(file);
      setParsedData(data);
      if (data.length > 0) {
        toast({
          title: "File Processed Successfully!",
          description: `${file.name} has been analyzed. Generating AI insights...`,
        });

        setIsGeneratingInsights(true);
        try {
          // Prepare data for AI: ensure Infinity/NaN become null for JSON
          const insightsInputData = data.map(d => ({
            ...d,
            percentageValue: (d.percentageValue === Infinity || d.percentageValue === -Infinity || (d.percentageValue !== null && isNaN(d.percentageValue)))
                             ? null
                             : d.percentageValue
          }));
          const insightsInput: ExcelInsightsInput = { columnData: insightsInputData };
          const result: ExcelInsightsOutput = await generateExcelInsights(insightsInput);
          setAiInsights(result.insights);
        } catch (aiError) {
          console.error("AI Insights Error:", aiError);
          const aiErrorMessage = aiError instanceof Error ? aiError.message : "An unknown error occurred while generating insights.";
          setInsightsError(`Could not generate AI insights: ${aiErrorMessage}`);
          toast({
            title: "AI Insights Error",
            description: `Could not generate AI insights: ${aiErrorMessage}`,
            variant: "destructive",
          });
        } finally {
          setIsGeneratingInsights(false);
        }

      } else {
         toast({
          title: "File Processed",
          description: `${file.name} was processed, but no data columns were found or it was empty.`,
          variant: "default"
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during file processing.";
      setError(errorMessage);
      setParsedData([]);
      toast({
        title: "Processing Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return (
    <div className="flex flex-col items-center p-4 md:p-8 selection:bg-primary/20 selection:text-primary">
      <header className="mb-8 text-center">
        {/* Logo component usage removed */}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Excel Insights
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Powered by NeoAI
        </p>
      </header>

      <main className="w-full max-w-3xl space-y-8">
        <Card className="shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="bg-card/50">
            <CardTitle className="text-xl">Upload Your Spreadsheet</CardTitle>
            <CardDescription>Drag and drop your .xls or .xlsx file, or click to select.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="shadow-lg rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Processing Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && !isGeneratingInsights && (
            <Card className="shadow-lg rounded-xl">
                <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-lg font-medium text-primary">Analyzing {currentFile?.name || 'your file'}...</p>
                    <p className="text-muted-foreground">Please wait a moment.</p>
                </CardContent>
            </Card>
        )}

        {!isLoading && parsedData.length > 0 && (
          <Card className="shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="bg-card/50">
              <CardTitle className="text-xl">Column Insights</CardTitle>
              <CardDescription>
                {currentFile ? (
                  <>
                    Analysis results for <span className="font-semibold text-foreground">{currentFile.name}</span>: Percentage change from first to last numeric value.
                  </>
                ) : "Percentage values for each column."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-2">
              <DataTable data={parsedData} />
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && parsedData.length === 0 && currentFile && (
             <Card className="shadow-lg rounded-xl">
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No column insights could be generated for {currentFile.name}. The file might be empty, not contain processable numeric data in columns, or the first sheet is blank.</p>
                </CardContent>
            </Card>
        )}

        {isGeneratingInsights && (
          <Card className="shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="bg-card/50">
              <CardTitle className="text-xl flex items-center">
                <MessageSquareText className="h-5 w-5 mr-2 text-primary" />
                AI Generated Insights
              </CardTitle>
              <CardDescription>NeoAI is analyzing your data...</CardDescription>
            </Header>
            <CardContent className="p-6 min-h-[150px] flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                    <p className="text-muted-foreground">Generating insights...</p>
                </div>
            </CardContent>
          </Card>
        )}

        {!isGeneratingInsights && aiInsights && (
          <Card className="shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="bg-card/50">
              <CardTitle className="text-xl flex items-center">
                <MessageSquareText className="h-5 w-5 mr-2 text-primary" />
                AI Generated Insights
              </CardTitle>
              <CardDescription>Summary of observations from your data.</CardDescription>
            </Header>
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">{aiInsights}</div>
            </CardContent>
          </Card>
        )}

        {!isGeneratingInsights && insightsError && (
           <Card className="shadow-xl rounded-xl overflow-hidden border-destructive">
            <CardHeader className="bg-destructive/10">
              <CardTitle className="text-xl flex items-center text-destructive">
                <AlertCircle className="h-5 w-5 mr-2" />
                AI Insights Error
              </CardTitle>
            </Header>
            <CardContent className="p-6">
              <p className="text-destructive">{insightsError}</p>
            </CardContent>
          </Card>
        )}

      </main>

      <footer className="mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>&copy;2025 Neo Incorporated Data Analysis Department. All rights reserved</p>
        <p className="text-xs mt-1">Powered by NeoAI</p>
      </footer>
    </div>
  );
}
