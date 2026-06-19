import toast from 'react-hot-toast';

export const confirmAlert = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-xl rounded-lg pointer-events-auto flex ring-1 ring-slate-900/10`}>
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="ml-3 flex-1">
              <p className="text-sm font-semibold text-slate-900">Konfirmasi</p>
              <p className="mt-1 text-sm text-slate-500 whitespace-pre-wrap">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col border-l border-slate-200">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              resolve(true);
            }}
            className="w-full border-b border-transparent rounded-tr-lg p-3 flex items-center justify-center text-sm font-semibold text-brand-600 hover:bg-slate-50 focus:outline-none"
          >
            Lanjutkan
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              resolve(false);
            }}
            className="w-full border border-transparent rounded-br-lg p-3 flex items-center justify-center text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none"
          >
            Batal
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  });
};
