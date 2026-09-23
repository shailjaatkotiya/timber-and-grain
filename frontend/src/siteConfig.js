/**
 * Store contact details, shown in the footer, the Contact page, the landing page and product pages.
 * ⚠️ PLACEHOLDERS: replace with your real business details before going live.
 */
export const STORE = {
  name: 'Timber & Grain',
  tagline: 'Solid-wood furniture, configured by you and built to order.',
  phone: '+91 79840 64480',
  whatsapp: '919876543210', // digits only, used for the wa.me link
  email: 'hello@timberandgrain.example',
  showroom: {
    line1: 'Plot 12, Furniture Market Road',
    line2: 'Kirti Nagar',
    city: 'New Delhi',
    pincode: '110015',
  },
  hours: [
    { days: 'Mon – Sat', time: '10:00 am – 8:00 pm' },
    { days: 'Sunday', time: '11:00 am – 6:00 pm' },
  ],
  perks: ['Free shipping over ₹25,000', 'Cash / UPI on delivery', '10-year frame warranty', 'Built to order in ~3 weeks'],
};

export const telHref = `tel:${STORE.phone.replace(/\s/g, '')}`;
export const mailHref = `mailto:${STORE.email}`;
export const waHref = `https://wa.me/${STORE.whatsapp}`;
export const addressText = `${STORE.showroom.line1}, ${STORE.showroom.line2}, ${STORE.showroom.city} ${STORE.showroom.pincode}`;
export const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;
