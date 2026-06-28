import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Package, CheckCircle, XCircle, Clock, Truck, AlertCircle, Search, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMenu } from '../hooks/useMenu';
import OrderDetailsView from './orders/OrderDetailsView';
import type { Order } from './orders/types';

interface OrdersManagerProps {
  onBack: () => void;
}

const OrdersManager: React.FC<OrdersManagerProps> = ({ onBack }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const { refreshProducts } = useMenu();

  // Fire a PostHog event for order status changes
  // Uses PostHog API directly to send as the customer (not the admin)
  const trackOrderStatus = async (
    order: Order,
    newStatus: string,
    extras?: Record<string, string>
  ) => {
    const shippingFee = order.shipping_fee || 0;
    const discount = order.discount_applied || 0;
    const total = order.total_price;
    const subtotal = total - shippingFee + discount;

    const itemsSummary = order.order_items.map(item => {
      const name = item.variation_name
        ? `${item.product_name} (${item.variation_name})`
        : item.product_name;
      return `${name} x${item.quantity} - P${(item.total || item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
    }).join('\n');

    if (!order.customer_email) {
      console.warn('Skipping PostHog event – order has no customer_email:', order.id);
      return;
    }

    // Send directly via PostHog API so the event is attributed to the customer
    // (not the admin's browser identity)
    try {
      await fetch(`${import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: import.meta.env.VITE_POSTHOG_KEY,
          event: `plp_order_${newStatus}`,
          distinct_id: order.customer_email,
          properties: {
            email: order.customer_email,
            customer_email: order.customer_email,
            customer_name: String(order.customer_name),
            order_number: String(order.order_number || order.id),
            total_price: String(total),
            subtotal: String(subtotal),
            shipping_fee: String(shippingFee),
            discount: String(discount),
            payment_method: String(order.payment_method_name || 'N/A'),
            contact_method: String(order.contact_method || 'N/A'),
            promo_code: String(order.promo_code || 'None'),
            item_count: order.order_items.length,
            items_summary: itemsSummary,
            tracking_number: String(order.tracking_number || ''),
            shipping_provider: String(order.shipping_provider || ''),
            // Persist the recipient on the person record so PostHog email
            // destinations can resolve {{ person.properties.email }}.
            $set: {
              email: order.customer_email,
              $email: order.customer_email,
              name: order.customer_name,
            },
            ...(extras || {}),
          },
        }),
      });
    } catch (err) {
      console.error('Failed to send PostHog event:', err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedOrderIds.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedOrderIds.size} order(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', Array.from(selectedOrderIds));

      if (error) throw error;

      setSelectedOrderIds(new Set());
      await loadOrders();
      alert(`${selectedOrderIds.size} order(s) deleted successfully.`);
    } catch (error) {
      console.error('Error deleting orders:', error);
      alert('Failed to delete orders. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOrder = async (order: Order) => {
    if (!confirm(`Confirm order #${order.order_number || order.id.slice(0, 8)}? This will deduct stock from inventory.`)) {
      return;
    }

    try {
      setIsProcessing(true);

      // First, check if all items are still in stock
      for (const item of order.order_items) {
        if (item.variation_id) {
          // Check variation stock
          const { data: variation, error: varError } = await supabase
            .from('product_variations')
            .select('stock_quantity')
            .eq('id', item.variation_id)
            .single();

          if (varError) {
            if (varError.code === 'PGRST116') {
              throw new Error(`Variation "${item.variation_name}" not found. It may have been deleted.`);
            }
            throw varError;
          }

          if (!variation || variation.stock_quantity < item.quantity) {
            alert(`Insufficient stock for ${item.product_name} ${item.variation_name || ''}. Available: ${variation?.stock_quantity || 0}, Required: ${item.quantity}`);
            return;
          }
        } else {
          // Check product stock
          const { data: product, error: prodError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();

          if (prodError) {
            if (prodError.code === 'PGRST116') {
              throw new Error(`Product "${item.product_name}" not found. It may have been deleted.`);
            }
            throw prodError;
          }
          if (!product || product.stock_quantity < item.quantity) {
            alert(`Insufficient stock for ${item.product_name}. Available: ${product?.stock_quantity || 0}, Required: ${item.quantity}`);
            return;
          }
        }
      }

      // Deduct stock for each item
      for (const item of order.order_items) {
        if (item.variation_id) {
          // Deduct from variation - get current stock and update
          const { data: variation, error: varError } = await supabase
            .from('product_variations')
            .select('stock_quantity')
            .eq('id', item.variation_id)
            .single();

          if (varError) throw varError;

          if (variation) {
            const newStock = Math.max(0, variation.stock_quantity - item.quantity);
            const { error: updateError } = await supabase
              .from('product_variations')
              .update({ stock_quantity: newStock })
              .eq('id', item.variation_id);

            if (updateError) throw updateError;
          }
        } else {
          // Deduct from product - get current stock and update
          const { data: product, error: prodError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();

          if (prodError) throw prodError;

          if (product) {
            const newStock = Math.max(0, product.stock_quantity - item.quantity);
            const { error: updateError } = await supabase
              .from('products')
              .update({ stock_quantity: newStock })
              .eq('id', item.product_id);

            if (updateError) throw updateError;
          }
        }
      }

      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: 'confirmed',
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Track order confirmed event
      trackOrderStatus(order, 'confirmed');

      // Refresh orders and products
      await loadOrders();
      await refreshProducts();

      // Trigger custom event to refresh inventory sales data
      window.dispatchEvent(new CustomEvent('orderConfirmed'));

      alert(`Order confirmed! Stock has been deducted from inventory.`);
      setSelectedOrder(null);
    } catch (error: any) {
      console.error('Error confirming order:', error);
      const errorMessage = error instanceof Error ? error.message : error?.message || 'Unknown error';
      alert(`Failed to confirm order: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: string,
    extras?: Record<string, string>
  ) => {
    try {
      setIsProcessing(true);
      // Route lifecycle-affecting statuses through the dedicated RPCs so referral
      // points settle / reverse correctly.
      let error: { message: string } | null = null;
      if (newStatus === 'completed' || newStatus === 'delivered') {
        const { error: rpcErr } = await supabase.rpc('complete_order', {
          p_order_id: orderId,
          p_status: newStatus,
        });
        error = rpcErr;
      } else if (newStatus === 'cancelled' || newStatus === 'refunded') {
        const { error: rpcErr } = await supabase.rpc('refund_order', {
          p_order_id: orderId,
          p_status: newStatus,
        });
        error = rpcErr;
      } else {
        const { error: updErr } = await supabase
          .from('orders')
          .update({
            order_status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);
        error = updErr;
      }

      if (error) throw error;

      // Fire PostHog event for every status change
      const order = orders.find(o => o.id === orderId);
      if (order) {
        trackOrderStatus(order, newStatus, extras);
      }

      await loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, order_status: newStatus });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTracking = async (orderId: string, trackingNumber: string, shippingProvider: string, shippingNote: string) => {
    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from('orders')
        .update({
          tracking_number: trackingNumber || null,
          shipping_provider: shippingProvider || 'jnt',
          shipping_note: shippingNote || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      const updatedOrders = orders.map(o =>
        o.id === orderId
          ? { ...o, tracking_number: trackingNumber || null, shipping_provider: shippingProvider || 'jnt', shipping_note: shippingNote || null }
          : o
      );
      setOrders(updatedOrders);

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          tracking_number: trackingNumber || null,
          shipping_provider: shippingProvider || 'jnt',
          shipping_note: shippingNote || null
        });
      }

      alert('Tracking information saved successfully!');
    } catch (error) {
      console.error('Error saving tracking info:', error);
      alert('Failed to save tracking information.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.order_status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.customer_name.toLowerCase().includes(query) ||
        o.customer_email.toLowerCase().includes(query) ||
        o.customer_phone.includes(query) ||
        o.id.toLowerCase().includes(query) ||
        (o.order_number && o.order_number.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [orders, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    return {
      all: orders.length,
      new: orders.filter(o => o.order_status === 'new').length,
      confirmed: orders.filter(o => o.order_status === 'confirmed').length,
      processing: orders.filter(o => o.order_status === 'processing').length,
      shipped: orders.filter(o => o.order_status === 'shipped').length,
      delivered: orders.filter(o => o.order_status === 'delivered').length,
      cancelled: orders.filter(o => o.order_status === 'cancelled').length,
    };
  }, [orders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-yellow-100 text-black border-yellow-400';
      case 'confirmed': return 'bg-blue-100 text-black border-blue-300';
      case 'processing': return 'bg-purple-100 text-black border-purple-300';
      case 'shipped': return 'bg-indigo-100 text-black border-indigo-300';
      case 'delivered': return 'bg-green-100 text-black border-green-300';
      case 'cancelled': return 'bg-red-100 text-black border-red-300';
      default: return 'bg-gray-100 text-black border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Package className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-gold-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading orders... ✨</p>
        </div>
      </div>
    );
  }

  if (selectedOrder) {
    return (
      <OrderDetailsView
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onConfirm={() => handleConfirmOrder(selectedOrder)}
        onUpdateStatus={handleUpdateOrderStatus}
        onSaveTracking={handleSaveTracking}
        isProcessing={isProcessing}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-md border-b-4 border-brand-500">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-12 md:h-14 gap-2">
            <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-1">
              <button
                onClick={onBack}
                className="text-gray-700 hover:text-gold-600 transition-colors flex items-center gap-1 md:gap-2 group"
              >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs md:text-sm">Dashboard</span>
              </button>
              <h1 className="text-sm md:text-base lg:text-xl font-bold text-charcoal-900 truncate">
                Orders Management
              </h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-brand-700 hover:bg-brand-800 text-white px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl font-medium text-xs md:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-1 md:gap-2 disabled:opacity-50 border border-brand-500/20"
            >
              <RefreshCw className={`w-3 h-3 md:w-4 md:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 md:py-4 lg:py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3 mb-4 md:mb-6">
          <button
            onClick={() => setStatusFilter('all')}
            className={`bg-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg p-2 md:p-3 lg:p-4 border-2 transition-all ${statusFilter === 'all' ? 'border-brand-500 shadow-gold-glow' : 'border-gray-200 hover:border-navy-700'
              }`}
          >
            <p className="text-[10px] md:text-xs text-gray-600 mb-1">All Orders</p>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900">{statusCounts.all}</p>
          </button>
          <button
            onClick={() => setStatusFilter('new')}
            className={`bg-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg p-2 md:p-3 lg:p-4 border-2 transition-all ${statusFilter === 'new' ? 'border-brand-500 shadow-gold-glow' : 'border-gray-200 hover:border-navy-700'
              }`}
          >
            <p className="text-[10px] md:text-xs text-gray-600 mb-1">New</p>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-gold-600">{statusCounts.new}</p>
          </button>
          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`bg-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg p-2 md:p-3 lg:p-4 border-2 transition-all ${statusFilter === 'confirmed' ? 'border-brand-500 shadow-gold-glow' : 'border-gray-200 hover:border-navy-700'
              }`}
          >
            <p className="text-[10px] md:text-xs text-gray-600 mb-1">Confirmed</p>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900">{statusCounts.confirmed}</p>
          </button>
          <button
            onClick={() => setStatusFilter('processing')}
            className={`bg-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg p-2 md:p-3 lg:p-4 border-2 transition-all ${statusFilter === 'processing' ? 'border-brand-500 shadow-gold-glow' : 'border-gray-200 hover:border-navy-700'
              }`}
          >
            <p className="text-[10px] md:text-xs text-gray-600 mb-1">Processing</p>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800">{statusCounts.processing}</p>
          </button>
          <button
            onClick={() => setStatusFilter('shipped')}
            className={`bg-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg p-2 md:p-3 lg:p-4 border-2 transition-all ${statusFilter === 'shipped' ? 'border-brand-500 shadow-gold-glow' : 'border-gray-200 hover:border-navy-700'
              }`}
          >
            <p className="text-[10px] md:text-xs text-gray-600 mb-1">Shipped</p>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900">{statusCounts.shipped}</p>
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className={`bg-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg p-2 md:p-3 lg:p-4 border-2 transition-all ${statusFilter === 'delivered' ? 'border-brand-500 shadow-gold-glow' : 'border-gray-200 hover:border-navy-700'
              }`}
          >
            <p className="text-[10px] md:text-xs text-gray-600 mb-1">Delivered</p>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-green-600">{statusCounts.delivered}</p>
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`bg-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg p-2 md:p-3 lg:p-4 border-2 transition-all ${statusFilter === 'cancelled' ? 'border-red-500' : 'border-gray-200 hover:border-red-300'
              }`}
          >
            <p className="text-[10px] md:text-xs text-gray-600 mb-1">Cancelled</p>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-red-600">{statusCounts.cancelled}</p>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg md:rounded-xl shadow-lg p-3 md:p-4 lg:p-6 mb-4 md:mb-6 border border-navy-700/30">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
              <input
                type="text"
                placeholder="Search by customer name, email, phone, or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 text-sm md:text-base border-2 border-gray-200 rounded-lg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-colors text-black"
              />
            </div>
          </div>
        </div>

        {/* Selection Toolbar */}
        {filteredOrders.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-lg md:rounded-xl shadow-md p-3 md:p-4 mb-4 md:mb-6 border border-navy-700/30">
            <label className="flex items-center gap-2 cursor-pointer text-sm md:text-base text-gray-700">
              <input
                type="checkbox"
                checked={filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <span className="font-medium">
                {selectedOrderIds.size > 0
                  ? `${selectedOrderIds.size} of ${filteredOrders.length} selected`
                  : 'Select All'}
              </span>
            </label>
            {selectedOrderIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isProcessing}
                className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-xs md:text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Delete Selected ({selectedOrderIds.size})
              </button>
            )}
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-3 md:space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg md:rounded-xl shadow-lg p-8 md:p-12 text-center border border-navy-700/30">
              <Package className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium text-base md:text-lg">No orders found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onView={() => setSelectedOrder(order)}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                isSelected={selectedOrderIds.has(order.id)}
                onToggleSelect={() => toggleSelectOrder(order.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Order Card Component
interface OrderCardProps {
  order: Order;
  onView: () => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  isSelected: boolean;
  onToggleSelect: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onView, getStatusColor, getStatusIcon, isSelected, onToggleSelect }) => {
  const totalItems = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  const finalTotal = order.total_price + (order.shipping_fee || 0);

  return (
    <div
      onClick={onView}
      className={`bg-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg p-3 md:p-4 lg:p-6 border-2 transition-all text-gray-900 cursor-pointer hover:bg-gray-50/50 ${isSelected ? 'border-red-400 bg-red-50/30' : 'border-navy-700/30 hover:border-brand-500'}`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer flex-shrink-0"
          />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
            <h3 className="font-bold text-gray-900 text-sm md:text-base lg:text-lg truncate">
              Order #{order.order_number || order.id.slice(0, 8).toUpperCase()}
            </h3>
            <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold border flex items-center gap-1 ${getStatusColor(order.order_status)}`}>
              {getStatusIcon(order.order_status)}
              <span className="hidden sm:inline">{order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}</span>
              <span className="sm:hidden">{order.order_status.charAt(0).toUpperCase()}</span>
            </span>
            <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gold-100 text-gold-700'
              }`}>
              {order.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
            <div className="min-w-0">
              <span className="text-gray-500 text-[10px] md:text-xs">Customer</span>
              <p className="font-semibold text-gray-900 truncate">{order.customer_name}</p>
              <p className="text-[10px] md:text-xs text-gray-500 truncate">{order.customer_email}</p>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] md:text-xs">Items</span>
              <p className="font-semibold text-gray-900">{totalItems} item(s)</p>
              <p className="text-[10px] md:text-xs text-gray-500">{order.order_items.length} product(s)</p>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] md:text-xs">Total</span>
              <p className="font-semibold text-gold-600">₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              {order.shipping_fee && order.shipping_fee > 0 && (
                <p className="text-[10px] md:text-xs text-gray-500">+ ₱{order.shipping_fee} shipping</p>
              )}
            </div>
            <div>
              <span className="text-gray-500 text-[10px] md:text-xs">Date</span>
              <p className="font-semibold text-gray-900">{new Date(order.created_at).toLocaleDateString()}</p>
              <p className="text-[10px] md:text-xs text-gray-500">{new Date(order.created_at).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
        </div>

        <div className="flex flex-col gap-2 md:min-w-[120px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="px-3 md:px-4 py-1.5 md:py-2 bg-charcoal-900 hover:bg-charcoal-800 text-white rounded-lg transition-colors font-medium text-xs md:text-sm flex items-center justify-center gap-1 md:gap-2 shadow-md hover:shadow-lg"
          >
            <Eye className="w-3 h-3 md:w-4 md:h-4" />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};


export default OrdersManager;
