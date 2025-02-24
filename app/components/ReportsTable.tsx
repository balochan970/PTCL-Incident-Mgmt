import React from 'react';

interface ReportData {
  field1: string;
  field2: string;
  field3: string;
  // Add more fields as needed
}

interface ReportsTableProps {
  data: ReportData[];
}

const ReportsTable: React.FC<ReportsTableProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-200 text-gray-600">
            <th className="py-3 px-6 text-left">Header 1</th>
            <th className="py-3 px-6 text-left">Header 2</th>
            <th className="py-3 px-6 text-left">Header 3</th>
            {/* Add more headers as needed */}
          </tr>
        </thead>
        <tbody>
          {data.map((row: ReportData, index: number) => (
            <tr key={index} className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}>
              <td className="py-3 px-6">{row.field1}</td>
              <td className="py-3 px-6">{row.field2}</td>
              <td className="py-3 px-6">{row.field3}</td>
              {/* Add more data cells as needed */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportsTable;
