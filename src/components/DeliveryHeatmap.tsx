import React from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { StaleShipment } from '../types';

interface DeliveryHeatmapProps {
  apiKey: string;
  staleShipments: StaleShipment[];
}

export const DeliveryHeatmap: React.FC<DeliveryHeatmapProps> = ({ apiKey, staleShipments }) => {
  // SA Center: -28.4793, 24.6727
  const center = { lat: -28.4793, lng: 24.6727 };

  return (
    <div className="w-full h-full rounded-xs overflow-hidden border border-gray-200 shadow-2xs min-h-[300px] relative bg-gray-100">
      <APIProvider apiKey={apiKey}>
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={center}
          defaultZoom={5}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId={'bf51a910020fa25a'} // A default styled map ID or null
        >
          {staleShipments.map((s, idx) => (
            s.lat && s.lng ? (
              <AdvancedMarker
                key={idx}
                position={{ lat: s.lat, lng: s.lng }}
                title={`${s.orderNumber} - ${s.currentStatus}`}
              >
                <Pin 
                  background={'#C41230'} 
                  borderColor={'#FFFFFF'} 
                  glyphColor={'#FFFFFF'} 
                  scale={0.8}
                />
              </AdvancedMarker>
            ) : null
          ))}
        </Map>
      </APIProvider>
      
      <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm p-2 rounded shadow-md border border-gray-100 pointer-events-none">
        <h4 className="text-[10px] font-bold text-[#003876] uppercase tracking-wider mb-1">
          Geographic Delay Heatmap
        </h4>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#C41230]"></div>
          <span className="text-[9px] text-gray-600 font-medium">Stale Shipment (&ge; 3.0d)</span>
        </div>
        <p className="text-[8px] text-gray-400 mt-1 max-w-[140px]">
          Live visualisation of logistics exceptions across the South African courier network.
        </p>
      </div>
    </div>
  );
};
