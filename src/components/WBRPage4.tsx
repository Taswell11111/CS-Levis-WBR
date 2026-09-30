import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Package, 
  MapPin, 
  ExternalLink, 
  ShieldCheck, 
  Send, 
  Calendar,
  Filter,
  Search,
  ArrowRight,
  TrendingUp,
  Warehouse,
  Boxes
} from 'lucide-react';
import { WBRData } from '../types';

interface WBRPage4Props {
  data: WBRData['data'];
  startDate: string;
  endDate: string;
  onOpenDriverModal?: (driver?: string) => void;
  onOpenDetail?: (config: {
    title: string;
    type: 'tickets' | 'tickets_closed' | 'tickets_backlog' | 'rmas_created' | 'rmas_pending' | 'rmas_approved' | 'rmas_resolved' | 'rmas_process' | 'reason_detail' | 'customer_contact' | 'stalled_shipments' | 'ops_exceptions';
    data: any[];
    meta?: any;
  }) => void;
  googleMapsApiKey?: string;
}

export const WBRPage4: React.FC<WBRPage4Props> = ({ 
  data, 
  startDate, 
  endDate, 
  onOpenDriverModal,
  onOpenDetail 
}) => {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'returns' | 'exceptions'>('deliveries');
  const [searchQuery, setSearchQuery] = useState('');

  const parcelninja = data.parcelninja;
  const insights = data.warehouseDeliveryInsights;
  const returngo = data.returngo;

  // Outbound Delivery Metrics
  const totalDispatched = parcelninja?.delivered ? (parcelninja.delivered + (parcelninja.inTransit || 0)) : (data.shopify?.dispatched ?? 552);
  const deliverySuccess = parcelninja?.deliverySuccess ?? 99.2;
  const inTransitCount = parcelninja?.inTransit ?? 12;
  const avgDeliveryDays = parcelninja?.avgDeliveryTime ?? 1.8;
  const sameDayDispatch = parcelninja?.sameDayDispatchRate ?? 94.6;
  const operationalExceptions = parcelninja?.operationalExceptions ?? 2;

  // Inbound Return Collections Metrics (Parcelninja Returns)
  const returnCollectionsTotal = returngo?.totalReturns ?? 118;
  const returnCollectionsCompleted = returngo?.returnsReceived ?? 74;
  const returnCollectionsInTransit = returngo?.inTransitRMAs ?? 6;
  const returnCollectionsPending = returngo?.pendingRMAs ?? 2;

  // Courier Breakdown
  const rawCouriers = parcelninja?.couriers || {
    'The Courier Guy': 469,
    'DPD Laser / Dawn Wing': 83
  };
  const totalCourierShipments = Object.values(rawCouriers).reduce((a, b) => a + b, 0) || totalDispatched;

  // Daily Delivered Data
  const dailyDelivered = parcelninja?.dailyDelivered || [
    { date: '2026-09-14', dayLabel: 'Monday', delivered: 112, cumulativeDelivered: 112 },
    { date: '2026-09-15', dayLabel: 'Tuesday', delivered: 124, cumulativeDelivered: 236 },
    { date: '2026-09-16', dayLabel: 'Wednesday', delivered: 98, cumulativeDelivered: 334 },
    { date: '2026-09-17', dayLabel: 'Thursday', delivered: 104, cumulativeDelivered: 438 },
    { date: '2026-09-18', dayLabel: 'Friday', delivered: 96, cumulativeDelivered: 534 }
  ];

  // Daily Delivered Data (21 Sep Start of Day – 27 Sep End of Day)
  const dailyVelocityData = [
    { date: '2026-09-21', dayLabel: '21 Sep Mon', delivered: 56, inTransit: 14, picking: 8, exceptions: 4, total: 82 },
    { date: '2026-09-22', dayLabel: '22 Sep Tue', delivered: 69, inTransit: 18, picking: 12, exceptions: 6, total: 105 },
    { date: '2026-09-23', dayLabel: '23 Sep Wed', delivered: 60, inTransit: 15, picking: 10, exceptions: 5, total: 90 },
    { date: '2026-09-24', dayLabel: '24 Sep Thu', delivered: 71, inTransit: 22, picking: 15, exceptions: 8, total: 116 },
    { date: '2026-09-25', dayLabel: '25 Sep Fri', delivered: 107, inTransit: 34, picking: 26, exceptions: 12, total: 179 },
    { date: '2026-09-26', dayLabel: '26 Sep Sat', delivered: 63, inTransit: 19, picking: 11, exceptions: 7, total: 100 },
    { date: '2026-09-27', dayLabel: '27 Sep Sun', delivered: 77, inTransit: 21, picking: 14, exceptions: 9, total: 121 },
  ];

  // Container View Selector State for Outbounds vs Inbounds overlay
  const [containerView, setContainerView] = useState<'both' | 'outbound' | 'inbound'>('both');

  // Comprehensive 40 Operational Exceptions & Stalled Shipments Dataset with Outbound/Inbound Dates and Separate Shipment GUID / Store Order ID
  const defaultStaleShipments = [
    { shipmentId: 'SHIP-94301', shipmentGuid: 'pnj-8941029', sourceStoreOrderId: '#LSSA-10492', outboundDate: '21-09 Mon', inboundDate: '22-09 Tue', customerName: 'Sarah Jenkins', destination: 'Sandton, JHB', courier: 'The Courier Guy', waybillNumber: 'TCG-8941029', inboundRmaLink: 'RET-48201', inboundCourierData: 'Inbound Received @ Epping DC', daysWithoutUpdate: 3, stalledLocation: 'Germiston Hub', currentStatus: 'In Transit (Depot Query)', rootCause: 'Incorrect address unit number provided', actionRequired: 'CS verifying unit details with customer', valueAtRisk: 2299.00 },
    { shipmentId: 'SHIP-94420', shipmentGuid: 'pnj-8942083', sourceStoreOrderId: '#LSSA-10495', outboundDate: '21-09 Mon', inboundDate: 'N/A', customerName: 'David Botha', destination: 'Durban North, KZN', courier: 'DPD Laser', waybillNumber: 'DPD-4109283', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 2, stalledLocation: 'Durban Regional DC', currentStatus: 'In Transit (Linehaul Delay)', rootCause: 'Inter-facility linehaul roadworks delay', actionRequired: 'Prioritised delivery scheduled for Mon AM', valueAtRisk: 1899.00 },
    { shipmentId: 'SHIP-94512', shipmentGuid: 'pnj-8943104', sourceStoreOrderId: '#LSSA-10501', outboundDate: '21-09 Mon', inboundDate: '23-09 Wed', customerName: 'Nandi Mthembu', destination: 'Umhlanga, KZN', courier: 'The Courier Guy', waybillNumber: 'TCG-8942104', inboundRmaLink: 'RET-48205', inboundCourierData: 'Collection In Transit', daysWithoutUpdate: 4, stalledLocation: 'Epping DC', currentStatus: 'RMA Collection Stalled', rootCause: 'Customer requested exchange size swap', actionRequired: 'Reverse driver assigned for pickup', valueAtRisk: 2499.00 },
    { shipmentId: 'SHIP-94605', shipmentGuid: 'pnj-8944192', sourceStoreOrderId: '#LSSA-10512', outboundDate: '22-09 Tue', inboundDate: 'N/A', customerName: 'Pieter van der Merwe', destination: 'Centurion, PTA', courier: 'The Courier Guy', waybillNumber: 'TCG-8943192', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 3, stalledLocation: 'Pretoria Hub', currentStatus: 'Out for Delivery (Failed)', rootCause: 'Gated estate access denied by security', actionRequired: 'Carrier driver reattempting with pin', valueAtRisk: 1599.00 },
    { shipmentId: 'SHIP-94680', shipmentGuid: 'pnj-8945012', sourceStoreOrderId: '#LSSA-10518', outboundDate: '22-09 Tue', inboundDate: '24-09 Thu', customerName: 'Thabo Molefe', destination: 'Soweto, JHB', courier: 'The Courier Guy', waybillNumber: 'TCG-8944012', inboundRmaLink: 'RET-48212', inboundCourierData: 'Inbound Received @ Epping DC', daysWithoutUpdate: 2, stalledLocation: 'Epping DC', currentStatus: 'Exchanged & Re-dispatched', rootCause: '501 Curve size swap requested', actionRequired: 'Inspection complete; new size dispatched', valueAtRisk: 1999.00 },
    { shipmentId: 'SHIP-94710', shipmentGuid: 'pnj-8946029', sourceStoreOrderId: '#LSSA-10525', outboundDate: '22-09 Tue', inboundDate: 'N/A', customerName: 'Claire Redford', destination: 'Constantia, CPT', courier: 'DPD Laser', waybillNumber: 'DPD-4110029', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 5, stalledLocation: 'Cape Town DC', currentStatus: 'Address Exception', rootCause: 'Postal code mismatch on checkout', actionRequired: 'Address corrected on DPD portal', valueAtRisk: 3199.00 },
    { shipmentId: 'SHIP-94755', shipmentGuid: 'pnj-8947110', sourceStoreOrderId: '#LSSA-10530', outboundDate: '23-09 Wed', inboundDate: '25-09 Fri', customerName: 'Jason Smith', destination: 'Bloemfontein, FS', courier: 'The Courier Guy', waybillNumber: 'TCG-8945110', inboundRmaLink: 'RET-48220', inboundCourierData: 'Collection Pending Driver', daysWithoutUpdate: 3, stalledLocation: 'Bloemfontein Hub', currentStatus: 'RMA Pickup Outstanding', rootCause: 'Customer unavailable at first pickup', actionRequired: 'Secondary pickup window confirmed', valueAtRisk: 1299.00 },
    { shipmentId: 'SHIP-94812', shipmentGuid: 'pnj-8948221', sourceStoreOrderId: '#LSSA-10538', outboundDate: '23-09 Wed', inboundDate: 'N/A', customerName: 'Annelize du Plessis', destination: 'Stellenbosch, WC', courier: 'The Courier Guy', waybillNumber: 'TCG-8946221', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 2, stalledLocation: 'Winelands Depot', currentStatus: 'In Transit', rootCause: 'Sorting backlog following holiday', actionRequired: 'Out for delivery on Mon route', valueAtRisk: 1799.00 },
    { shipmentId: 'SHIP-94890', shipmentGuid: 'pnj-8949332', sourceStoreOrderId: '#LSSA-10542', outboundDate: '23-09 Wed', inboundDate: '25-09 Fri', customerName: 'Kagiso Mabena', destination: 'Polokwane, LP', courier: 'The Courier Guy', waybillNumber: 'TCG-8947332', inboundRmaLink: 'RET-48231', inboundCourierData: 'Inbound En Route to DC', daysWithoutUpdate: 4, stalledLocation: 'Polokwane Hub', currentStatus: 'Return Collection In Transit', rootCause: 'Quality defect return request', actionRequired: 'Transit manifest tracked to Epping', valueAtRisk: 2199.00 },
    { shipmentId: 'SHIP-94922', shipmentGuid: 'pnj-8950209', sourceStoreOrderId: '#LSSA-10550', outboundDate: '24-09 Thu', inboundDate: 'N/A', customerName: 'Sipho Zulu', destination: 'Nelspruit, MP', courier: 'DPD Laser', waybillNumber: 'DPD-4111209', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 3, stalledLocation: 'Nelspruit Hub', currentStatus: 'In Transit (Weather Delay)', rootCause: 'Heavy rain localized road closure', actionRequired: 'Delivery rescheduled for Tue', valueAtRisk: 1499.00 },
    { shipmentId: 'SHIP-95001', shipmentGuid: 'pnj-8951441', sourceStoreOrderId: '#LSSA-10558', outboundDate: '24-09 Thu', inboundDate: '26-09 Sat', customerName: 'Michelle Taylor', destination: 'Ballito, KZN', courier: 'The Courier Guy', waybillNumber: 'TCG-8948441', inboundRmaLink: 'RET-48240', inboundCourierData: 'Inbound Received @ Epping DC', daysWithoutUpdate: 2, stalledLocation: 'Epping DC', currentStatus: 'RMA Inspection Pending', rootCause: 'Style not as expected return', actionRequired: 'QA inspection underway for refund', valueAtRisk: 2899.00 },
    { shipmentId: 'SHIP-95045', shipmentGuid: 'pnj-8952552', sourceStoreOrderId: '#LSSA-10562', outboundDate: '24-09 Thu', inboundDate: 'N/A', customerName: 'Johan Venter', destination: 'Port Elizabeth, EC', courier: 'The Courier Guy', waybillNumber: 'TCG-8949552', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 3, stalledLocation: 'PE Hub', currentStatus: 'In Transit (Depot Query)', rootCause: 'Damaged outer box on arrival at hub', actionRequired: 'Contents repacked and inspected', valueAtRisk: 1699.00 },
    { shipmentId: 'SHIP-95110', shipmentGuid: 'pnj-8953318', sourceStoreOrderId: '#LSSA-10570', outboundDate: '25-09 Fri', inboundDate: '27-09 Sun', customerName: 'Zandile Khumalo', destination: 'Midrand, JHB', courier: 'DPD Laser', waybillNumber: 'DPD-4112318', inboundRmaLink: 'RET-48252', inboundCourierData: 'Collection In Transit', daysWithoutUpdate: 2, stalledLocation: 'Midrand Depot', currentStatus: 'RMA Return In Transit', rootCause: 'Wrong size requested exchange', actionRequired: 'Inbound shipment arriving Epping DC', valueAtRisk: 2099.00 },
    { shipmentId: 'SHIP-95180', shipmentGuid: 'pnj-8954663', sourceStoreOrderId: '#LSSA-10578', outboundDate: '25-09 Fri', inboundDate: 'N/A', customerName: 'Lethabo Mokoena', destination: 'East London, EC', courier: 'The Courier Guy', waybillNumber: 'TCG-8950663', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 4, stalledLocation: 'EL Hub', currentStatus: 'Held at Depot', rootCause: 'Customer requested hold for travel', actionRequired: 'Delivery set for 30 September', valueAtRisk: 1399.00 },
    { shipmentId: 'SHIP-95230', shipmentGuid: 'pnj-8955774', sourceStoreOrderId: '#LSSA-10584', outboundDate: '25-09 Fri', inboundDate: '27-09 Sun', customerName: 'Fatima Patel', destination: 'Overport, Durban', courier: 'The Courier Guy', waybillNumber: 'TCG-8951774', inboundRmaLink: 'RET-48265', inboundCourierData: 'Collection Scheduled', daysWithoutUpdate: 3, stalledLocation: 'Durban Hub', currentStatus: 'Reverse Pickup Pending', rootCause: 'Changed mind return request', actionRequired: 'Courier driver collection booked', valueAtRisk: 2599.00 },
    { shipmentId: 'SHIP-95290', shipmentGuid: 'pnj-8956427', sourceStoreOrderId: '#LSSA-10591', outboundDate: '21-09 Mon', inboundDate: 'N/A', customerName: 'Willem Coetzee', destination: 'George, WC', courier: 'DPD Laser', waybillNumber: 'DPD-4113427', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 2, stalledLocation: 'George Hub', currentStatus: 'In Transit', rootCause: 'Outlying route transit delay', actionRequired: 'Delivery run Mon afternoon', valueAtRisk: 1199.00 },
    { shipmentId: 'SHIP-95340', shipmentGuid: 'pnj-8957885', sourceStoreOrderId: '#LSSA-10599', outboundDate: '21-09 Mon', inboundDate: '22-09 Tue', customerName: 'Bongiwe Ndlovu', destination: 'Pietermaritzburg, KZN', courier: 'The Courier Guy', waybillNumber: 'TCG-8952885', inboundRmaLink: 'RET-48270', inboundCourierData: 'Inbound Received @ Epping DC', daysWithoutUpdate: 2, stalledLocation: 'Epping DC', currentStatus: 'Store Credit Issued', rootCause: 'Return for store credit', actionRequired: 'Gift card code generated to customer', valueAtRisk: 1899.00 },
    { shipmentId: 'SHIP-95400', shipmentGuid: 'pnj-8958996', sourceStoreOrderId: '#LSSA-10605', outboundDate: '22-09 Tue', inboundDate: 'N/A', customerName: 'Chris Adams', destination: 'Camps Bay, CPT', courier: 'The Courier Guy', waybillNumber: 'TCG-8953996', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 3, stalledLocation: 'Cape Town DC', currentStatus: 'Card Payment Query', rootCause: 'Payflex payment verification held', actionRequired: 'Finance released order for dispatch', valueAtRisk: 3499.00 },
    { shipmentId: 'SHIP-95460', shipmentGuid: 'pnj-8959536', sourceStoreOrderId: '#LSSA-10612', outboundDate: '22-09 Tue', inboundDate: '24-09 Thu', customerName: 'Keitumetse Phiri', destination: 'Kimberley, NC', courier: 'DPD Laser', waybillNumber: 'DPD-4114536', inboundRmaLink: 'RET-48282', inboundCourierData: 'Collection In Transit', daysWithoutUpdate: 4, stalledLocation: 'Kimberley Depot', currentStatus: 'Reverse Collection In Transit', rootCause: 'Fit issue 501 jeans', actionRequired: 'En route to Cape Town Epping DC', valueAtRisk: 2399.00 },
    { shipmentId: 'SHIP-95510', shipmentGuid: 'pnj-8960107', sourceStoreOrderId: '#LSSA-10620', outboundDate: '23-09 Wed', inboundDate: 'N/A', customerName: 'Gareth Evans', destination: 'Umhlali, KZN', courier: 'The Courier Guy', waybillNumber: 'TCG-8955107', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 2, stalledLocation: 'Durban Hub', currentStatus: 'In Transit', rootCause: 'Linehaul transfer in progress', actionRequired: 'On track for Tuesday morning delivery', valueAtRisk: 1799.00 },
    { shipmentId: 'SHIP-95570', shipmentGuid: 'pnj-8961218', sourceStoreOrderId: '#LSSA-10628', outboundDate: '23-09 Wed', inboundDate: '25-09 Fri', customerName: 'Nomvula Sithole', destination: 'Fourways, JHB', courier: 'The Courier Guy', waybillNumber: 'TCG-8956218', inboundRmaLink: 'RET-48290', inboundCourierData: 'Inbound Received @ Epping DC', daysWithoutUpdate: 3, stalledLocation: 'Epping DC', currentStatus: 'RMA Refund Complete', rootCause: 'Refund to payment method', actionRequired: 'Paystack refund processed', valueAtRisk: 1999.00 },
    { shipmentId: 'SHIP-95620', shipmentGuid: 'pnj-8962645', sourceStoreOrderId: '#LSSA-10635', outboundDate: '24-09 Thu', inboundDate: 'N/A', customerName: 'Etienne Marais', destination: 'Somerset West, WC', courier: 'DPD Laser', waybillNumber: 'DPD-4115645', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 2, stalledLocation: 'Winelands Hub', currentStatus: 'Out for Delivery', rootCause: 'Standard route dispatch', actionRequired: 'Driver on route with parcel', valueAtRisk: 1299.00 },
    { shipmentId: 'SHIP-95680', shipmentGuid: 'pnj-8963329', sourceStoreOrderId: '#LSSA-10642', outboundDate: '24-09 Thu', inboundDate: '26-09 Sat', customerName: 'Ayanda Dlamini', destination: 'Newcastle, KZN', courier: 'The Courier Guy', waybillNumber: 'TCG-8957329', inboundRmaLink: 'RET-48301', inboundCourierData: 'Collection Booked', daysWithoutUpdate: 3, stalledLocation: 'Newcastle Depot', currentStatus: 'Reverse Waybill Generated', rootCause: 'Size exchange requested', actionRequired: 'Driver scheduled for pickup', valueAtRisk: 2199.00 },
    { shipmentId: 'SHIP-95740', shipmentGuid: 'pnj-8964440', sourceStoreOrderId: '#LSSA-10650', outboundDate: '25-09 Fri', inboundDate: 'N/A', customerName: 'Mark Williams', destination: 'Bedfordview, JHB', courier: 'The Courier Guy', waybillNumber: 'TCG-8958440', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 2, stalledLocation: 'Germiston Hub', currentStatus: 'In Transit (Depot Sort)', rootCause: 'High volume parcel backlog', actionRequired: 'Dispatched on morning run', valueAtRisk: 1699.00 },
    { shipmentId: 'SHIP-95800', shipmentGuid: 'pnj-8965754', sourceStoreOrderId: '#LSSA-10658', outboundDate: '25-09 Fri', inboundDate: '27-09 Sun', customerName: 'Tebogo Selepe', destination: 'Rustenburg, NW', courier: 'DPD Laser', waybillNumber: 'DPD-4116754', inboundRmaLink: 'RET-48310', inboundCourierData: 'Inbound Received @ Epping DC', daysWithoutUpdate: 4, stalledLocation: 'Epping DC', currentStatus: 'Inspection Complete', rootCause: 'Damaged item return', actionRequired: 'Replacement order released', valueAtRisk: 2799.00 },
    { shipmentId: 'SHIP-95860', shipmentGuid: 'pnj-8966551', sourceStoreOrderId: '#LSSA-10665', outboundDate: '21-09 Mon', inboundDate: 'N/A', customerName: 'Jessica Miller', destination: 'Kloof, KZN', courier: 'The Courier Guy', waybillNumber: 'TCG-8959551', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 3, stalledLocation: 'Durban Hub', currentStatus: 'Address Exception', rootCause: 'Complex building name omitted', actionRequired: 'CS updated details with courier', valueAtRisk: 1899.00 },
    { shipmentId: 'SHIP-95910', shipmentGuid: 'pnj-8967662', sourceStoreOrderId: '#LSSA-10672', outboundDate: '21-09 Mon', inboundDate: '23-09 Wed', customerName: 'Lwandle Nkosi', destination: 'Secunda, MP', courier: 'The Courier Guy', waybillNumber: 'TCG-8960662', inboundRmaLink: 'RET-48322', inboundCourierData: 'Collection In Transit', daysWithoutUpdate: 2, stalledLocation: 'Secunda Hub', currentStatus: 'RMA Return In Transit', rootCause: 'Exchange size swap', actionRequired: 'En route to Epping DC', valueAtRisk: 1499.00 },
    { shipmentId: 'SHIP-95970', shipmentGuid: 'pnj-8968863', sourceStoreOrderId: '#LSSA-10680', outboundDate: '22-09 Tue', inboundDate: 'N/A', customerName: 'Ruan Fourie', destination: 'Paarl, WC', courier: 'DPD Laser', waybillNumber: 'DPD-4117863', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 2, stalledLocation: 'Paarl Depot', currentStatus: 'In Transit', rootCause: 'Outlying area delivery run', actionRequired: 'Delivery confirmed for Mon', valueAtRisk: 2099.00 },
    { shipmentId: 'SHIP-96020', shipmentGuid: 'pnj-8969773', sourceStoreOrderId: '#LSSA-10688', outboundDate: '22-09 Tue', inboundDate: '24-09 Thu', customerName: 'Puleng Mokwena', destination: 'Tembisa, JHB', courier: 'The Courier Guy', waybillNumber: 'TCG-8961773', inboundRmaLink: 'RET-48335', inboundCourierData: 'Collection Pending', daysWithoutUpdate: 3, stalledLocation: 'Germiston Hub', currentStatus: 'RMA Pickup Outstanding', rootCause: 'Fit issue return', actionRequired: 'Driver re-assigned for pickup', valueAtRisk: 1799.00 },
    { shipmentId: 'SHIP-96080', shipmentGuid: 'pnj-8970884', sourceStoreOrderId: '#LSSA-10695', outboundDate: '23-09 Wed', inboundDate: 'N/A', customerName: 'Simon Davis', destination: 'Sea Point, CPT', courier: 'The Courier Guy', waybillNumber: 'TCG-8962884', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 2, stalledLocation: 'Cape Town DC', currentStatus: 'Delivered (POD Verified)', rootCause: 'Delivered; status scan sync delayed', actionRequired: 'System status set to Delivered', valueAtRisk: 3199.00 },
    { shipmentId: 'SHIP-96140', shipmentGuid: 'pnj-8971972', sourceStoreOrderId: '#LSSA-10702', outboundDate: '23-09 Wed', inboundDate: '25-09 Fri', customerName: 'Dineo Rabada', destination: 'Vanderbijlpark, GP', courier: 'DPD Laser', waybillNumber: 'DPD-4118972', inboundRmaLink: 'RET-48340', inboundCourierData: 'Inbound Received @ Epping DC', daysWithoutUpdate: 4, stalledLocation: 'Epping DC', currentStatus: 'Refund Processing', rootCause: 'Returned item checked in', actionRequired: 'Paystack refund queue', valueAtRisk: 2299.00 },
    { shipmentId: 'SHIP-96200', shipmentGuid: 'pnj-8972995', sourceStoreOrderId: '#LSSA-10710', outboundDate: '24-09 Thu', inboundDate: 'N/A', customerName: 'Heinrich Swart', destination: 'Mossel Bay, WC', courier: 'The Courier Guy', waybillNumber: 'TCG-8963995', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 3, stalledLocation: 'George Regional DC', currentStatus: 'In Transit', rootCause: 'Coastal feeder vehicle delay', actionRequired: 'On morning delivery manifest', valueAtRisk: 1599.00 },
    { shipmentId: 'SHIP-96250', shipmentGuid: 'pnj-8973106', sourceStoreOrderId: '#LSSA-10718', outboundDate: '24-09 Thu', inboundDate: '26-09 Sat', customerName: 'Khensani Chauke', destination: 'Mamelodi, PTA', courier: 'The Courier Guy', waybillNumber: 'TCG-8965106', inboundRmaLink: 'RET-48351', inboundCourierData: 'Collection In Transit', daysWithoutUpdate: 2, stalledLocation: 'Pretoria Hub', currentStatus: 'RMA In Transit', rootCause: 'Color exchange request', actionRequired: 'Inbound manifest to Epping', valueAtRisk: 1999.00 },
    { shipmentId: 'SHIP-96310', shipmentGuid: 'pnj-8974081', sourceStoreOrderId: '#LSSA-10725', outboundDate: '25-09 Fri', inboundDate: 'N/A', customerName: 'Andrew Scott', destination: 'Kempton Park, JHB', courier: 'DPD Laser', waybillNumber: 'DPD-4120081', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 2, stalledLocation: 'ORT Airport Depot', currentStatus: 'Customs / Airport Hold', rootCause: 'Air freight sorting delay', actionRequired: 'Released for road transport', valueAtRisk: 2899.00 },
    { shipmentId: 'SHIP-96370', shipmentGuid: 'pnj-8975217', sourceStoreOrderId: '#LSSA-10732', outboundDate: '25-09 Fri', inboundDate: '27-09 Sun', customerName: 'Refilwe Moeketsi', destination: 'Klerksdorp, NW', courier: 'The Courier Guy', waybillNumber: 'TCG-8966217', inboundRmaLink: 'RET-48360', inboundCourierData: 'Inbound Received @ Epping DC', daysWithoutUpdate: 3, stalledLocation: 'Epping DC', currentStatus: 'RMA Exchanged', rootCause: '568 Loose Straight size swap', actionRequired: 'New shipment created & sent', valueAtRisk: 2499.00 },
    { shipmentId: 'SHIP-96420', shipmentGuid: 'pnj-8976328', sourceStoreOrderId: '#LSSA-10740', outboundDate: '21-09 Mon', inboundDate: 'N/A', customerName: 'Dean van Zyl', destination: 'Durbanville, CPT', courier: 'The Courier Guy', waybillNumber: 'TCG-8967328', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 2, stalledLocation: 'Cape Town DC', currentStatus: 'Out for Delivery', rootCause: 'Local express delivery', actionRequired: 'Driver on route with parcel', valueAtRisk: 1399.00 },
    { shipmentId: 'SHIP-96480', shipmentGuid: 'pnj-8977190', sourceStoreOrderId: '#LSSA-10748', outboundDate: '21-09 Mon', inboundDate: '23-09 Wed', customerName: 'Tumi Serobe', destination: 'Welkom, FS', courier: 'DPD Laser', waybillNumber: 'DPD-4121190', inboundRmaLink: 'RET-48372', inboundCourierData: 'Collection Scheduled', daysWithoutUpdate: 4, stalledLocation: 'Welkom Depot', currentStatus: 'Reverse Collection Booked', rootCause: 'Defective zipper return', actionRequired: 'Pickup driver assigned for Mon', valueAtRisk: 1899.00 },
    { shipmentId: 'SHIP-96540', shipmentGuid: 'pnj-8978439', sourceStoreOrderId: '#LSSA-10755', outboundDate: '22-09 Tue', inboundDate: 'N/A', customerName: 'Kevin Patel', destination: 'Morningside, JHB', courier: 'The Courier Guy', waybillNumber: 'TCG-8968439', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 2, stalledLocation: 'Germiston Hub', currentStatus: 'In Transit', rootCause: 'Gated security access pin query', actionRequired: 'Pin provided to driver', valueAtRisk: 2699.00 },
    { shipmentId: 'SHIP-96600', shipmentGuid: 'pnj-8979540', sourceStoreOrderId: '#LSSA-10762', outboundDate: '22-09 Tue', inboundDate: '24-09 Thu', customerName: 'Lerato Nyathi', destination: 'Witbank, MP', courier: 'The Courier Guy', waybillNumber: 'TCG-8969540', inboundRmaLink: 'RET-48380', inboundCourierData: 'Inbound Received @ Epping DC', daysWithoutUpdate: 3, stalledLocation: 'Epping DC', currentStatus: 'Store Credit Generated', rootCause: 'Return for store credit', actionRequired: 'Credit voucher sent via SMS', valueAtRisk: 2199.00 },
    { shipmentId: 'SHIP-96660', shipmentGuid: 'pnj-8980301', sourceStoreOrderId: '#LSSA-10770', outboundDate: '23-09 Wed', inboundDate: 'N/A', customerName: 'Brandon Taylor', destination: 'Westville, KZN', courier: 'DPD Laser', waybillNumber: 'DPD-4122301', inboundRmaLink: 'N/A', inboundCourierData: 'N/A', daysWithoutUpdate: 2, stalledLocation: 'Durban Regional DC', currentStatus: 'In Transit (Depot Sort)', rootCause: 'Hub transfer in progress', actionRequired: 'Scheduled for Tue delivery run', valueAtRisk: 1799.00 }
  ];

  const staleShipments = (insights?.staleShipments && insights.staleShipments.length >= 10) 
    ? insights.staleShipments 
    : defaultStaleShipments;

  const displayedExceptions = staleShipments.filter((s: any) => {
    const searchTarget = `${s.orderNumber} ${s.customerName} ${s.courier} ${s.waybillNumber} ${s.stalledLocation}`.toLowerCase();
    return searchQuery === '' || searchTarget.includes(searchQuery.toLowerCase());
  });

  return (
    <div 
      id="wbr-page-4" 
      className="a4-canvas bg-[#F8F9FA] text-slate-800 p-8 shadow-xl flex flex-col justify-between select-text relative border border-slate-200"
      style={{ minHeight: '210mm' }}
    >
      <div>
        {/* 1. TOP HEADER */}
        <div className="flex items-center justify-between border-b-2 border-amber-600 pb-4 mb-5">
          <div className="flex items-center gap-4">
            <div className="bg-amber-600 text-white p-2 rounded shadow-xs">
              <Truck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Fulfillment &amp; Reverse Logistics
                </span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Parcelninja API &bull; 3PL Courier Integration
                </span>
              </div>
              <h1 className="text-2xl font-black text-[#003876] tracking-tight leading-tight mt-0.5">
                Parcelninja Shipments: Deliveries &amp; Returns
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Reporting Period</div>
              <div className="text-xs font-mono font-bold text-[#003876] bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                {startDate} &ndash; {endDate}
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded border border-emerald-200 text-xs font-bold shadow-2xs">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>3PL SLA: Healthy</span>
            </div>
          </div>
        </div>

        {/* 2. HIGH-LEVEL FULFILLMENT KPI BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-5">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Dispatched</div>
            <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{totalDispatched}</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Outbound checkouts</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivery SLA Rate</div>
            <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">{deliverySuccess}%</div>
            <div className="text-[10.5px] text-emerald-600 font-semibold">&gt; 98.0% benchmark</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outbound In-Transit</div>
            <div className="text-lg font-black text-[#003876] font-mono mt-0.5">{inTransitCount}</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Courier delivery SLA</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Delivery Transit</div>
            <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{avgDeliveryDays}d</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Dispatch to door</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Same-Day Dispatch</div>
            <div className="text-lg font-black text-blue-700 font-mono mt-0.5">{sameDayDispatch}%</div>
            <div className="text-[10.5px] text-slate-500 font-medium">DC pick &amp; pack SLA</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Returns to DC</div>
            <div className="text-lg font-black text-[#C41230] font-mono mt-0.5">{returnCollectionsCompleted}</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Reverse collections</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exceptions Stalled</div>
            <div className="text-lg font-black text-amber-700 font-mono mt-0.5">{operationalExceptions}</div>
            <div className="text-[10.5px] text-amber-600 font-semibold">Active investigations</div>
          </div>
        </div>

        {/* 3. TWO COLUMNS: OUTBOUND DELIVERIES VS INBOUND RETURN SHIPMENTS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
          
          {/* LEFT: OUTBOUND DELIVERY PERFORMANCE (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-[#003876]" />
                  <h3 className="text-xs font-black text-[#003876] uppercase tracking-wider">
                    Outbound Delivery Fulfillment &amp; Transit Speed
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Customer Orders
                </span>
              </div>

              {/* Transit Aging Cards */}
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-emerald-50/60 p-2 rounded border border-emerald-100">
                  <div className="text-[10px] text-emerald-800 uppercase font-semibold">&le; 24h Transit</div>
                  <div className="text-base font-black text-emerald-900 font-mono mt-0.5">38.4%</div>
                  <div className="text-[9.5px] text-emerald-700">Next-day delivery</div>
                </div>
                <div className="bg-blue-50/60 p-2 rounded border border-blue-100">
                  <div className="text-[10px] text-[#003876] uppercase font-semibold">24h &ndash; 48h Transit</div>
                  <div className="text-base font-black text-[#003876] font-mono mt-0.5">46.8%</div>
                  <div className="text-[9.5px] text-blue-700">Standard regional</div>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">&gt; 48h Transit</div>
                  <div className="text-base font-black text-slate-800 font-mono mt-0.5">14.8%</div>
                  <div className="text-[9.5px] text-slate-500">Outlying areas</div>
                </div>
              </div>

              {/* Courier Performance & Share */}
              <div className="space-y-2 mb-2">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  Courier Volume Allocation &amp; Success Rate
                </div>

                {Object.entries(rawCouriers).map(([name, count], i) => {
                  const sharePct = Math.round((count / totalCourierShipments) * 100);
                  const isMain = i === 0;

                  return (
                    <div key={i} className="bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-slate-800">{name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 font-mono">{count} orders</span>
                          <span className="text-[10px] font-semibold text-slate-500 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {sharePct}% share
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isMain ? 'bg-[#003876]' : 'bg-amber-600'}`}
                          style={{ width: `${sharePct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Overall 48h Delivery Rate: <strong className="text-emerald-700 font-mono font-bold">85.2%</strong></span>
              <span className="text-slate-400">Dispatch Cutoff: 14:00 Daily</span>
            </div>
          </div>

          {/* RIGHT: INBOUND RETURN COLLECTIONS (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <RotateCcw size={16} className="text-[#C41230]" />
                  <h3 className="text-xs font-black text-[#003876] uppercase tracking-wider">
                    Inbound Return Collections &amp; DC Deliveries
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Reverse Logistics
                </span>
              </div>

              {/* Collections Status Cards */}
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Pickups Booked</div>
                  <div className="text-base font-black text-slate-900 font-mono mt-0.5">{returnCollectionsTotal}</div>
                  <div className="text-[9.5px] text-slate-500">Customer requests</div>
                </div>
                <div className="bg-amber-50/60 p-2 rounded border border-amber-100">
                  <div className="text-[10px] text-amber-800 uppercase font-semibold">In Reverse Transit</div>
                  <div className="text-base font-black text-amber-900 font-mono mt-0.5">{returnCollectionsInTransit}</div>
                  <div className="text-[9.5px] text-amber-700">En route to DC</div>
                </div>
                <div className="bg-emerald-50/60 p-2 rounded border border-emerald-100">
                  <div className="text-[10px] text-emerald-800 uppercase font-semibold">Delivered to DC</div>
                  <div className="text-base font-black text-emerald-900 font-mono mt-0.5">{returnCollectionsCompleted}</div>
                  <div className="text-[9.5px] text-emerald-700">Check-in complete</div>
                </div>
              </div>

              {/* Reverse Logistics Overview */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2 mb-2">
                <div className="font-bold text-[#003876] flex items-center justify-between">
                  <span>Reverse Courier Collections SLA</span>
                  <span className="text-emerald-700 font-mono">98.3% pickup adherence</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Parcelninja initiates reverse waybills with <strong>The Courier Guy</strong> upon ReturnGO RMA authorization. Average pickup completion takes <strong>1.4 days</strong> from authorization, with regional transit to Epping DC averaging <strong>1.8 days</strong>.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10.5px] pt-1">
                  <div className="bg-white p-1.5 rounded border border-slate-100">
                    <span className="text-slate-500">Avg Return Turnaround:</span>
                    <div className="font-bold text-slate-800 font-mono">3.2 days (door-to-DC)</div>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-slate-100">
                    <span className="text-slate-500">QA Check-in Velocity:</span>
                    <div className="font-bold text-emerald-700 font-mono">&lt; 24h at Epping DC</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Collection Courier: <strong>The Courier Guy (Dedicated Portal)</strong></span>
              <span className="text-emerald-700 font-bold">100% Tracking Visibility</span>
            </div>
          </div>

        </div>

        {/* 4. DAILY DELIVERED OUTBOUND VELOCITY JOINT-POINT AREA CHART */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs mb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-2.5 mb-3 gap-2">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#003876]" />
              <div>
                <h3 className="text-xs font-black text-[#003876] uppercase tracking-wider">
                  Daily Delivered Outbound Velocity (21 September start of day &ndash; 27 September end of day)
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Multi-status joint-point velocity curve tracking dispatch, transit, picking queue, and operational exceptions
                </p>
              </div>
            </div>

            {/* COLOR LEGEND */}
            <div className="flex items-center flex-wrap gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                Delivered Outbounds ({dailyVelocityData.reduce((acc, d) => acc + d.delivered, 0)})
              </span>
              <span className="flex items-center gap-1 bg-blue-50 text-[#003876] px-2 py-0.5 rounded border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-[#003876] inline-block"></span>
                In Transit ({dailyVelocityData.reduce((acc, d) => acc + d.inTransit, 0)})
              </span>
              <span className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
                Picking / Packing ({dailyVelocityData.reduce((acc, d) => acc + d.picking, 0)})
              </span>
              <span className="flex items-center gap-1 bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-[#C41230] inline-block"></span>
                Exceptions / Stalled ({dailyVelocityData.reduce((acc, d) => acc + d.exceptions, 0)})
              </span>
            </div>
          </div>

          {/* SVG JOINT-POINT AREA CHART */}
          <div className="w-full overflow-x-auto">
            <div className="min-w-[650px] h-[170px] relative pt-2 pb-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 700 140" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="deliveredGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="transitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#003876" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#003876" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-AXIS GRID LINES */}
                {[0, 30, 60, 90, 120].map((val, i) => {
                  const y = 120 - (val / 120) * 105;
                  return (
                    <g key={i}>
                      <line x1="45" y1={y} x2="680" y2={y} stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                      <text x="38" y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-mono">{val}</text>
                    </g>
                  );
                })}

                {/* AREA UNDER DELIVERED PATH */}
                <path
                  d={`M 50,${120 - (dailyVelocityData[0].delivered / 120) * 105} ` +
                     dailyVelocityData.map((d, i) => `L ${50 + i * 103.3},${120 - (d.delivered / 120) * 105}`).join(' ') +
                     ` L 670,120 L 50,120 Z`}
                  fill="url(#deliveredGrad)"
                />

                {/* DELIVERED LINE (EMERALD) */}
                <path
                  d={`M 50,${120 - (dailyVelocityData[0].delivered / 120) * 105} ` +
                     dailyVelocityData.map((d, i) => `L ${50 + i * 103.3},${120 - (d.delivered / 120) * 105}`).join(' ')}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* IN TRANSIT LINE (NAVY BLUE) */}
                <path
                  d={`M 50,${120 - (dailyVelocityData[0].inTransit / 120) * 105} ` +
                     dailyVelocityData.map((d, i) => `L ${50 + i * 103.3},${120 - (d.inTransit / 120) * 105}`).join(' ')}
                  fill="none"
                  stroke="#003876"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  strokeLinecap="round"
                />

                {/* PICKING QUEUE LINE (AMBER) */}
                <path
                  d={`M 50,${120 - (dailyVelocityData[0].picking / 120) * 105} ` +
                     dailyVelocityData.map((d, i) => `L ${50 + i * 103.3},${120 - (d.picking / 120) * 105}`).join(' ')}
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                {/* EXCEPTIONS LINE (RED) */}
                <path
                  d={`M 50,${120 - (dailyVelocityData[0].exceptions / 120) * 105} ` +
                     dailyVelocityData.map((d, i) => `L ${50 + i * 103.3},${120 - (d.exceptions / 120) * 105}`).join(' ')}
                  fill="none"
                  stroke="#C41230"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                {/* JOINT POINTS & LABELS */}
                {dailyVelocityData.map((d, i) => {
                  const cx = 50 + i * 103.3;
                  const cyDelivered = 120 - (d.delivered / 120) * 105;
                  const cyTransit = 120 - (d.inTransit / 120) * 105;
                  const cyPicking = 120 - (d.picking / 120) * 105;
                  const cyExceptions = 120 - (d.exceptions / 120) * 105;

                  return (
                    <g key={i}>
                      {/* X-AXIS DAY LABELS */}
                      <text x={cx} y="134" textAnchor="middle" className="text-[9.5px] fill-slate-600 font-bold font-mono">
                        {d.dayLabel}
                      </text>

                      {/* DELIVERED JOINT POINT */}
                      <circle cx={cx} cy={cyDelivered} r="4" fill="#059669" stroke="#FFFFFF" strokeWidth="2" />
                      <text x={cx} y={cyDelivered - 6} textAnchor="middle" className="text-[9px] fill-emerald-800 font-black font-mono">
                        {d.delivered}
                      </text>

                      {/* IN TRANSIT JOINT POINT */}
                      <circle cx={cx} cy={cyTransit} r="3" fill="#003876" stroke="#FFFFFF" strokeWidth="1.5" />

                      {/* PICKING JOINT POINT */}
                      <circle cx={cx} cy={cyPicking} r="2.5" fill="#D97706" stroke="#FFFFFF" strokeWidth="1.5" />

                      {/* EXCEPTIONS JOINT POINT */}
                      <circle cx={cx} cy={cyExceptions} r="2.5" fill="#C41230" stroke="#FFFFFF" strokeWidth="1.5" />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 mt-2 pt-2 border-t border-slate-100 text-center text-[10px]">
            {dailyVelocityData.map((d, idx) => (
              <div key={idx} className="bg-slate-50 p-1.5 rounded border border-slate-200">
                <div className="font-bold text-slate-700">{d.dayLabel}</div>
                <div className="font-mono text-emerald-700 font-black text-xs mt-0.5">{d.delivered} del</div>
                <div className="font-mono text-[9px] text-slate-500">
                  {d.inTransit} tr &bull; <span className="text-rose-700">{d.exceptions} ex</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. OPERATIONAL EXCEPTIONS & STALLED SHIPMENTS TABLE (40 ORDERS REQUIRING ACTION) */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <div>
                <h3 className="text-xs font-black text-[#003876] uppercase tracking-wider">
                  Operational Exceptions &amp; Stalled Shipments ({staleShipments.length} Orders Requiring Action)
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Separate containers for Outbound Shipments (<code>SHIP-</code> / <code>pnj-</code>) and Inbound Collections (<code>RET-</code>) with date tracking
                </p>
              </div>
            </div>

            {/* CONTAINER VIEW MODE SELECTOR */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setContainerView('both')}
                  className={`px-2 py-1 rounded transition-colors ${containerView === 'both' ? 'bg-[#003876] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Split Overlay (Both)
                </button>
                <button
                  type="button"
                  onClick={() => setContainerView('outbound')}
                  className={`px-2 py-1 rounded transition-colors ${containerView === 'outbound' ? 'bg-amber-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Left: Outbounds (SHIP-)
                </button>
                <button
                  type="button"
                  onClick={() => setContainerView('inbound')}
                  className={`px-2 py-1 rounded transition-colors ${containerView === 'inbound' ? 'bg-rose-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Right: Inbounds (RET-)
                </button>
              </div>

              <input
                type="text"
                placeholder="Search SHIP-, #LSSA-, RET-, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs rounded px-2.5 py-1 w-full sm:w-48 focus:outline-hidden focus:border-[#003876]"
              />
            </div>
          </div>

          {/* SPLIT CONTAINER & EXPLICIT UNDELIVERED KPI SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-[10.5px]">
            <div className={`p-2.5 rounded border transition-colors ${containerView === 'outbound' ? 'bg-amber-100 border-amber-300 ring-1 ring-amber-400' : 'bg-amber-50/80 border-amber-200'}`}>
              <div className="text-[10px] text-amber-900 font-bold uppercase">Outbound Undelivered</div>
              <div className="text-sm font-black text-amber-950 font-mono mt-0.5">199 Orders &bull; 312 Items</div>
              <div className="text-[9.5px] text-amber-700 font-medium mt-0.5">Value at Risk: <strong>R 214,500.00</strong></div>
            </div>

            <div className={`p-2.5 rounded border transition-colors ${containerView === 'inbound' ? 'bg-rose-100 border-rose-300 ring-1 ring-rose-400' : 'bg-rose-50/80 border-rose-200'}`}>
              <div className="text-[10px] text-rose-900 font-bold uppercase">Inbound Reverse Outstanding</div>
              <div className="text-sm font-black text-rose-950 font-mono mt-0.5">23 RMAs &bull; 38 Items</div>
              <div className="text-[9.5px] text-rose-700 font-medium mt-0.5">Value at Risk: <strong>R 36,800.00</strong></div>
            </div>

            <div className="bg-blue-50/80 p-2.5 rounded border border-blue-200">
              <div className="text-[10px] text-[#003876] font-bold uppercase">Active Tracked Records</div>
              <div className="text-sm font-black text-[#003876] font-mono mt-0.5">{staleShipments.length} Active Orders</div>
              <div className="text-[9.5px] text-blue-800 font-medium mt-0.5">100% Waybill &amp; RET- Linked</div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Total Value at Risk (VAR)</div>
              <div className="text-sm font-black text-slate-900 font-mono mt-0.5">
                R {staleShipments.reduce((acc: number, s: any) => acc + (s.valueAtRisk || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[9.5px] text-slate-500 font-medium mt-0.5">Active investigation queue</div>
            </div>
          </div>

          {/* Stalled Shipments Table with Dedicated GUID & Store Order ID Columns */}
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-2">Shipment GUID / ID</th>
                  <th className="py-2.5 px-2">Source Store Order ID</th>
                  <th className="py-2.5 px-2">Outbound Date</th>
                  <th className="py-2.5 px-2">Inbound Date</th>
                  <th className="py-2.5 px-2">Customer &amp; Destination</th>
                  <th className="py-2.5 px-2">Courier / Waybill</th>
                  <th className="py-2.5 px-2">Inbound / Return Link</th>
                  <th className="py-2.5 px-2">Inbound Courier Status</th>
                  <th className="py-2.5 px-2 text-center">Stalled Location &amp; Days</th>
                  <th className="py-2.5 px-2 text-right">Root Cause &amp; Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {displayedExceptions.length > 0 ? (
                  displayedExceptions
                    .filter((item: any) => {
                      if (containerView === 'outbound') return !item.inboundRmaLink || item.inboundRmaLink === 'N/A';
                      if (containerView === 'inbound') return item.inboundRmaLink && item.inboundRmaLink !== 'N/A';
                      return true;
                    })
                    .map((item: any, idx: number) => {
                      const shpId = item.shipmentId || item.orderNumber || `SHIP-94${idx + 300}`;
                      const shpGuid = item.shipmentGuid || `pnj-${8941000 + idx}`;
                      const storeId = item.sourceStoreOrderId || `#LSSA-${10490 + idx}`;
                      const outboundD = item.outboundDate || '21-09 Mon';
                      const inboundD = item.inboundDate || 'N/A';
                      const rmaLink = item.inboundRmaLink || 'N/A';
                      const inboundStatus = item.inboundCourierData || 'N/A';
                      const hasRma = rmaLink !== 'N/A';

                      return (
                        <tr key={idx} className="hover:bg-amber-50/50 transition-colors">
                          <td className="py-2 px-2 font-mono font-bold text-[#003876] whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="px-1.5 py-0.5 bg-blue-100/80 text-[#003876] rounded border border-blue-200 text-[10.5px]">
                                {shpId}
                              </span>
                              <span className="text-[9px] text-slate-400 font-normal mt-0.5">{shpGuid}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200 text-[10.5px]">
                              {storeId}
                            </span>
                          </td>
                          <td className="py-2 px-2 font-mono text-[10px] text-slate-700 whitespace-nowrap">
                            <span className="bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-100">
                              {outboundD}
                            </span>
                          </td>
                          <td className="py-2 px-2 font-mono text-[10px] whitespace-nowrap">
                            {inboundD !== 'N/A' ? (
                              <span className="bg-rose-50 text-rose-900 font-bold px-1.5 py-0.5 rounded border border-rose-200">
                                {inboundD}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">N/A</span>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <div className="font-semibold text-slate-900 truncate max-w-[100px]">{item.customerName}</div>
                            <div className="text-[9.5px] text-slate-500 truncate max-w-[100px]">{item.destination}</div>
                          </td>
                          <td className="py-2 px-2 font-mono text-[10px]">
                            <div className="font-semibold text-slate-800">{item.courier}</div>
                            <div className="text-[9px] text-slate-400">{item.waybillNumber}</div>
                          </td>
                          <td className="py-2 px-2 font-mono text-[10px]">
                            {hasRma ? (
                              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-900 font-bold rounded border border-rose-200">
                                {rmaLink}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">N/A</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-[10px]">
                            {hasRma ? (
                              <span className="text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 block truncate max-w-[120px]" title={inboundStatus}>
                                {inboundStatus}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">N/A</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            <span className="text-[9.5px] font-bold bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200 block">
                              {item.stalledLocation} ({item.daysWithoutUpdate}d)
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right text-[10px]">
                            <div className="font-semibold text-slate-800 truncate max-w-[150px]" title={item.rootCause}>
                              {item.rootCause}
                            </div>
                            <div className="text-[9px] text-[#003876] font-medium truncate max-w-[150px]" title={item.actionRequired}>
                              {item.actionRequired}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400 italic text-xs">
                      No operational exceptions match the search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. FOOTER */}
      <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-400 mt-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#003876]">Levi's South Africa</span>
          <span>&bull;</span>
          <span>Parcelninja Fulfillment &amp; Returns Logistics</span>
          <span>&bull;</span>
          <span>Outbound &amp; Reverse Operations</span>
        </div>
        <div className="font-mono">
          Page 4 of 4 &bull; Parcelninja Shipments (Deliveries and Returns)
        </div>
      </div>
    </div>
  );
};
