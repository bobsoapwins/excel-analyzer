
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
  columnName: string;
  /**
   * Represents the calculated percentage change.
   * e.g., 1.0 for 100% increase, -0.5 for 50% decrease.
   * Can be Infinity or -Infinity for changes from zero.
   */
  percentageValue: number; 
  notes?: string;
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
      <TableCaption>Percentage change from the first numeric value to the last numeric value in each column.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[35%]">Column Name</TableHead>
          <TableHead className="w-[40%] text-center">Percentage Change</TableHead>
          <TableHead className="w-[25%] text-right">Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, index) => {
          const rawPercentage = row.percentageValue; // This is like 1.0 for 100%, -0.5 for -50%, Infinity
          
          let displayPercentText: string;
          if (isNaN(rawPercentage)) {
            displayPercentText = "N/A";
          } else if (rawPercentage === Infinity || rawPercentage === -Infinity) {
            displayPercentText = rawPercentage > 0 ? "Infinity%" : "-Infinity%";
          } else {
            displayPercentText = (rawPercentage * 100).toFixed(1) + '%';
          }
          

          let progressBarValue: number;
          if (rawPercentage === Infinity) {
            progressBarValue = 100;
          } else if (rawPercentage === -Infinity) {
            progressBarValue = 0;
          } else if (isNaN(rawPercentage)) {
            progressBarValue = 0;
          } else {
            const percentForBar = rawPercentage * 100;
            if (percentForBar < 0) {
              progressBarValue = 0; // Progress bar doesn't show negative
            } else {
              progressBarValue = Math.min(percentForBar, 100); // Cap positive at 100 for the bar
            }
          }

          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{row.columnName}</TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center">
                  <Progress value={progressBarValue} className="w-3/4 h-3 mr-2" aria-label={`Progress: ${progressBarValue}%`} />
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
