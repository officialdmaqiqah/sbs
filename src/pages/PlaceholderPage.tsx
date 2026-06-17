import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlaceholderPageProps {
  title?: string;
  message?: string;
}

export default function PlaceholderPage({ 
  title = "Dalam Pengembangan", 
  message = "Fitur ini tersedia di iterasi berikutnya. Saat ini sedang dalam tahap Internal Beta." 
}: PlaceholderPageProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
      <div className="bg-brand-50 p-6 rounded-full mb-6">
        <Construction className="w-16 h-16 text-brand-600" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 mb-4">{title}</h1>
      <p className="text-lg text-slate-600 max-w-lg mb-8 leading-relaxed">
        {message}
      </p>
      <button 
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-lg font-medium transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Kembali
      </button>
    </div>
  );
}
