import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, Package, CreditCard, Heart, Copy, Check, MessageCircle, Tag, Upload, Database, Lock, Truck, AlertTriangle, X } from 'lucide-react';
import posthog from 'posthog-js';
import type { CartItem, Product, ProductVariation, KitType } from '../types';
import { KIT_UPGRADE_PRICE } from '../types';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useShippingLocations } from '../hooks/useShippingLocations';
import { useCouriers } from '../hooks/useCouriers';
import { supabase } from '../lib/supabase';
import { useImageUpload } from '../hooks/useImageUpload';
import { useRecommendations } from '../hooks/useRecommendations';
import { useAuth } from '../hooks/useAuth';
import { useReferral } from '../hooks/useReferral';
import { useAddresses, type UserAddress } from '../hooks/useAddresses';
import RecommendationRail from './RecommendationRail';
import { cleanText } from '../lib/cleanText';
import { getEffectiveUnitPrice, getMatchingBundleTier, getRegularUnitPrice } from '../lib/bundlePricing';
import Toast from './Toast';

interface CheckoutProps {
    cartItems: CartItem[];
    totalPrice: number;
    onBack: () => void;
    allProducts?: Product[];
    addToCart?: (product: Product, variation?: ProductVariation, quantity?: number, kitType?: KitType) => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cartItems, totalPrice, onBack, allProducts = [], addToCart }) => {
    const recommendations = useRecommendations({
        products: allProducts,
        cartItems,
        limit: 3,
    });

    const { paymentMethods } = usePaymentMethods();
    const { locations: shippingLocations } = useShippingLocations();
    const { couriers } = useCouriers();
    const [step, setStep] = useState<'details' | 'payment' | 'confirmation'>('details');

    // Customer Details
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    // Shipping Details
    const [address, setAddress] = useState('');
    const [barangay, setBarangay] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [selectedCourierId, setSelectedCourierId] = useState('');
    const [shippingLocation, setShippingLocation] = useState<string>('');

    // Payment
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [contactMethod, setContactMethod] = useState<'whatsapp'>('whatsapp');
    const [notes, setNotes] = useState('');

    const [orderMessage, setOrderMessage] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [contactOpened] = useState(false);

    const [orderNumber, setOrderNumber] = useState<string>('');
    const [toast, setToast] = useState<{ message: string; variant: 'info' | 'error' | 'warning' | 'success' } | null>(null);
    const notify = (message: string, variant: 'info' | 'error' | 'warning' | 'success' = 'error') => setToast({ message, variant });

    // Policies acknowledgment
    const [policiesAccepted, setPoliciesAccepted] = useState(false);
    const [showPoliciesModal, setShowPoliciesModal] = useState(false);

    // Payment Proof
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const { uploadImage, uploading: isUploadingProof } = useImageUpload('payment-proofs');

    // Points redemption (1 pt = ₱1)
    const { user } = useAuth();
    const { balance: pointsBalance, refresh: refreshReferral, profile: userProfile } = useReferral();
    const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

    // Saved addresses
    const { addresses: savedAddresses, primary: primaryAddress, addAddress } = useAddresses();
    const [selectedAddressId, setSelectedAddressId] = useState<string>('');
    const [saveAddressForNextTime, setSaveAddressForNextTime] = useState(false);
    const [newAddressLabel, setNewAddressLabel] = useState('');
    const [makeNewAddressPrimary, setMakeNewAddressPrimary] = useState(false);

    // Promo Code State
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [promoError, setPromoError] = useState('');
    const [promoSuccess, setPromoSuccess] = useState('');

    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    // Auto-fill from signed-in user profile (only when empty so user edits are kept)
    React.useEffect(() => {
        if (user?.email && !email) setEmail(user.email);
    }, [user?.email, email]);

    React.useEffect(() => {
        if (!userProfile) return;
        if (!fullName && userProfile.full_name) setFullName(userProfile.full_name);
        if (!phone && userProfile.phone) setPhone(userProfile.phone);
    }, [userProfile, fullName, phone]);

    const applyAddress = React.useCallback((addr: UserAddress) => {
        setSelectedAddressId(addr.id);
        setFullName(addr.recipient_name);
        setPhone(addr.phone);
        setAddress(addr.address);
        setBarangay(addr.barangay);
        setCity(addr.city);
        setState(addr.state);
        setZipCode(addr.zip_code);
    }, []);

    // Auto-apply the primary saved address on first load
    const didApplyPrimary = React.useRef(false);
    React.useEffect(() => {
        if (didApplyPrimary.current) return;
        if (primaryAddress && !selectedAddressId) {
            applyAddress(primaryAddress);
            didApplyPrimary.current = true;
        }
    }, [primaryAddress, selectedAddressId, applyAddress]);

    React.useEffect(() => {
        if (paymentMethods.length > 0 && !selectedPaymentMethod) {
            setSelectedPaymentMethod(paymentMethods[0].id);
        }
    }, [paymentMethods, selectedPaymentMethod]);

    // Calculate shipping fee based on location
    const selectedLocation = shippingLocations.find(loc => loc.id === shippingLocation);
    const shippingFee = selectedLocation ? selectedLocation.fee : 0;

    // Cap points redemption: cannot exceed balance or (subtotal - promo discount)
    const maxRedeemable = Math.max(0, Math.min(pointsBalance, totalPrice - discountAmount));
    const effectivePointsRedeemed = Math.max(0, Math.min(pointsToRedeem, maxRedeemable));

    // Calculate final total (Subtotal + Shipping - Discount - Points)
    const finalTotal = Math.max(0, totalPrice + shippingFee - discountAmount - effectivePointsRedeemed);

    // Handle Promo Code Application
    const handleApplyPromoCode = async () => {
        setPromoError('');
        setPromoSuccess('');
        setAppliedPromo(null);
        setDiscountAmount(0);

        const code = promoCode.trim().toUpperCase();
        if (!code) {
            setPromoError('Please enter a promo code');
            return;
        }

        setIsApplyingPromo(true);

        try {
            const { data: promo, error } = await supabase
                .from('promo_codes')
                .select('*')
                .eq('code', code)
                .eq('active', true)
                .single();

            if (error || !promo) {
                setPromoError('Invalid or inactive promo code');
                setIsApplyingPromo(false);
                return;
            }

            // Check date validity
            const now = new Date();
            if (promo.start_date && new Date(promo.start_date) > now) {
                setPromoError('Promo code is not yet valid');
                setIsApplyingPromo(false);
                return;
            }
            if (promo.end_date && new Date(promo.end_date) < now) {
                setPromoError('Promo code has expired');
                setIsApplyingPromo(false);
                return;
            }

            // Check usage limits
            if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
                setPromoError('Promo code usage limit reached');
                setIsApplyingPromo(false);
                return;
            }

            // Check minimum purchase
            if (totalPrice < promo.min_purchase_amount) {
                setPromoError(`Minimum purchase of ₱${promo.min_purchase_amount} required`);
                setIsApplyingPromo(false);
                return;
            }

            // Calculate discount
            let discount = 0;
            if (promo.discount_type === 'percentage') {
                discount = (totalPrice * promo.discount_value) / 100;
                if (promo.max_discount_amount) {
                    discount = Math.min(discount, promo.max_discount_amount);
                }
            } else {
                discount = promo.discount_value;
            }

            discount = Math.min(discount, totalPrice);

            setDiscountAmount(discount);
            setAppliedPromo(promo);
            setPromoSuccess(`Promo code applied! You saved ₱${discount.toLocaleString()}`);
        } catch (err) {
            console.error('Error applying promo:', err);
            setPromoError('Failed to apply promo code');
        } finally {
            setIsApplyingPromo(false);
        }
    };

    const isDetailsValid =
        fullName.trim() !== '' &&
        email.trim() !== '' &&
        phone.trim() !== '' &&
        address.trim() !== '' &&
        barangay.trim() !== '' &&
        city.trim() !== '' &&
        state.trim() !== '' &&
        zipCode.trim() !== '' &&
        selectedCourierId !== '' &&
        shippingLocation !== '';

    const handleProceedToPayment = () => {
        if (isDetailsValid) {
            // Reset before identify to prevent cross-customer identity merging
            posthog.reset();
            posthog.identify(email, {
                $email: email,
                name: fullName,
                phone: phone,
                city: city,
                state: state,
            });
            posthog.capture('plp_checkout_started', {
                total_price: totalPrice,
                item_count: cartItems.reduce((sum, item) => sum + item.quantity, 0),
                items: cartItems.map(item => ({
                    product_name: item.product.name,
                    variation: item.variation?.name,
                    quantity: item.quantity,
                })),
            });
            setStep('payment');
        }
    };


    const handlePlaceOrder = async () => {
        if (!policiesAccepted) {
            setShowPoliciesModal(true);
            return;
        }

        if (!contactMethod) {
            notify('Please select your preferred contact method.', 'warning');
            return;
        }

        if (!shippingLocation) {
            notify('Please select your shipping location.', 'warning');
            return;
        }

        if (!paymentProof) {
            notify('Please upload a screenshot of your payment proof to proceed.', 'warning');
            return;
        }

        const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);

        try {
            // Identify customer early so PostHog has time to process before capture
            posthog.identify(email, {
                $email: email,
                name: fullName,
                phone: phone,
            });

            // 1. Upload Payment Proof First
            let paymentProofUrl = null;
            if (paymentProof) {
                try {
                    paymentProofUrl = await uploadImage(paymentProof);
                } catch (uploadError: any) {
                    console.error('Failed to upload payment proof:', uploadError);
                    notify(`Failed to upload payment proof: ${uploadError.message}`, 'error');
                    return;
                }
            }

            const orderItems = cartItems.map(item => {
                const currentPrice = getEffectiveUnitPrice(
                    item.product,
                    item.variation,
                    item.kitType,
                    item.quantity
                );

                return {
                    product_id: item.product.id,
                    product_name: item.product.name,
                    variation_id: item.variation?.id || null,
                    variation_name: item.variation?.name || null,
                    quantity: item.quantity,
                    price: currentPrice,
                    total: currentPrice * item.quantity,
                    kit_type: item.kitType || 'vial_only',
                    purity_percentage: item.product.purity_percentage
                };
            });

            // Generate order number before saving
            const randomDigits = Math.floor(Math.random() * 9000 + 1000); // 1000-9999
            const customOrderNumber = `PLP-${randomDigits}`;

            // Save order to database
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    customer_name: fullName,
                    customer_email: email,
                    customer_phone: phone,
                    shipping_address: address,
                    shipping_barangay: barangay,
                    shipping_city: city,
                    shipping_state: state,
                    shipping_zip_code: zipCode,
                    order_items: orderItems,
                    total_price: finalTotal, // Subtotal + shipping - discount
                    shipping_fee: shippingFee,
                    courier_id: selectedCourierId || null,
                    shipping_location: shippingLocation,
                    payment_method_id: paymentMethod?.id || null,
                    payment_method_name: paymentMethod?.name || null,
                    payment_proof_url: paymentProofUrl,
                    contact_method: contactMethod || null,
                    notes: notes.trim() || null,
                    order_status: 'new',
                    payment_status: 'pending',
                    promo_code_id: appliedPromo?.id || null,
                    promo_code: appliedPromo?.code || null,
                    discount_applied: discountAmount,
                    order_number: customOrderNumber,
                    user_id: user?.id || null,
                    points_redeemed: effectivePointsRedeemed
                }])
                .select()
                .single();

            if (orderError) {
                console.error('❌ Error saving order:', orderError);

                let errorMessage = orderError.message;
                if (orderError.message?.includes('Could not find the table') ||
                    orderError.message?.includes('relation "public.orders" does not exist') ||
                    orderError.message?.includes('schema cache')) {
                    errorMessage = `The orders table doesn't exist in the database. Please run the migration.`;
                }

                notify(`Failed to save order: ${errorMessage}. Please contact support if this issue persists.`, 'error');
                return;
            }

            // Update promo code usage atomically via RPC FIRST (race-safe; returns null if limit hit).
            // Running this before the points-redemption ledger insert avoids leaving an
            // orphan ledger row pointing at a deleted order if the promo RPC fails or the
            // limit has been hit.
            if (appliedPromo) {
                const { data: promoRpcData, error: promoUpdateError } = await supabase.rpc(
                    'increment_promo_usage',
                    { promo_id: appliedPromo.id }
                );

                if (promoUpdateError) {
                    console.error('Failed to update promo usage count:', promoUpdateError);
                    await supabase.from('orders').delete().eq('id', orderData.id);
                    notify(`Failed to apply promo code: ${promoUpdateError.message}. Order was not placed.`, 'error');
                    return;
                }
                if (!promoRpcData) {
                    // null = limit reached; abort order
                    await supabase.from('orders').delete().eq('id', orderData.id);
                    notify('Promo code usage limit reached. Please remove the promo and try again.', 'error');
                    return;
                }
            }

            // Write points-redemption ledger debit (authoritative — fail order on error)
            // Redemption debits are immediately 'available' (spent now); referral credits
            // are recorded server-side as 'pending' and settle later.
            if (user && effectivePointsRedeemed > 0 && orderData?.id) {
                const { error: ledgerError } = await supabase.from('points_ledger').insert({
                    user_id: user.id,
                    delta: -effectivePointsRedeemed,
                    reason: 'redemption',
                    source_order_id: orderData.id,
                    notes: `Order ${orderData.order_number}`,
                    status: 'available',
                });
                if (ledgerError) {
                    console.error('Failed to write points ledger:', ledgerError);
                    // Roll back the order we just created so points balance is not silently desynced.
                    // We also roll back the promo usage increment (best-effort).
                    await supabase.from('orders').delete().eq('id', orderData.id);
                    if (appliedPromo) {
                        await supabase.rpc('decrement_promo_usage', { promo_id: appliedPromo.id });
                    }
                    notify(
                        `Failed to redeem points: ${ledgerError.message}. Your order was not placed. Please try again.`,
                        'error'
                    );
                    return;
                }
                refreshReferral();
            }

            console.log('✅ Order saved to database:', orderData);

            // Save address to user's address book if requested
            if (user && saveAddressForNextTime && !selectedAddressId) {
                const { error: addrError } = await addAddress({
                    label: newAddressLabel.trim() || null,
                    recipient_name: fullName,
                    phone,
                    address,
                    barangay,
                    city,
                    state,
                    zip_code: zipCode,
                    is_primary: makeNewAddressPrimary || savedAddresses.length === 0,
                });
                if (addrError) console.error('Failed to save address:', addrError);
            }

            // Build items summary from saved order data (source of truth)
            const savedItems = orderData.order_items as Array<{ product_name: string; variation_name: string | null; quantity: number; price: number; total: number }>;
            const itemsSummary = savedItems.map(item => {
                const name = item.variation_name
                    ? `${item.product_name} (${item.variation_name})`
                    : item.product_name;
                return `${name} x${item.quantity} - P${item.total.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
            }).join('\n');

            // Calculate subtotal from saved order items
            const savedSubtotal = savedItems.reduce((sum, item) => sum + item.total, 0);

            // Build all event properties first
            const eventProps = {
                customer_name: fullName,
                order_number: String(orderData.order_number),
                total_price: String(orderData.total_price),
                subtotal: String(savedSubtotal),
                shipping_fee: String(orderData.shipping_fee || 0),
                discount: String(orderData.discount_applied || 0),
                payment_method: String(orderData.payment_method_name || 'N/A'),
                contact_method: String(orderData.contact_method || 'N/A'),
                promo_code: String(orderData.promo_code || 'None'),
                item_count: savedItems.length,
                items_summary: itemsSummary,
            };

            console.log('📧 PostHog event properties:', JSON.stringify(eventProps, null, 2));

            // Track order placed event for PostHog email workflows
            posthog.capture('plp_order_placed', eventProps);

            setOrderNumber(customOrderNumber);

            // Get current date and time
            const now = new Date();
            const dateTimeStamp = now.toLocaleString('en-PH', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });

            const orderDetails = `
✨ Peptide Lifestyle Program - NEW ORDER

📅 ORDER DATE & TIME
${dateTimeStamp}

👤 CUSTOMER INFORMATION
Name: ${fullName}
Email: ${email}
Phone: ${phone}

📦 SHIPPING ADDRESS
${address}
${barangay}
${city}, ${state} ${zipCode}
Courier: ${couriers.find(c => c.id === selectedCourierId)?.name || 'N/A'}

🛒 ORDER DETAILS
${savedItems.map(item => {
                const name = item.variation_name
                    ? `• ${item.product_name} (${item.variation_name})`
                    : `• ${item.product_name}`;
                return `${name} x${item.quantity} - ₱${item.total.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
            }).join('\n\n')}

💰 PRICING
Product Total: ₱${savedSubtotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
Shipping Fee: ₱${shippingFee.toLocaleString('en-PH', { minimumFractionDigits: 0 })} (${shippingLocation.replace('_', ' & ')})
${discountAmount > 0 ? `Discount (${appliedPromo?.code}): -₱${discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}\n` : ''}Grand Total: ₱${finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}

💳 PAYMENT METHOD
${paymentMethod?.name || 'N/A'}
      ${paymentMethod ? `Account: ${paymentMethod.account_number}` : ''}

📸 PROOF OF PAYMENT
${paymentProofUrl ? 'Screenshot attached to order.' : 'Pending'}

📱 CONTACT METHOD
WhatsApp (+63 905 842 9200)

📋 ORDER NUMBER: ${customOrderNumber}

Please confirm this order. Thank you!
      `.trim();

            setOrderMessage(orderDetails);

            // Auto-copy to clipboard
            try {
                await navigator.clipboard.writeText(orderDetails);
                setCopied(true);
            } catch (err) {
                console.error('Failed to auto-copy:', err);
            }

            // Show confirmation
            setStep('confirmation');

            // Auto-open WhatsApp with pre-filled order details
            setTimeout(() => {
                const whatsappUrl = `https://wa.me/639058429200?text=${encodeURIComponent(orderDetails)}`;
                window.open(whatsappUrl, '_blank');
            }, 1500);
        } catch (error) {
            console.error('❌ Error placing order:', error);
            notify(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, 'error');
        }
    };

    const handleCopyMessage = async () => {
        try {
            await navigator.clipboard.writeText(orderMessage);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (error) {
            console.error('Failed to copy:', error);
            // Fallback
            notify('Failed to copy. Please manually select and copy the message.', 'warning');
        }
    };

    const handleOpenContact = () => {
        const contactUrl = `https://wa.me/639058429200?text=${encodeURIComponent(orderMessage)}`;
        window.open(contactUrl, '_blank');
    };

    if (step === 'confirmation') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-white via-brand-50 to-white flex items-center justify-center px-4 py-12">
                <div className="max-w-2xl w-full">
                    <div className="bg-white rounded-2xl shadow-soft p-8 md:p-12 text-center border border-brand-100">
                        <div className="bg-brand-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <ShieldCheck className="w-12 h-12 text-brand-600" />
                        </div>
                        <h1 className="font-heading text-3xl md:text-4xl font-bold text-charcoal-900 mb-4 tracking-tight">
                            Order Confirmed
                        </h1>
                        <p className="text-gray-600 mb-4 text-base md:text-lg leading-relaxed">
                            Your order details have been pre-filled on WhatsApp. Just hit send to finalize your order!
                        </p>

                        {/* Order ID Display */}
                        {orderNumber && (
                            <div className="bg-brand-50/20 border border-brand-100 rounded-lg p-4 mb-6">
                                <p className="text-sm text-brand-700 mb-1 font-bold uppercase tracking-wider">Order Reference</p>
                                <p className="text-2xl font-bold text-charcoal-900 font-mono">
                                    {orderNumber}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">Use this reference for tracking and support</p>
                            </div>
                        )}

                        {/* Order Message Display */}
                        <div className="bg-brand-50 rounded-lg p-6 mb-6 text-left border border-brand-200">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-charcoal-900 flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-brand-600" />
                                    Order Details
                                </h3>
                                <button
                                    onClick={handleCopyMessage}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded font-medium transition-all text-sm shadow-sm"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="bg-white rounded p-4 border border-gray-300 max-h-64 overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                                    {orderMessage}
                                </pre>
                            </div>
                            {copied && (
                                <p className="text-brand-600 text-sm mt-2 flex items-center gap-1 font-medium">
                                    <Check className="w-4 h-4" />
                                    Copied to clipboard! Ready to send.
                                </p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3 mb-8">
                            <button
                                onClick={handleOpenContact}
                                className="w-full btn-primary py-4 text-base flex items-center justify-center gap-2 shadow-lg"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Open WhatsApp & Send
                            </button>

                            <p className="text-sm text-gray-500">
                                If WhatsApp doesn't open automatically, please send the copied message to <span className="font-bold">+63 905 842 9200 on WhatsApp</span>
                            </p>
                        </div>

                        <div className="bg-brand-50/20 rounded-lg p-6 mb-8 text-left border border-brand-100">
                            <h3 className="font-bold text-charcoal-900 mb-4 flex items-center gap-2">
                                <Heart className="w-5 h-5 text-brand-600" />
                                Next Steps
                            </h3>
                            <ul className="space-y-3 text-sm text-gray-700">
                                <li className="flex items-start gap-3">
                                    <span className="font-bold text-brand-500">1.</span>
                                    <span>Confirmation within 24 hours of payment receipt.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="font-bold text-brand-500">2.</span>
                                    <span>Research-grade packaging and secure handling.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="font-bold text-brand-500">3.</span>
                                    <span>Same-day shipping for verified payments before 11 AM.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="font-bold text-brand-500">4.</span>
                                    <span>Tracking details sent via your selected contact method after dispatch.</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                window.location.href = '/';
                            }}
                            className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Return to Catalog
                        </button>
                    </div>
                </div>
            </div >
        );
    }

    // Payment Step
    if (step === 'payment') {
        return (
            <div className="min-h-screen bg-cool-gray py-6 md:py-8">
                <div className="container mx-auto px-4 max-w-5xl">
                    <button
                        onClick={() => setStep('details')}
                        className="text-gray-500 hover:text-brand-600 font-medium mb-6 flex items-center gap-2 transition-colors group text-sm"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Details</span>
                    </button>

                    <h1 className="font-heading text-2xl md:text-3xl font-bold text-charcoal-900 mb-8 flex items-center gap-3">
                        Payment & Verification
                        <Lock className="w-6 h-6 text-brand-600" />
                    </h1>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">

                            {/* Payment Methods */}
                            <div className="bg-white rounded-2xl shadow-soft p-6 border border-brand-100">
                                <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-4 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-brand-600" />
                                    Select Payment Method
                                </h2>
                                <div className="space-y-3">
                                    {paymentMethods.map((method) => (
                                        <div key={method.id}>
                                            <label
                                                className={`block p-4 rounded border cursor-pointer transition-all ${selectedPaymentMethod === method.id
                                                    ? 'border-brand-500 bg-brand-50/20 ring-1 ring-brand-500'
                                                    : 'border-gray-200 hover:border-brand-300'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value={method.id}
                                                        checked={selectedPaymentMethod === method.id}
                                                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                                        className="text-brand-600 focus:ring-brand-500"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-bold text-charcoal-900">{method.name}</p>
                                                                <p className="text-sm text-gray-600 font-mono mt-1">{method.account_number}</p>
                                                                {method.account_name && (
                                                                    <p className="text-xs text-gray-500 mt-0.5">Account Name: {method.account_name}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </label>

                                            {/* Show QR Code if this method is selected and has a QR code */}
                                            {selectedPaymentMethod === method.id && method.qr_code_url && (
                                                <div className="mt-2 ml-8 mb-4 p-4 bg-white border border-gray-100 rounded-lg shadow-sm">
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">Scan to Pay</p>
                                                    <div className="flex justify-center">
                                                        <img
                                                            src={method.qr_code_url}
                                                            alt={`${method.name} QR Code`}
                                                            className="max-w-[200px] w-full h-auto rounded-lg border border-gray-200"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-center text-gray-400 mt-2">
                                                        Screenshot your payment and upload it below
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Proof Upload */}
                            <div className="bg-white rounded-2xl shadow-soft p-6 border border-brand-100">
                                <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-4 flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-brand-600" />
                                    Upload Proof of Payment
                                </h2>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-400 transition-colors bg-brand-50/50">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setPaymentProof(e.target.files[0]);
                                            }
                                        }}
                                        className="hidden"
                                        id="payment-proof-upload"
                                    />
                                    <label htmlFor="payment-proof-upload" className="cursor-pointer flex flex-col items-center">
                                        {paymentProof ? (
                                            <>
                                                <Check className="w-12 h-12 text-brand-600 mb-3" />
                                                <p className="font-medium text-charcoal-900">{paymentProof.name}</p>
                                                <p className="text-sm text-gray-500 mt-1">Click to change file</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                                                <p className="font-medium text-charcoal-900">Click to upload screenshot</p>
                                                <p className="text-xs text-gray-500 mt-1">Gcash/Bank transfer receipt</p>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="bg-white rounded-2xl shadow-soft p-6 border border-brand-100">
                                <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-4">
                                    Additional Notes (Optional)
                                </h2>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm h-24"
                                    placeholder="Special instructions for delivery..."
                                />
                            </div>

                            {/* Policies & Acknowledgment */}
                            <div className="bg-white rounded-2xl shadow-soft p-6 border border-brand-100">
                                <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-4 flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-brand-600" />
                                    Policies & Acknowledgment
                                </h2>
                                <div className="max-h-72 overflow-y-auto pr-2 mb-4 space-y-5 text-sm text-gray-700 border border-gray-100 rounded-lg p-4 bg-gray-50/60">
                                    <PoliciesContent />
                                </div>
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={policiesAccepted}
                                        onChange={(e) => setPoliciesAccepted(e.target.checked)}
                                        className="mt-1 w-4 h-4 text-brand-600 focus:ring-brand-500 rounded"
                                    />
                                    <span className="text-sm text-charcoal-900">
                                        I have read and agree to the Shipping Policy, Returns & Refunds Policy, Health & Safety Disclaimer, and take full responsibility for my purchasing decision.
                                    </span>
                                </label>
                            </div>

                            <button
                                onClick={handlePlaceOrder}
                                disabled={!paymentProof || isUploadingProof}
                                className="w-full btn-primary py-4 text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isUploadingProof ? 'Uploading Proof...' : 'Complete Order'}
                            </button>

                            {/* Policies Required Modal */}
                            {showPoliciesModal && (
                                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center px-4 py-8">
                                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-amber-50 p-2 rounded-full">
                                                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                                                </div>
                                                <h3 className="font-heading text-xl font-bold text-charcoal-900">
                                                    Please Review Our Policies
                                                </h3>
                                            </div>
                                            <button
                                                onClick={() => setShowPoliciesModal(false)}
                                                aria-label="Close"
                                                className="text-gray-400 hover:text-charcoal-900 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="p-6 overflow-y-auto flex-1">
                                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3 mb-5">
                                                You must read and acknowledge the policies below before completing your order.
                                            </p>
                                            <div className="space-y-5 text-sm text-gray-700">
                                                <PoliciesContent />
                                            </div>
                                        </div>
                                        <div className="p-6 border-t border-gray-100 space-y-3">
                                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={policiesAccepted}
                                                    onChange={(e) => setPoliciesAccepted(e.target.checked)}
                                                    className="mt-1 w-4 h-4 text-brand-600 focus:ring-brand-500 rounded"
                                                />
                                                <span className="text-sm text-charcoal-900">
                                                    I have read and agree to all policies above and take full responsibility for my purchasing decision.
                                                </span>
                                            </label>
                                            <button
                                                onClick={() => setShowPoliciesModal(false)}
                                                disabled={!policiesAccepted}
                                                className="w-full btn-primary py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {policiesAccepted ? 'Continue' : 'Please tick the checkbox to continue'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar Summary (Reused logic, simplified UI) */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-soft p-6 sticky top-24 border border-gray-100">
                                <h3 className="font-heading font-bold text-charcoal-900 mb-4">Order Summary</h3>
                                <div className="space-y-2 mb-4">
                                    {cartItems.map((item, idx) => {
                                        const currentPrice = getEffectiveUnitPrice(
                                            item.product,
                                            item.variation,
                                            item.kitType,
                                            item.quantity
                                        );

                                        return (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-gray-600">{item.quantity}x {cleanText(item.product.name)}</span>
                                                <span className="font-medium">₱{(currentPrice * item.quantity).toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span>₱{totalPrice.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Shipping</span>
                                        <span>₱{shippingFee.toLocaleString()}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-brand-600 font-medium">
                                            <span>Discount</span>
                                            <span>-₱{discountAmount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {effectivePointsRedeemed > 0 && (
                                        <div className="flex justify-between text-emerald-700 font-medium">
                                            <span>Points</span>
                                            <span>-₱{effectivePointsRedeemed.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-charcoal-900 text-lg pt-2">
                                        <span>Total</span>
                                        <span>₱{finalTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    // Details Step
    return (
        <div className="min-h-screen bg-cool-gray py-6 md:py-8">
            <div className="container mx-auto px-4 max-w-6xl">
                <button
                    onClick={onBack}
                    className="text-gray-500 hover:text-brand-600 font-medium mb-6 flex items-center gap-2 transition-colors group text-sm"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Cart</span>
                </button>

                <h1 className="font-heading text-2xl md:text-3xl font-bold text-charcoal-900 mb-8 flex items-center gap-3">
                    Checkout Information
                    <Heart className="w-6 h-6 text-brand-600" />
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Customer Information */}
                        <div className="bg-white rounded-2xl shadow-soft p-6 border border-brand-100">
                            <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-6 flex items-center gap-2">
                                <div className="bg-brand-50 p-2 rounded text-brand-600">
                                    <Package className="w-5 h-5" />
                                </div>
                                Customer Details
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="input-field"
                                        placeholder="Juan Dela Cruz"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-field"
                                        placeholder="juan@example.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">
                                        Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="input-field"
                                        placeholder="09XX XXX XXXX"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Shipping Address */}
                        <div className="bg-white rounded-2xl shadow-soft p-6 border border-brand-100">
                            <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-6 flex items-center gap-2">
                                <div className="bg-brand-50 p-2 rounded text-brand-600">
                                    <Database className="w-5 h-5" />
                                </div>
                                Shipping Address
                            </h2>

                            {user && savedAddresses.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">Saved addresses</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {savedAddresses.map(addr => (
                                            <button
                                                type="button"
                                                key={addr.id}
                                                onClick={() => applyAddress(addr)}
                                                className={`text-left p-3 rounded border transition-all text-sm ${selectedAddressId === addr.id
                                                    ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                                                    : 'border-gray-200 hover:border-brand-300'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className="font-bold text-charcoal-900 truncate">{addr.recipient_name}</span>
                                                    {addr.label && (
                                                        <span className="text-[10px] uppercase tracking-wider bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{addr.label}</span>
                                                    )}
                                                    {addr.is_primary && (
                                                        <span className="text-[10px] uppercase tracking-wider bg-brand-600 text-white px-1.5 py-0.5 rounded">Primary</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-600 truncate">{addr.phone}</p>
                                                <p className="text-xs text-gray-600 line-clamp-2">{addr.address}, {addr.barangay}, {addr.city}, {addr.state} {addr.zip_code}</p>
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedAddressId('');
                                                setFullName('');
                                                setPhone('');
                                                setAddress('');
                                                setBarangay('');
                                                setCity('');
                                                setState('');
                                                setZipCode('');
                                            }}
                                            className="text-left p-3 rounded border border-dashed border-gray-300 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600"
                                        >
                                            + Use a new address
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">
                                        Street Address *
                                    </label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="input-field"
                                        placeholder="House/Unit, Street Name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">
                                        Barangay *
                                    </label>
                                    <input
                                        type="text"
                                        value={barangay}
                                        onChange={(e) => setBarangay(e.target.value)}
                                        className="input-field"
                                        placeholder="Brgy. Name"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">
                                            City *
                                        </label>
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="input-field"
                                            placeholder="City"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">
                                            Province *
                                        </label>
                                        <input
                                            type="text"
                                            value={state}
                                            onChange={(e) => setState(e.target.value)}
                                            className="input-field"
                                            placeholder="Province"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">
                                        ZIP/Postal Code *
                                    </label>
                                    <input
                                        type="text"
                                        value={zipCode}
                                        onChange={(e) => setZipCode(e.target.value)}
                                        className="input-field"
                                        placeholder="ZIP Code"
                                        required
                                    />
                                </div>

                                {user && !selectedAddressId && (
                                    <div className="bg-brand-50/40 border border-brand-100 rounded p-3 space-y-3">
                                        <label className="flex items-start gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={saveAddressForNextTime}
                                                onChange={(e) => setSaveAddressForNextTime(e.target.checked)}
                                                className="mt-0.5 w-4 h-4 text-brand-600 focus:ring-brand-500 rounded"
                                            />
                                            <span className="text-sm text-charcoal-900">
                                                Save this address for next time
                                            </span>
                                        </label>
                                        {saveAddressForNextTime && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                                                <input
                                                    type="text"
                                                    value={newAddressLabel}
                                                    onChange={(e) => setNewAddressLabel(e.target.value)}
                                                    placeholder="Label (e.g. Home, Office)"
                                                    className="input-field text-sm"
                                                />
                                                {savedAddresses.length > 0 && (
                                                    <label className="flex items-center gap-2 text-sm text-charcoal-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={makeNewAddressPrimary}
                                                            onChange={(e) => setMakeNewAddressPrimary(e.target.checked)}
                                                            className="w-4 h-4 text-brand-600 focus:ring-brand-500 rounded"
                                                        />
                                                        Set as primary
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Courier Selection */}
                    <div className="bg-white rounded-2xl shadow-soft p-6 border border-brand-100">
                        <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-3 flex items-center gap-2">
                            <Truck className="w-5 h-5 text-brand-600" />
                            Select Courier Provider *
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {couriers
                                .filter(c => c.is_active)
                                .map((courier) => (
                                    <button
                                        key={courier.id}
                                        onClick={() => {
                                            setSelectedCourierId(courier.id);
                                            setShippingLocation(''); // Reset location when courier changes
                                        }}
                                        className={`p-4 rounded border transition-all text-left flex items-center gap-3 ${selectedCourierId === courier.id
                                            ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                                            : 'border-gray-200 hover:border-brand-300'
                                            }`}
                                    >
                                        <div className="font-bold text-charcoal-900 text-sm">{courier.name}</div>
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* Shipping Location Selection */}
                    <div className={`bg-white rounded-2xl shadow-soft p-6 border border-brand-100 transition-opacity duration-300 ${!selectedCourierId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-3 flex items-center gap-2">
                            Choose Shipping Region *
                        </h2>
                        <p className="text-xs text-gray-500 mb-6 bg-blue-50 p-3 rounded border border-blue-100">
                            {selectedCourierId
                                ? 'Select the rate applicable to your location.'
                                : 'Please select a courier provider above first.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {shippingLocations
                                .filter(loc => {
                                    if (!selectedCourierId) return false;
                                    const courier = couriers.find(c => c.id === selectedCourierId);
                                    if (!courier) return false;

                                    // Match logic:
                                    // 1. If location ID explicitly contains courier code (e.g. LBC_METRO contains LBC)
                                    // 2. Or check against common patterns if codes don't strictly match
                                    const code = courier.code.toLowerCase();
                                    const locId = loc.id.toLowerCase();
                                    const locName = loc.name.toLowerCase();

                                    return locId.includes(code) || locName.includes(code);
                                })
                                .map((loc) => (
                                    <button
                                        key={loc.id}
                                        onClick={() => setShippingLocation(loc.id)}
                                        className={`p-4 rounded border transition-all text-left ${shippingLocation === loc.id
                                            ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                                            : 'border-gray-200 hover:border-brand-300'
                                            }`}
                                    >
                                        <p className="font-bold text-charcoal-900 text-sm mb-1">{loc.name || loc.id.replace('_', ' & ')}</p>
                                        <p className="text-xs text-brand-600 font-medium">₱{loc.fee}</p>
                                    </button>
                                ))}
                        </div>
                    </div>

                    <button
                        onClick={handleProceedToPayment}
                        disabled={!isDetailsValid}
                        className={`w-full py-4 rounded font-bold text-base transition-all transform shadow-md ${isDetailsValid
                            ? 'btn-primary hover:scale-[1.01]'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Proceed to Payment
                    </button>
                </div>

                {/* Order Summary Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-soft p-6 sticky top-24 border border-gray-100">
                        <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-6 flex items-center gap-2">
                            Order Summary
                            <Heart className="w-4 h-4 text-brand-600" />
                        </h2>

                        <div className="space-y-4 mb-6">
                            {cartItems.map((item, index) => {
                                const currentPrice = getEffectiveUnitPrice(
                                    item.product,
                                    item.variation,
                                    item.kitType,
                                    item.quantity
                                );
                                const lineTotal = currentPrice * item.quantity;
                                const tier = getMatchingBundleTier(item.product, item.quantity);
                                const kitUpgradePerUnit = item.kitType === 'complete_kit' ? KIT_UPGRADE_PRICE : 0;
                                const fullTotal = tier
                                    ? (getRegularUnitPrice(item.product, item.variation) + kitUpgradePerUnit) * item.quantity
                                    : lineTotal;
                                const showSavings = tier != null && lineTotal < fullTotal;
                                const pct = showSavings ? Math.round((1 - lineTotal / fullTotal) * 100) : 0;

                                return (
                                    <div key={`${item.product.id}-${item.variation?.id ?? 'novar'}-${item.kitType ?? 'vial'}-${index}`} className="pb-4 border-b border-gray-100">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-charcoal-900 text-sm">{cleanText(item.product.name)}</h4>
                                                {item.variation && (
                                                    <p className="text-xs text-gray-600 mt-0.5">{item.variation.name}</p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                {showSavings && (
                                                    <div className="text-[10px] text-charcoal-300 line-through">
                                                        ₱{fullTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                                                    </div>
                                                )}
                                                <span className="font-bold text-charcoal-900 text-sm">
                                                    ₱{lineTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                                                </span>
                                                {showSavings && (
                                                    <div className="text-[10px] font-bold text-emerald-600">SAVE {pct}%</div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Promo Code */}
                        <div className="mb-6 pt-2">
                            <p className="text-xs font-bold text-brand-700 uppercase mb-2 flex items-center gap-1">
                                <Tag className="w-3 h-3" /> Promo Code
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value)}
                                    placeholder="ENTER CODE"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none uppercase"
                                    disabled={!!appliedPromo || isApplyingPromo}
                                />
                                {appliedPromo ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAppliedPromo(null);
                                            setDiscountAmount(0);
                                            setPromoCode('');
                                            setPromoSuccess('');
                                        }}
                                        className="px-3 py-2 bg-red-50 text-red-600 rounded text-xs font-bold border border-red-100 hover:bg-red-100 shrink-0 whitespace-nowrap"
                                    >
                                        REMOVE
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleApplyPromoCode}
                                        disabled={!promoCode || isApplyingPromo}
                                        className="px-3 py-2 bg-brand-600 text-white rounded text-xs font-bold hover:bg-brand-700 disabled:opacity-50 shrink-0 whitespace-nowrap"
                                    >
                                        APPLY
                                    </button>
                                )}
                            </div>
                            {promoError && <p className="text-red-500 text-xs mt-1">{promoError}</p>}
                            {promoSuccess && <p className="text-brand-600 text-xs mt-1 font-medium">{promoSuccess}</p>}
                        </div>

                        {/* Points Redemption */}
                        {user && pointsBalance > 0 && (
                            <div className="mb-6 pt-2">
                                <p className="text-xs font-bold text-brand-700 uppercase mb-2 flex items-center gap-1">
                                    <Tag className="w-3 h-3" /> Use Points (Balance: {pointsBalance.toLocaleString()})
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={pointsToRedeem || ''}
                                        onChange={(e) => setPointsToRedeem(Math.max(0, Math.min(maxRedeemable, Number(e.target.value) || 0)))}
                                        placeholder="0"
                                        min={0}
                                        max={maxRedeemable}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setPointsToRedeem(maxRedeemable)}
                                        className="px-3 py-2 bg-brand-50 text-brand-700 rounded text-xs font-bold border border-brand-200 hover:bg-brand-100 shrink-0"
                                    >
                                        MAX
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">1 pt = ₱1 — up to ₱{maxRedeemable.toLocaleString()} on this order.</p>
                            </div>
                        )}

                        <div className="space-y-2 text-sm text-gray-600 border-t border-gray-100 pt-4">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>₱{totalPrice.toLocaleString()}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-brand-600 font-medium">
                                    <span>Discount</span>
                                    <span>-₱{discountAmount.toLocaleString()}</span>
                                </div>
                            )}
                            {effectivePointsRedeemed > 0 && (
                                <div className="flex justify-between text-emerald-700 font-medium">
                                    <span>Points</span>
                                    <span>-₱{effectivePointsRedeemed.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-charcoal-900 text-base pt-2">
                                <span>Total Estimate</span>
                                <span>₱{Math.max(0, totalPrice - discountAmount - effectivePointsRedeemed).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-gray-400 text-right italic">+ Shipping fee added at payment</p>
                        </div>

                        {/* Last-minute add-ons */}
                        {addToCart && recommendations.length > 0 && (
                            <div className="mt-6">
                                <RecommendationRail
                                    products={recommendations}
                                    title="Add to your order"
                                    variant="compact"
                                    placement="checkout"
                                    onAddToCart={addToCart}
                                />
                            </div>
                        )}

                    </div>
                </div>
            </div>
            {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
        </div>
    );
};

const PoliciesContent: React.FC = () => (
    <>
        <section>
            <h4 className="font-bold text-charcoal-900 mb-1">📦 Shipping Policy</h4>
            <p className="mb-2">We aim to process and dispatch all orders efficiently while maintaining product integrity.</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Shipping is fulfilled based on order volume and availability</li>
                <li>Orders are processed in the sequence they are received</li>
                <li>Delivery times may vary depending on location and carrier conditions</li>
            </ul>
            <p className="mt-2">Once your order has been shipped, you will receive tracking details for full transparency.</p>
        </section>

        <section>
            <h4 className="font-bold text-charcoal-900 mb-1">🔁 Returns & Refunds Policy</h4>
            <p className="mb-2">Due to the nature of our products, we maintain a strict return policy to ensure quality and safety.</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Returns are not accepted by default</li>
                <li>Any return request must include valid evidence and a clear, justified reason</li>
                <li>All return requests are subject to review and approval</li>
            </ul>
            <p className="mt-2">Approved cases may include:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Damaged product upon arrival</li>
                <li>Incorrect item received</li>
            </ul>
            <p className="mt-2">We reserve the right to decline any return that does not meet our criteria.</p>
        </section>

        <section>
            <h4 className="font-bold text-charcoal-900 mb-1">⚠️ Health & Safety Disclaimer</h4>
            <p className="mb-2">Your health and safety are our top priority. Before purchasing, please ensure:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>You do not have any pre-existing medical conditions that may conflict with peptide use</li>
                <li>You are not allergic to any ingredients or compounds</li>
                <li>You fully understand the nature of research-based peptide products</li>
            </ul>
            <p className="mt-2">Certain peptides (including GLP-1 related compounds such as tirzepatide) may carry specific health risks or contraindications.</p>
        </section>

        <section>
            <h4 className="font-bold text-charcoal-900 mb-1">🚨 Important Recommendation</h4>
            <p className="mb-2">If you have any past or current health concerns, you should:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Undergo a medical check-up</li>
                <li>Consult with a licensed healthcare professional</li>
            </ul>
            <p className="mt-2">before purchasing or using any products.</p>
        </section>

        <section>
            <h4 className="font-bold text-charcoal-900 mb-1">🧾 Final Notice</h4>
            <p className="mb-2">By placing an order, you confirm that:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>You have reviewed and understood all policies</li>
                <li>You take full responsibility for your purchasing decision</li>
                <li>You have ensured the products are suitable for your personal situation</li>
            </ul>
        </section>
    </>
);

export default Checkout;
