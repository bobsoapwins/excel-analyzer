import { FileSpreadsheet } from 'lucide-react';
import type React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center justify-center text-primary">
      <FileSpreadsheet className="h-10 w-10 md:h-12 md:w-12" />
    </div>
  );
};

export default Logo;
