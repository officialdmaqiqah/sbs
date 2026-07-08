import { useParams } from 'react-router-dom';
import { useShipments } from '../hooks/useShipments';
import { usePackageComponents } from '../hooks/usePackageComponents';

export default function WaybillPrint() {
  const { id } = useParams();
  const { data: shipments, loading } = useShipments();
  const shipment = shipments.find(s => s.id === id);

  // We fetch package components to breakdown packages
  const isPackage = shipment?.sales_order?.items?.[0]?.product?.item_type === 'PACKAGE' || shipment?.sales_order?.items?.[0]?.product?.category === 'Paket Usaha';
  const mainProductId = shipment?.sales_order?.items?.[0]?.product?.id;
  const { data: packageComponents } = usePackageComponents(isPackage ? mainProductId : undefined);

  if (loading) return <div className="p-8 text-center">Memuat dokumen...</div>;
  if (!shipment) return <div className="p-8 text-center text-red-500">Data pengiriman tidak ditemukan.</div>;

  const order = shipment.sales_order;

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto text-slate-900" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider">Surat Jalan</h1>
          <p className="text-sm mt-1">Sultan Berkah Sejahtera</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">{shipment.do_number}</p>
          <p className="text-sm mt-1">Tanggal: {shipment.delivery_date}</p>
          <p className="text-sm">No. Order: {order?.so_number}</p>
        </div>
      </div>

      <div className="flex justify-between mb-8">
        <div className="w-1/2 pr-4">
          <h3 className="font-bold border-b border-slate-300 pb-1 mb-2">Tujuan Pengiriman:</h3>
          <p className="font-bold">{order?.customer?.name}</p>
          <p className="whitespace-pre-line text-sm mt-1">{shipment.delivery_address}</p>
        </div>
        <div className="w-1/3">
          <h3 className="font-bold border-b border-slate-300 pb-1 mb-2">Informasi Kendaraan:</h3>
          <p className="text-sm"><strong>Pengemudi:</strong> {shipment.driver_name || '-'}</p>
          <p className="text-sm mt-1"><strong>Kendaraan:</strong> {shipment.vehicle_number || '-'}</p>
        </div>
      </div>

      <table className="w-full border-collapse border border-slate-400 mb-8">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-400 px-4 py-2 text-left">No</th>
            <th className="border border-slate-400 px-4 py-2 text-left">Nama Barang / Produk</th>
            <th className="border border-slate-400 px-4 py-2 text-center w-32">Kuantitas</th>
          </tr>
        </thead>
        <tbody>
          {order?.items?.map((item: any, index: number) => (
            <tr key={item.id}>
              <td className="border border-slate-400 px-4 py-2 text-left">{index + 1}</td>
              <td className="border border-slate-400 px-4 py-2">
                <span className="font-bold">{item.product?.name}</span>
                {isPackage && packageComponents.length > 0 && (
                  <ul className="list-disc pl-5 mt-2 text-sm text-slate-700">
                    {packageComponents.map((c: any) => (
                      <li key={c.id}>{c.item?.name} ({(c.quantity || c.quantity_per_package)} set)</li>
                    ))}
                  </ul>
                )}
              </td>
              <td className="border border-slate-400 px-4 py-2 text-center font-bold">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {shipment.notes && (
        <div className="mb-8 p-3 border border-slate-300 rounded text-sm">
          <strong>Catatan:</strong> {shipment.notes}
        </div>
      )}

      <div className="flex justify-between mt-12 px-8">
        <div className="text-center">
          <p className="mb-16">Penerima Barang,</p>
          <p className="border-t border-slate-900 pt-1 w-48 font-bold">{shipment.recipient_name || '( ....................................... )'}</p>
        </div>
        <div className="text-center">
          <p className="mb-16">Pengemudi,</p>
          <p className="border-t border-slate-900 pt-1 w-48 font-bold">{shipment.driver_name || '( ....................................... )'}</p>
        </div>
        <div className="text-center">
          <p className="mb-16">Hormat Kami,</p>
          <p className="border-t border-slate-900 pt-1 w-48 font-bold">Admin SBS</p>
        </div>
      </div>

      <div className="mt-12 text-center print:hidden">
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold hover:bg-blue-700">
          Print Surat Jalan
        </button>
      </div>
    </div>
  );
}
