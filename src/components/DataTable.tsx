
"use client";

import React from 'react';
import type { FC } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Progress } from "@/components/ui/progress";

export interface ColumnPercentageData {
  columnName: string; // This will now represent the label from Column A of the row
  /**
   * Represents the calculated percentage change from Column B to Column D of a row.
   * e.g., 1.0 for 100% increase, -0.5 for 50% decrease.
   * Can be Infinity or -Infinity for changes from zero.
   * Can also be null if data is insufficient for calculation.
   */
  percentageValue: number | null; 
  notes: string;
}

interface DataTableProps {
  data: ColumnPercentageData[];
}

const DataTable: FC<DataTableProps> = ({ data }) => {
  if (data.length === 0) {
    return <p className="p-4 text-center text-muted-foreground">No data to display. Process an Excel file to see insights.</p>;
  }

  return (
    <Table>
      <TableCaption>Percentage change between column B and column D for each identified row.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[35%]">Row Identifier (from Column A)</TableHead>
          <TableHead className="w-[40%] text-center">Percentage Change (Col B vs Col D)</TableHead>
          <TableHead className="w-[25%] text-right">Explanation</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, index) => {
          const rawPercentage = row.percentageValue; 
          
          let displayPercentText: string;
          if (rawPercentage === null || (typeof rawPercentage === 'number' && isNaN(rawPercentage))) {
            displayPercentText = "N/A";
          } else if (rawPercentage === Infinity) {
            displayPercentText = "Infinity%";
          } else if (rawPercentage === -Infinity) {
            displayPercentText = "-Infinity%";
          } else if (typeof rawPercentage === 'number') {
            displayPercentText = (rawPercentage * 100).toFixed(1) + '%';
          } else {
             displayPercentText = "N/A"; // Fallback for unexpected types
          }
          

          let progressBarValue: number;
          let progressAriaLabel: string;

          if (rawPercentage === null || (typeof rawPercentage === 'number' && isNaN(rawPercentage))) {
            progressBarValue = 0;
            progressAriaLabel = "Progress: Not Applicable";
          } else if (rawPercentage === Infinity) {
            progressBarValue = 100;
            progressAriaLabel = "Progress: Infinity";
          } else if (rawPercentage === -Infinity) {
            progressBarValue = 0; // Or 0, depends on how you want to represent negative infinity
            progressAriaLabel = "Progress: Negative Infinity";
          } else if (typeof rawPercentage === 'number') {
            const percentForBar = rawPercentage * 100;
            if (percentForBar < 0) {
              progressBarValue = 0; // Progress bar doesn't show negative
            } else {
              progressBarValue = Math.min(Math.abs(percentForBar), 100); // Cap at 100 for the bar
            }
            progressAriaLabel = `Progress: ${progressBarValue.toFixed(0)}%`;
          } else {
            progressBarValue = 0;
            progressAriaLabel = "Progress: Not Applicable";
          }


          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{row.columnName}</TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center">
                  <Progress value={progressBarValue} className="w-3/4 h-3 mr-2" aria-label={progressAriaLabel} />
                  <span>{displayPercentText}</span>
                </div>
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">{row.notes || '-'}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default DataTable;
