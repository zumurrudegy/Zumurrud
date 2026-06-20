import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

/* ============================================================
   ZUMURRUD — bilingual storefront + owner dashboard
   Color tokens: deep emerald green, beige, baby pink
   ============================================================ */

const COLORS_DEFAULT = {
  primary: '#1f3b32',      // deep emerald green (original, site-wide)
  primaryDark: '#142823',
  logo: '#3f7a64',          // lighter green specifically for the ZUMURRUD wordmark
  beige: '#f3ecdf',
  beigeDark: '#e3d6bc',
  pink: '#f3c9d4',
  pinkDark: '#d391a3',
  text: '#26211a',
  white: '#fffdf9'
};

const STORAGE_KEY_PRODUCTS = 'zumurrud:products';
const STORAGE_KEY_LAYOUT = 'zumurrud:layout';
const STORAGE_KEY_THEME = 'zumurrud:theme';
const STORAGE_KEY_ORDERS = 'zumurrud:orders';
const STORAGE_KEY_SETTINGS = 'zumurrud:settings';
const STORAGE_KEY_ACCOUNTS = 'zumurrud:accounts';
const STORAGE_KEY_CATEGORIES = 'zumurrud:categories';
const STORAGE_KEY_CARD_DESIGN = 'zumurrud:cardDesign';
const STORAGE_KEY_REVIEWS = 'zumurrud:reviews';
const STORAGE_KEY_DISCOUNT_CODES = 'zumurrud:discountCodes';
const STORAGE_KEY_ANNOUNCEMENT = 'zumurrud:announcement';

/* ============================================================
   FIREBASE INTEGRATION
   هنا تحطي إعدادات Firebase بتاعتك بعد ما تعمليها
   ============================================================ */
const FIREBASE_CONFIG = null; // ← هنا هتحطي الـ config بعدين

async function fbSet(key, value) {
  if (!FIREBASE_CONFIG) { await saveRemote(key, value); return; }
  try {
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getDatabase, ref, set } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    const db = getDatabase(app);
    await set(ref(db, key), value);
  } catch (e) { await saveRemote(key, value); }
}

async function fbGet(key, fallback) {
  if (!FIREBASE_CONFIG) { return loadRemote(key, fallback); }
  try {
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getDatabase, ref, get } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    const db = getDatabase(app);
    const snap = await get(ref(db, key));
    return snap.exists() ? snap.val() : fallback;
  } catch (e) { return loadRemote(key, fallback); }
}

/* ---------------- Placeholder image generator ---------------- */
function placeholderImg(seed, w = 600, h = 800) {
  const hues = ['1f3b32', 'e9b8c4', 'e3d6bc', '2f5346'];
  const c = hues[seed % hues.length];
  return `https://placehold.co/${w}x${h}/${c}/fffdf9?font=playfair-display&text=ZUMURRUD`;
}

/* ---------------- Default product data ---------------- */
const DEFAULT_PRODUCTS = [
  {
    id: 'p1',
    nameAr: 'عباية حجازية كحلي',
    nameEn: 'Hijazi Emerald Abaya',
    category: 'abaya',
    price: 450,
    salePrice: null,
    descAr: 'عباية بقصة حجازية أصلية، تصميم A-line بأكمام واسعة، قماش كريب فاخر يعطي وقفة أنيقة دون ثقل.',
    descEn: 'Authentic Hijazi-cut abaya, A-line silhouette with wide sleeves, premium crepe fabric for an elegant drape.',
    colors: ['#1f3b32', '#26211a'],
    sizes: ['52', '54', '56', '58', '60'],
    images: [placeholderImg(0), placeholderImg(4)],
    featured: true,
    stock: 12
  },
  {
    id: 'p2',
    nameAr: 'جلابية بيج مطرزة',
    nameEn: 'Embroidered Beige Jalabiya',
    category: 'jalabiya',
    price: 380,
    salePrice: 320,
    descAr: 'جلابية بطرحة تطريز يدوي على الصدر، قماش قطن مريح للبس اليومي والمناسبات الخفيفة.',
    descEn: 'Jalabiya with hand embroidery detail at the chest, comfortable cotton blend for daily wear and casual occasions.',
    colors: ['#e3d6bc', '#fffdf9'],
    sizes: ['52', '54', '56', '58'],
    images: [placeholderImg(1), placeholderImg(5)],
    featured: true,
    stock: 8
  },
  {
    id: 'p3',
    nameAr: 'فستان سهرة بيبي بينك',
    nameEn: 'Baby Pink Evening Dress',
    category: 'dress',
    price: 620,
    salePrice: null,
    descAr: 'فستان سهرة محجبات بقصة ميرميد، تطريز خرز يدوي على الكتف، مناسب للمناسبات الفاخرة.',
    descEn: 'Modest evening mermaid-cut dress with hand-beaded shoulder detail, perfect for formal occasions.',
    colors: ['#e9b8c4', '#d391a3'],
    sizes: ['52', '54', '56'],
    images: [placeholderImg(2), placeholderImg(6)],
    featured: true,
    stock: 5
  },
  {
    id: 'p4',
    nameAr: 'بخور زمرد الفاخر',
    nameEn: 'Zumurrud Luxury Bakhour',
    category: 'bakhour',
    price: 85,
    salePrice: null,
    descAr: 'بخور معطر بخلطة عود فاخرة، علبة 100 جرام، رائحة تدوم طوال اليوم.',
    descEn: 'Premium oud-blend bakhour, 100g box, long-lasting fragrance that lasts all day.',
    colors: [],
    sizes: [],
    images: [placeholderImg(3), placeholderImg(7)],
    featured: true,
    stock: 30
  },
  {
    id: 'p5',
    nameAr: 'عباية سادة أنيقة',
    nameEn: 'Classic Plain Abaya',
    category: 'abaya',
    price: 390,
    salePrice: null,
    descAr: 'عباية كلاسيكية سادة بقصة بسيطة وأنيقة، مناسبة للاستخدام اليومي.',
    descEn: 'Classic plain abaya with a simple, elegant cut, perfect for everyday wear.',
    colors: ['#1f3b32'],
    sizes: ['52', '54', '56', '58', '60'],
    images: [placeholderImg(8), placeholderImg(0)],
    featured: false,
    stock: 15
  },
  {
    id: 'p6',
    nameAr: 'جلابية صيفية فاتحة',
    nameEn: 'Light Summer Jalabiya',
    category: 'jalabiya',
    price: 290,
    salePrice: 250,
    descAr: 'جلابية خامة قطن خفيف مناسبة للصيف، تصميم بسيط بلمسة عصرية.',
    descEn: 'Light cotton jalabiya perfect for summer, simple design with a modern touch.',
    colors: ['#f3ecdf'],
    sizes: ['52', '54', '56', '58'],
    images: [placeholderImg(9), placeholderImg(1)],
    featured: false,
    stock: 20
  }
];

const DEFAULT_LAYOUT = [
  { id: 'slider', enabled: true, label: { ar: 'السلايدر الرئيسي', en: 'Hero Slider' } },
  { id: 'categories', enabled: true, label: { ar: 'الفئات', en: 'Categories' } },
  { id: 'featured', enabled: true, label: { ar: 'منتجات مميزة', en: 'Featured Products' } },
  { id: 'banner', enabled: true, label: { ar: 'بانر العرض', en: 'Promo Banner' } },
  { id: 'newArrivals', enabled: true, label: { ar: 'وصل حديثاً', en: 'New Arrivals' } },
  { id: 'about', enabled: true, label: { ar: 'عن زمرد', en: 'About Zumurrud' } }
];

const DEFAULT_SETTINGS = {
  storeName: 'ZUMURRUD',
  taglineAr: 'أناقة حجازية تلامس الروح',
  taglineEn: 'Hijazi elegance, woven with soul',
  whatsapp: '201000000000',
  email: 'hello@zumurrud.com',
  instagram: 'zumurrud.eg',
  tiktok: 'zumurrud.eg',
  facebook: '',
  shippingFee: 60,
  freeShippingOver: 500,
  logoSize: 28,
  vodafoneCash: '',
  measurementChartImage: ''
};

const DEFAULT_ACCOUNTS = [
  { id: 'acc1', email: 'owner@zumurrud.com', password: 'Zumurrud@2026', role: 'owner', name: 'Owner' }
];

const DEFAULT_ANNOUNCEMENT = {
  enabled: false,
  text: 'خصم 15% على كل الطلبات فوق 500 ج.م بكود ZUMURRUD15',
  textEn: '15% off orders above 500 EGP with code ZUMURRUD15',
  bgColor: '#1f3b32',
  textColor: '#f3ecdf',
  speed: 30
};

const DEFAULT_DISCOUNT_CODES = [
  { code: 'ZUMURRUD15', type: 'percent', value: 15, active: true },
  { code: 'WELCOME10', type: 'percent', value: 10, active: true }
];

const DEFAULT_REVIEWS = [];
const ADMIN_SECRET_CODE = 'joke33';

/* ---------------- i18n strings ---------------- */
const STR = {
  ar: {
    home: 'الرئيسية', shop: 'المتجر', about: 'من نحن', contact: 'تواصل معنا',
    cart: 'السلة', search: 'بحث', all: 'الكل', abaya: 'عبايات', jalabiya: 'جلابيات',
    dress: 'فساتين محجبات', bakhour: 'بخور', addToCart: 'أضف للسلة', viewProduct: 'عرض المنتج',
    featuredProducts: 'منتجات مميزة', newArrivals: 'وصل حديثاً', shopNow: 'تسوقي الآن',
    price: 'السعر', size: 'المقاس', color: 'اللون', quantity: 'الكمية', subtotal: 'الإجمالي الفرعي',
    shipping: 'الشحن', total: 'الإجمالي', checkout: 'إتمام الطلب', emptyCart: 'السلة فاضية',
    continueShopping: 'استمري في التسوق', orderSummary: 'ملخص الطلب', name: 'الاسم',
    phone: 'رقم الموبايل', address: 'العنوان', governorate: 'المحافظة', notes: 'ملاحظات',
    placeOrder: 'تأكيد الطلب', freeShipping: 'شحن مجاني', removeItem: 'إزالة', sale: 'تخفيض',
    outOfStock: 'غير متوفر', filterBy: 'تصفية حسب', sortBy: 'ترتيب حسب', priceLowHigh: 'السعر: من الأقل للأعلى',
    priceHighLow: 'السعر: من الأعلى للأقل', newest: 'الأحدث', ownerLogin: 'دخول الأونر',
    password: 'كلمة المرور', login: 'دخول', dashboard: 'لوحة التحكم', products: 'المنتجات',
    addProduct: 'إضافة منتج', editProduct: 'تعديل منتج', deleteProduct: 'حذف', save: 'حفظ',
    cancel: 'إلغاء', layout: 'ترتيب الصفحة', themeColors: 'ألوان الموقع', orders: 'الطلبات',
    settings: 'الإعدادات', logout: 'خروج', productName: 'اسم المنتج (عربي)', productNameEn: 'اسم المنتج (إنجليزي)',
    description: 'الوصف (عربي)', descriptionEn: 'الوصف (إنجليزي)', category: 'الفئة', regularPrice: 'السعر الأصلي',
    onSale: 'سعر بعد الخصم (اختياري)', stock: 'المخزون', colors: 'الألوان (افصلي بفاصلة، مثال: #1f3b32, #e9b8c4)',
    sizes: 'المقاسات (افصلي بفاصلة)', images: 'روابط الصور (افصلي بفاصلة)', featuredProduct: 'منتج مميز؟',
    yes: 'نعم', no: 'لا', total_: 'الإجمالي', orderNumber: 'رقم الطلب', date: 'التاريخ', customer: 'العميل',
    status: 'الحالة', pending: 'قيد الانتظار', confirmed: 'مؤكد', shipped: 'تم الشحن', delivered: 'تم التوصيل',
    storeName: 'اسم المتجر', taglineAr: 'الشعار (عربي)', taglineEn: 'الشعار (إنجليزي)', whatsappNum: 'رقم الواتساب',
    emailAddr: 'البريد الإلكتروني', shippingFee: 'رسوم الشحن', freeShipOver: 'شحن مجاني فوق',
    dragToReorder: 'اسحبي لإعادة الترتيب', enabled: 'مفعّل', primaryColor: 'اللون الأساسي (أخضر)',
    beigeColor: 'اللون الثانوي (بيج)', pinkColor: 'لون التمييز (بيبي بينك)', resetDefaults: 'استرجاع الافتراضي',
    backToSite: 'رجوع للموقع', welcomeOwner: 'أهلاً بك في لوحة التحكم', wrongPassword: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    ownerEmail: 'البريد الإلكتروني', team: 'الموظفين', addMember: 'إضافة موظف', memberEmail: 'البريد الإلكتروني للموظف',
    memberPassword: 'كلمة المرور', memberName: 'الاسم', removeMember: 'إزالة', changePassword: 'تغيير كلمة المرور',
    currentPassword: 'كلمة المرور الحالية', newPassword: 'كلمة المرور الجديدة', passwordChanged: 'تم تغيير كلمة المرور',
    incorrectCurrentPassword: 'كلمة المرور الحالية غير صحيحة',
    noProducts: 'لا توجد منتجات', searchPlaceholder: 'بحثي عن منتج...', heroTitle1: 'حيث تلتقي',
    heroTitle2: 'الأناقة بالهوية', heroSub: 'تشكيلة عبايات وجلابيات وفساتين محجبات مصممة بروح حجازية أصيلة',
    ourStory: 'قصتنا', aboutText: 'زمرد ليست مجرد براند أزياء، هي رحلة شغف بدأت من حب التراث الحجازي والرغبة في تقديم قطع تجمع بين الأصالة والأناقة العصرية. كل تصميم يولد من تفصيلة، وكل قطعة تحكي حكاية.',
    getInTouch: 'تواصلي معنا', sendMessage: 'إرسال', yourMessage: 'رسالتك', whatsappUs: 'تواصلي عبر واتساب',
    followInsta: 'تابعينا على إنستجرام', copyright: 'كل الحقوق محفوظة', closeMenu: 'إغلاق', menu: 'القائمة',
    selectSize: 'اختاري المقاس', selectColor: 'اختاري اللون', pleaseSelect: 'برجاء اختيار المقاس واللون',
    addedToCart: 'تمت الإضافة للسلة', itemsInCart: 'منتج في السلة', relatedProducts: 'منتجات مشابهة',
    backToShop: 'رجوع للمتجر', orderPlaced: 'تم تأكيد طلبك بنجاح!', orderPlacedSub: 'سنتواصل معك قريباً لتأكيد التفاصيل',
    backToHome: 'رجوع للرئيسية', requiredField: 'هذا الحقل مطلوب', moveUp: 'تحريك لأعلى', moveDown: 'تحريك لأسفل',
    show: 'إظهار', hide: 'إخفاء', uploadImage: 'رفع صورة', orPasteUrl: 'أو رابط الصورة', discount: 'خصم',
    quickView: 'عرض سريع', clearCart: 'تفريغ السلة', applyFilters: 'تطبيق', noResults: 'لا توجد نتائج مطابقة',
    governorateList: ['القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر', 'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية', 'المنوفية', 'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس', 'أسوان', 'أسيوط', 'بني سويف', 'بورسعيد', 'دمياط', 'الشرقية', 'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا', 'شمال سيناء', 'سوهاج']
  },
  en: {
    home: 'Home', shop: 'Shop', about: 'About', contact: 'Contact',
    cart: 'Cart', search: 'Search', all: 'All', abaya: 'Abayas', jalabiya: 'Jalabiyas',
    dress: 'Modest Dresses', bakhour: 'Bakhour', addToCart: 'Add to cart', viewProduct: 'View product',
    featuredProducts: 'Featured products', newArrivals: 'New arrivals', shopNow: 'Shop now',
    price: 'Price', size: 'Size', color: 'Color', quantity: 'Quantity', subtotal: 'Subtotal',
    shipping: 'Shipping', total: 'Total', checkout: 'Checkout', emptyCart: 'Your cart is empty',
    continueShopping: 'Continue shopping', orderSummary: 'Order summary', name: 'Name',
    phone: 'Phone number', address: 'Address', governorate: 'Governorate', notes: 'Notes',
    placeOrder: 'Place order', freeShipping: 'Free shipping', removeItem: 'Remove', sale: 'Sale',
    outOfStock: 'Out of stock', filterBy: 'Filter by', sortBy: 'Sort by', priceLowHigh: 'Price: low to high',
    priceHighLow: 'Price: high to low', newest: 'Newest', ownerLogin: 'Owner login',
    password: 'Password', login: 'Login', dashboard: 'Dashboard', products: 'Products',
    addProduct: 'Add product', editProduct: 'Edit product', deleteProduct: 'Delete', save: 'Save',
    cancel: 'Cancel', layout: 'Page layout', themeColors: 'Theme colors', orders: 'Orders',
    settings: 'Settings', logout: 'Log out', productName: 'Product name (Arabic)', productNameEn: 'Product name (English)',
    description: 'Description (Arabic)', descriptionEn: 'Description (English)', category: 'Category', regularPrice: 'Regular price',
    onSale: 'Sale price (optional)', stock: 'Stock', colors: 'Colors (comma separated, e.g. #1f3b32, #e9b8c4)',
    sizes: 'Sizes (comma separated)', images: 'Image URLs (comma separated)', featuredProduct: 'Featured product?',
    yes: 'Yes', no: 'No', total_: 'Total', orderNumber: 'Order number', date: 'Date', customer: 'Customer',
    status: 'Status', pending: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered',
    storeName: 'Store name', taglineAr: 'Tagline (Arabic)', taglineEn: 'Tagline (English)', whatsappNum: 'WhatsApp number',
    emailAddr: 'Email address', shippingFee: 'Shipping fee', freeShipOver: 'Free shipping over',
    dragToReorder: 'Drag to reorder', enabled: 'Enabled', primaryColor: 'Primary color (green)',
    beigeColor: 'Secondary color (beige)', pinkColor: 'Accent color (baby pink)', resetDefaults: 'Reset to default',
    backToSite: 'Back to site', welcomeOwner: 'Welcome to the dashboard', wrongPassword: 'Incorrect email or password',
    ownerEmail: 'Email address', team: 'Team', addMember: 'Add team member', memberEmail: 'Team member email',
    memberPassword: 'Password', memberName: 'Name', removeMember: 'Remove', changePassword: 'Change password',
    currentPassword: 'Current password', newPassword: 'New password', passwordChanged: 'Password changed',
    incorrectCurrentPassword: 'Current password is incorrect',
    noProducts: 'No products found', searchPlaceholder: 'Search products...', heroTitle1: 'Where elegance',
    heroTitle2: 'meets identity', heroSub: 'A collection of abayas, jalabiyas, and modest dresses designed with authentic Hijazi soul',
    ourStory: 'Our story', aboutText: 'Zumurrud is more than a fashion brand — it is a journey of passion that began with a love for Hijazi heritage and a desire to create pieces that blend authenticity with modern elegance. Every design is born from a detail, and every piece tells a story.',
    getInTouch: 'Get in touch', sendMessage: 'Send', yourMessage: 'Your message', whatsappUs: 'Message us on WhatsApp',
    followInsta: 'Follow us on Instagram', copyright: 'All rights reserved', closeMenu: 'Close', menu: 'Menu',
    selectSize: 'Select size', selectColor: 'Select color', pleaseSelect: 'Please select size and color',
    addedToCart: 'Added to cart', itemsInCart: 'items in cart', relatedProducts: 'You may also like',
    backToShop: 'Back to shop', orderPlaced: 'Your order has been placed!', orderPlacedSub: 'We will contact you shortly to confirm the details',
    backToHome: 'Back to home', requiredField: 'This field is required', moveUp: 'Move up', moveDown: 'Move down',
    show: 'Show', hide: 'Hide', uploadImage: 'Upload image', orPasteUrl: 'Or paste image URL', discount: 'Discount',
    quickView: 'Quick view', clearCart: 'Clear cart', applyFilters: 'Apply', noResults: 'No matching results',
    governorateList: ['Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Red Sea', 'Beheira', 'Fayoum', 'Gharbia', 'Ismailia', 'Monufia', 'Minya', 'Qalyubia', 'New Valley', 'Suez', 'Aswan', 'Asyut', 'Beni Suef', 'Port Said', 'Damietta', 'Sharqia', 'South Sinai', 'Kafr El Sheikh', 'Matrouh', 'Luxor', 'Qena', 'North Sinai', 'Sohag']
  }
};

const DEFAULT_CATEGORIES = [
  { id: 'abaya', labelAr: 'عبايات', labelEn: 'Abayas', image: placeholderImg(0, 500, 600) },
  { id: 'jalabiya', labelAr: 'جلابيات', labelEn: 'Jalabiyas', image: placeholderImg(1, 500, 600) },
  { id: 'dress', labelAr: 'فساتين محجبات', labelEn: 'Modest Dresses', image: placeholderImg(2, 500, 600) },
  { id: 'bakhour', labelAr: 'بخور', labelEn: 'Bakhour', image: placeholderImg(3, 500, 600) }
];

const DEFAULT_CARD_DESIGN = {
  cornerRadius: 16,        // px, 0 (sharp) - 32 (very round)
  imageAspect: '3/4',      // '1/1' | '3/4' | '4/3' | '4/5'
  hoverEffect: 'zoom',     // 'none' | 'zoom' | 'shadow' | 'lift'
  nameSize: 15,            // px
  priceSize: 15,           // px (regular price), sale price scales +2
  pricePosition: 'below',  // 'below' | 'beside'
  spacing: 12              // px gap between image and text block
};

/* ============================================================
   APP CONTEXT
   ============================================================ */
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

async function loadRemote(key, fallback) {
  try {
    const res = await window.storage?.get(key, false);
    if (res && res.value != null) return JSON.parse(res.value);
  } catch (e) {}
  return fallback;
}
async function saveRemote(key, val) {
  try { await window.storage?.set(key, JSON.stringify(val), false); } catch (e) {}
}

export default function App() {
  const [lang, setLang] = useState('ar');
  const [route, setRoute] = useState({ page: 'home' });
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [cardDesign, setCardDesign] = useState(DEFAULT_CARD_DESIGN);
  const [theme, setTheme] = useState(COLORS_DEFAULT);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
  const [currentUser, setCurrentUser] = useState(null);
  const [announcement, setAnnouncement] = useState(DEFAULT_ANNOUNCEMENT);
  const [discountCodes, setDiscountCodes] = useState(DEFAULT_DISCOUNT_CODES);
  const [reviews, setReviews] = useState(DEFAULT_REVIEWS);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);

  // Secret keyword listener: typing "joke33" anywhere opens the owner login
  useEffect(() => {
    let buffer = '';
    const onKey = (e) => {
      if (e.key.length > 1) return;
      buffer = (buffer + e.key).slice(-ADMIN_SECRET_CODE.length);
      if (buffer.toLowerCase() === ADMIN_SECRET_CODE) {
        setRoute({ page: 'ownerLogin' });
        buffer = '';
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Load persisted state once
  useEffect(() => {
    (async () => {
      const [p, l, th, s, o, acc, cats, cardDes, rev, disc, ann] = await Promise.all([
        fbGet(STORAGE_KEY_PRODUCTS, DEFAULT_PRODUCTS),
        fbGet(STORAGE_KEY_LAYOUT, DEFAULT_LAYOUT),
        fbGet(STORAGE_KEY_THEME, COLORS_DEFAULT),
        fbGet(STORAGE_KEY_SETTINGS, DEFAULT_SETTINGS),
        fbGet(STORAGE_KEY_ORDERS, []),
        fbGet(STORAGE_KEY_ACCOUNTS, DEFAULT_ACCOUNTS),
        fbGet(STORAGE_KEY_CATEGORIES, DEFAULT_CATEGORIES),
        fbGet(STORAGE_KEY_CARD_DESIGN, DEFAULT_CARD_DESIGN),
        fbGet(STORAGE_KEY_REVIEWS, DEFAULT_REVIEWS),
        fbGet(STORAGE_KEY_DISCOUNT_CODES, DEFAULT_DISCOUNT_CODES),
        fbGet(STORAGE_KEY_ANNOUNCEMENT, DEFAULT_ANNOUNCEMENT)
      ]);
      setProducts(p); setLayout(l); setTheme(th); setSettings(s); setOrders(o);
      setAccounts(acc); setCategories(cats); setCardDesign(cardDes);
      setReviews(rev); setDiscountCodes(disc); setAnnouncement(ann);
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (ready) fbSet(STORAGE_KEY_PRODUCTS, products); }, [products, ready]);
  useEffect(() => { if (ready) fbSet(STORAGE_KEY_LAYOUT, layout); }, [layout, ready]);
  useEffect(() => { if (ready) fbSet(STORAGE_KEY_THEME, theme); }, [theme, ready]);
  useEffect(() => { if (ready) fbSet(STORAGE_KEY_SETTINGS, settings); }, [settings, ready]);
  useEffect(() => { if (ready) fbSet(STORAGE_KEY_ORDERS, orders); }, [orders, ready]);
  useEffect(() => { if (ready) fbSet(STORAGE_KEY_ACCOUNTS, accounts); }, [accounts, ready]);
  useEffect(() => { if (ready) fbSet(STORAGE_KEY_CATEGORIES, categories); }, [categories, ready]);
  useEffect(() => { if (ready) fbSet(STORAGE_KEY_CARD_DESIGN, cardDesign); }, [cardDesign, ready]);
  useEffect(() => { if (ready) fbSet(STORAGE_KEY_REVIEWS, reviews); }, [reviews, ready]);
  useEffect(() => { if (ready) fbSet(STORAGE_KEY_DISCOUNT_CODES, discountCodes); }, [discountCodes, ready]);
  useEffect(() => { if (ready) fbSet(STORAGE_KEY_ANNOUNCEMENT, announcement); }, [announcement, ready]);

  const t = STR[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (c) => c.id === item.id && c.size === item.size && c.color === item.color
      );
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + item.qty };
        return copy;
      }
      return [...prev, item];
    });
    showToast(t.addedToCart);
  }, [t, showToast]);

  const updateCartQty = useCallback((idx, qty) => {
    setCart((prev) => {
      const copy = [...prev];
      if (qty <= 0) { copy.splice(idx, 1); }
      else { copy[idx] = { ...copy[idx], qty }; }
      return copy;
    });
  }, []);

  const removeFromCart = useCallback((idx) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const navigate = useCallback((page, params = {}) => {
    setRoute({ page, ...params });
    window.scrollTo?.({ top: 0, behavior: 'instant' });
  }, []);

  const ctxValue = {
    lang, setLang, t, dir, route, navigate,
    products, setProducts, layout, setLayout, categories, setCategories, cardDesign, setCardDesign, theme, setTheme,
    settings, setSettings, cart, setCart, addToCart, updateCartQty, removeFromCart,
    orders, setOrders, accounts, setAccounts, currentUser, setCurrentUser,
    announcement, setAnnouncement, discountCodes, setDiscountCodes, reviews, setReviews, showToast
  };

  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: COLORS_DEFAULT.beige, fontFamily: "'Cormorant Garamond', serif"
      }}>
        <GoogleFonts />
        <div style={{ fontSize: 28, letterSpacing: 3, color: COLORS_DEFAULT.primary }}>ZUMURRUD</div>
      </div>
    );
  }

  return (
    <AppCtx.Provider value={ctxValue}>
      <div dir={dir} style={{
        '--c-primary': theme.primary, '--c-primaryDark': theme.primaryDark,
        '--c-logo': theme.logo || theme.primary,
        '--c-beige': theme.beige, '--c-beigeDark': theme.beigeDark,
        '--c-pink': theme.pink, '--c-pinkDark': theme.pinkDark,
        '--c-text': theme.text, '--c-white': theme.white,
        fontFamily: lang === 'ar' ? "'Tajawal', sans-serif" : "'Cormorant Garamond', serif",
        background: theme.beige, color: theme.text, minHeight: '100vh'
      }}>
        <GoogleFonts />
        <GlobalStyles />
        {route.page === 'admin' ? <AdminApp /> : <StorefrontApp />}
        {toast && <Toast text={toast} />}
      </div>
    </AppCtx.Provider>
  );
}

function GoogleFonts() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Tajawal:wght@300;400;500;700;900&display=swap"
    />
  );
}

function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; }
      a { text-decoration: none; color: inherit; }
      button { cursor: pointer; font-family: inherit; }
      input, select, textarea { font-family: inherit; }
      ::selection { background: var(--c-pink); }
      .zm-serif { font-family: 'Cormorant Garamond', serif; }
      .zm-fadeup { animation: zmFadeUp .6s ease both; }
      @keyframes zmFadeUp { from { opacity:0; transform: translateY(16px);} to {opacity:1; transform:none;} }
      @media (prefers-reduced-motion: reduce) { .zm-fadeup { animation: none; } }
      .zm-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
      .zm-scrollbar::-webkit-scrollbar-thumb { background: var(--c-primary); border-radius: 4px; }
    `}</style>
  );
}

function Toast({ text }) {
  const { theme } = useApp();
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--c-primary)', color: 'var(--c-white)', padding: '12px 28px',
      borderRadius: 999, fontSize: 14, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,.2)',
      animation: 'zmFadeUp .3s ease both'
    }}>
      {text}
    </div>
  );
}

/* ============================================================
   STOREFRONT SHELL
   ============================================================ */
function StorefrontApp() {
  const { route, announcement } = useApp();
  return (
    <>
      {announcement.enabled && <AnnouncementBar />}
      <Header />
      <main>
        {route.page === 'home' && <HomePage />}
        {route.page === 'shop' && <ShopPage />}
        {route.page === 'product' && <ProductPage />}
        {route.page === 'cart' && <CartPage />}
        {route.page === 'checkout' && <CheckoutPage />}
        {route.page === 'orderSuccess' && <OrderSuccessPage />}
        {route.page === 'about' && <AboutPage />}
        {route.page === 'contact' && <ContactPage />}
        {route.page === 'ownerLogin' && <OwnerLoginPage />}
        {route.page === 'sizes' && <SizesPage />}
      </main>
      <Footer />
    </>
  );
}

function AnnouncementBar() {
  const { announcement, lang } = useApp();
  const text = lang === 'ar' ? announcement.text : (announcement.textEn || announcement.text);
  return (
    <div style={{
      background: announcement.bgColor || '#1f3b32', color: announcement.textColor || '#f3ecdf',
      overflow: 'hidden', whiteSpace: 'nowrap', padding: '10px 0', fontSize: 14, fontWeight: 500
    }}>
      <div style={{
        display: 'inline-block',
        animation: `zmMarquee ${announcement.speed || 30}s linear infinite`
      }}>
        {[...Array(4)].map((_, i) => <span key={i} style={{ padding: '0 60px' }}>{text}</span>)}
      </div>
      <style>{`
        @keyframes zmMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header() {
  const { t, lang, setLang, navigate, cart, route, categories, settings } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopExpanded, setShopExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { key: 'home', label: t.home },
    { key: 'shop', label: t.shop },
    { key: 'sizes', label: lang === 'ar' ? 'المقاسات' : 'Sizes' },
    { key: 'about', label: t.about },
    { key: 'contact', label: t.contact }
  ];

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100, background: 'var(--c-white)',
      borderBottom: '1px solid var(--c-beigeDark)',
      boxShadow: scrolled ? '0 4px 16px rgba(0,0,0,.06)' : 'none',
      transition: 'box-shadow .25s ease'
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: `${settings.headerPadding || 14}px 24px`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
      }}>
        <button onClick={() => setMenuOpen(true)} style={{
          display: 'none', background: 'none', border: 'none', fontSize: 24,
          color: 'var(--c-primary)'
        }} className="zm-menu-btn" aria-label={t.menu}>☰</button>

        <button onClick={() => navigate('home')} style={{
          background: 'none', border: 'none', fontFamily: "'Cormorant Garamond', serif",
          fontSize: settings.logoSize || 28, fontWeight: 600, letterSpacing: 3, color: 'var(--c-logo)'
        }}>ZUMURRUD</button>

        <nav style={{ display: 'flex', gap: 32, flex: 1, justifyContent: 'center' }} className="zm-nav-desktop">
          {navItems.map((item) => (
            <button key={item.key} onClick={() => navigate(item.key)} style={{
              background: 'none', border: 'none', fontSize: settings.navLinkSize || 15, fontWeight: 500,
              color: route.page === item.key ? 'var(--c-primary)' : 'var(--c-text)',
              borderBottom: route.page === item.key ? '2px solid var(--c-pinkDark)' : '2px solid transparent',
              paddingBottom: 4
            }}>{item.label}</button>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={{
            background: 'var(--c-beige)', border: '1px solid var(--c-beigeDark)', borderRadius: 999,
            padding: '6px 14px', fontSize: 13, fontWeight: 700, color: 'var(--c-primary)'
          }}>{lang === 'ar' ? 'EN' : 'AR'}</button>

          <button onClick={() => navigate('cart')} style={{
            background: 'none', border: 'none', position: 'relative', padding: 4
          }} aria-label={t.cart}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 8h12l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5L6 8z" stroke="var(--c-primary)" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="var(--c-pinkDark)" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: -2, insetInlineEnd: -4, background: 'var(--c-pinkDark)',
                color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 999,
                minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px'
              }}>{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200
        }} onClick={() => setMenuOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--c-white)', width: 280, height: '100%',
            padding: 24, display: 'flex', flexDirection: 'column', gap: 20
          }}>
            <button onClick={() => setMenuOpen(false)} style={{
              alignSelf: 'flex-end', background: 'none', border: 'none', fontSize: 22
            }}>✕</button>
            {navItems.map((item) => {
              if (item.key === 'shop') {
                return (
                  <div key="shop">
                    <button onClick={() => setShopExpanded((v) => !v)} style={{
                      background: 'none', border: 'none', fontSize: 18, textAlign: 'start',
                      color: 'var(--c-primary)', fontWeight: 500, display: 'flex', alignItems: 'center',
                      gap: 8, width: '100%', padding: 0
                    }}>
                      {item.label}
                      <span style={{ fontSize: 13 }}>{shopExpanded ? '▲' : '▼'}</span>
                    </button>
                    {shopExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14, paddingInlineStart: 14 }}>
                        <button onClick={() => { navigate('shop'); setMenuOpen(false); setShopExpanded(false); }} style={{
                          background: 'none', border: 'none', fontSize: 15, textAlign: 'start', color: 'var(--c-text)', opacity: .85
                        }}>{t.all}</button>
                        {categories.map((c) => (
                          <button key={c.id} onClick={() => { navigate('shop', { category: c.id }); setMenuOpen(false); setShopExpanded(false); }} style={{
                            background: 'none', border: 'none', fontSize: 15, textAlign: 'start', color: 'var(--c-text)', opacity: .85
                          }}>{lang === 'ar' ? c.labelAr : c.labelEn}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <button key={item.key} onClick={() => { navigate(item.key); setMenuOpen(false); }} style={{
                  background: 'none', border: 'none', fontSize: 18, textAlign: 'start',
                  color: 'var(--c-primary)', fontWeight: 500
                }}>{item.label}</button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .zm-nav-desktop { display: none !important; }
          .zm-menu-btn { display: block !important; }
        }
      `}</style>
    </header>
  );
}

/* ---------------- Social Icon ---------------- */
function SocialIcon({ href, title, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" title={title} style={{
      width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', transition: 'background .2s'
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,.28)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,.15)'}
    >
      {children}
    </a>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  const { t, lang, settings, categories, navigate } = useApp();
  return (
    <footer style={{ background: 'var(--c-primary)', color: 'var(--c-white)', marginTop: 60 }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '48px 24px 24px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32
      }}>
        <div>
          <div className="zm-serif" style={{ fontSize: 26, letterSpacing: 3, marginBottom: 12 }}>ZUMURRUD</div>
          <p style={{ fontSize: 14, opacity: .8, lineHeight: 1.8, maxWidth: 280 }}>
            {lang === 'ar' ? settings.taglineAr : settings.taglineEn}
          </p>
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>{t.shop}</div>
          {categories.map((c) => (
            <button key={c.id} onClick={() => navigate('shop', { category: c.id })} style={{
              display: 'block', background: 'none', border: 'none', color: 'var(--c-white)',
              opacity: .85, fontSize: 14, padding: '4px 0', textAlign: 'start'
            }}>{lang === 'ar' ? c.labelAr : c.labelEn}</button>
          ))}
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>{t.contact}</div>
          {settings.email && <div style={{ fontSize: 14, opacity: .85, marginBottom: 6 }}>{settings.email}</div>}
          {settings.whatsapp && <div style={{ fontSize: 14, opacity: .85, marginBottom: 10 }}>+{settings.whatsapp}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            {settings.whatsapp && (
              <SocialIcon href={`https://wa.me/${settings.whatsapp}`} title="WhatsApp">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.454a.5.5 0 0 0 .489.546h.046l5.78-1.515A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.9 9.9 0 0 1-5.031-1.367l-.36-.214-3.733.978.997-3.645-.235-.374A9.861 9.861 0 0 1 2.1 12C2.1 6.534 6.534 2.1 12 2.1S21.9 6.534 21.9 12 17.466 21.9 12 21.9z"/></svg>
              </SocialIcon>
            )}
            {settings.instagram && (
              <SocialIcon href={`https://instagram.com/${settings.instagram}`} title="Instagram">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
              </SocialIcon>
            )}
            {settings.facebook && (
              <SocialIcon href={settings.facebook} title="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
              </SocialIcon>
            )}
            {settings.tiktok && (
              <SocialIcon href={`https://tiktok.com/@${settings.tiktok}`} title="TikTok">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>
              </SocialIcon>
            )}
          </div>
        </div>
      </div>
      <div style={{
        borderTop: '1px solid rgba(255,255,255,.15)', padding: '16px 24px', textAlign: 'center',
        fontSize: 13, opacity: .7
      }}>
        © 2026 ZUMURRUD — {t.copyright}
      </div>
    </footer>
  );
}

/* ============================================================
   HOME PAGE (modular, order driven by layout state)
   ============================================================ */
function HomePage() {
  const { layout } = useApp();
  const sections = {
    slider: <HeroSlider />,
    categories: <CategoriesSection />,
    featured: <FeaturedSection />,
    banner: <PromoBanner />,
    newArrivals: <NewArrivalsSection />,
    about: <AboutTeaser />
  };
  return (
    <div>
      {layout.filter((s) => s.enabled).map((s) => (
        <div key={s.id}>{sections[s.id]}</div>
      ))}
    </div>
  );
}

function HeroSlider() {
  const { t, lang, navigate, settings } = useApp();
  const slides = [
    { img: placeholderImg(0, 1600, 900), titleAr: 'حيث تلتقي الأناقة بالهوية', titleEn: 'Where elegance meets identity' },
    { img: placeholderImg(2, 1600, 900), titleAr: 'تشكيلة العيد الجديدة', titleEn: 'The new Eid collection' },
    { img: placeholderImg(1, 1600, 900), titleAr: 'فخامة في كل تفصيلة', titleEn: 'Luxury in every detail' }
  ];
  const [idx, setIdx] = useState(0);
  const sliderH = settings.sliderHeight || 78;
  const titleSize = settings.sliderTitleSize || 52;
  const subSize = settings.sliderSubSize || 17;

  useEffect(() => {
    const tm = setInterval(() => setIdx((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(tm);
  }, []);
  return (
    <section style={{ position: 'relative', height: `${sliderH}vh`, minHeight: 420, overflow: 'hidden' }}>
      {slides.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0, backgroundImage: `url(${s.img})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === idx ? 1 : 0, transition: 'opacity 1s ease'
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(20,30,25,.55), rgba(20,30,25,.15))' }} />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, color: '#fff'
          }}>
            <h1 className="zm-serif zm-fadeup" style={{ fontSize: `clamp(28px, 6vw, ${titleSize}px)`, fontWeight: 600, margin: 0, maxWidth: 800 }}>
              {lang === 'ar' ? s.titleAr : s.titleEn}
            </h1>
            <p style={{ fontSize: subSize, marginTop: 16, opacity: .9, maxWidth: 560 }}>{t.heroSub}</p>
            <button onClick={() => navigate('shop')} style={{
              marginTop: 28, background: 'var(--c-pink)', color: 'var(--c-primaryDark)',
              border: 'none', padding: '14px 38px', borderRadius: 999, fontSize: 15, fontWeight: 700,
              letterSpacing: .5
            }}>{t.shopNow}</button>
          </div>
        </div>
      ))}
      <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 5 }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} style={{
            width: i === idx ? 24 : 8, height: 8, borderRadius: 999, border: 'none',
            background: i === idx ? 'var(--c-pink)' : 'rgba(255,255,255,.6)', transition: 'all .3s'
          }} />
        ))}
      </div>
    </section>
  );
}

function CategoriesSection() {
  const { t, lang, categories, navigate } = useApp();
  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 24px' }}>
      <SectionTitle>{t.shop}</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 32 }}>
        {categories.map((c) => {
          const label = lang === 'ar' ? c.labelAr : c.labelEn;
          return (
            <button key={c.id} onClick={() => navigate('shop', { category: c.id })} style={{
              border: 'none', background: 'none', padding: 0, position: 'relative', borderRadius: 16,
              overflow: 'hidden', aspectRatio: '3/4', cursor: 'pointer'
            }}>
              <img src={c.image || placeholderImg(0, 500, 600)} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(20,30,25,.7), transparent 55%)',
                display: 'flex', alignItems: 'flex-end', padding: 18
              }}>
                <span className="zm-serif" style={{ color: '#fff', fontSize: 22, fontWeight: 600 }}>{label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SectionTitle({ children, center }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'inherit' }}>
      <h2 className="zm-serif" style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 600, color: 'var(--c-primary)', margin: 0 }}>
        {children}
      </h2>
      <div style={{ width: 56, height: 3, background: 'var(--c-pinkDark)', marginTop: 10, borderRadius: 2, marginInline: center ? 'auto' : 0 }} />
    </div>
  );
}

function FeaturedSection() {
  const { t, products } = useApp();
  const featured = products.filter((p) => p.featured);
  if (!featured.length) return null;
  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 64px' }}>
      <SectionTitle center>{t.featuredProducts}</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 24, marginTop: 36 }}>
        {featured.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

function NewArrivalsSection() {
  const { t, products } = useApp();
  const recent = [...products].slice(-4).reverse();
  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 64px' }}>
      <SectionTitle center>{t.newArrivals}</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 24, marginTop: 36 }}>
        {recent.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

function PromoBanner() {
  const { lang, navigate } = useApp();
  return (
    <section style={{
      margin: '0 24px 64px', maxWidth: 1232, marginInline: 'auto', borderRadius: 20,
      background: 'linear-gradient(120deg, var(--c-primary), var(--c-primaryDark))',
      padding: '52px 40px', display: 'flex', flexWrap: 'wrap', alignItems: 'center',
      justifyContent: 'space-between', gap: 24, color: '#fff'
    }}>
      <div>
        <div style={{ color: 'var(--c-pink)', fontWeight: 700, letterSpacing: 2, fontSize: 13, marginBottom: 8 }}>
          {lang === 'ar' ? 'عرض محدود' : 'LIMITED TIME'}
        </div>
        <h3 className="zm-serif" style={{ fontSize: 'clamp(22px,3vw,34px)', margin: 0, fontWeight: 600 }}>
          {lang === 'ar' ? 'خصم يصل إلى ٢٠٪ على القطع المختارة' : 'Up to 20% off selected pieces'}
        </h3>
      </div>
      <button onClick={() => navigate('shop')} style={{
        background: 'var(--c-pink)', color: 'var(--c-primaryDark)', border: 'none',
        padding: '14px 32px', borderRadius: 999, fontWeight: 700, fontSize: 14
      }}>{lang === 'ar' ? 'تسوقي الآن' : 'Shop now'}</button>
    </section>
  );
}

function AboutTeaser() {
  const { t, navigate } = useApp();
  return (
    <section style={{
      maxWidth: 1280, margin: '0 auto', padding: '24px 24px 80px', display: 'grid',
      gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center'
    }} className="zm-about-teaser">
      <img src={placeholderImg(4, 700, 800)} alt="" style={{ width: '100%', borderRadius: 20, aspectRatio: '7/8', objectFit: 'cover' }} />
      <div>
        <SectionTitle>{t.ourStory}</SectionTitle>
        <p style={{ fontSize: 16, lineHeight: 2, marginTop: 20, opacity: .85, maxWidth: 480 }}>{t.aboutText}</p>
        <button onClick={() => navigate('about')} style={{
          marginTop: 18, background: 'none', border: '1.5px solid var(--c-primary)', color: 'var(--c-primary)',
          padding: '12px 28px', borderRadius: 999, fontWeight: 600, fontSize: 14
        }}>{t.about}</button>
      </div>
      <style>{`
        @media (max-width: 760px) { .zm-about-teaser { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

/* ---------------- Product Card ---------------- */
function ProductCard({ product }) {
  const { t, lang, navigate, cardDesign } = useApp();
  const [hovered, setHovered] = useState(false);
  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const onSale = product.salePrice != null;
  const d = cardDesign;

  const hoverStyle =
    d.hoverEffect === 'zoom' ? { transform: hovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform .35s ease' } :
    d.hoverEffect === 'shadow' ? { boxShadow: hovered ? '0 14px 30px rgba(0,0,0,.18)' : '0 0 0 rgba(0,0,0,0)', transition: 'box-shadow .3s ease' } :
    d.hoverEffect === 'lift' ? { transform: hovered ? 'translateY(-6px)' : 'translateY(0)', transition: 'transform .3s ease' } :
    {};

  const priceBlock = onSale ? (
    <>
      <span style={{ fontWeight: 700, color: 'var(--c-pinkDark)', fontSize: d.priceSize + 2 }}>{product.salePrice} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
      <span style={{ textDecoration: 'line-through', opacity: .5, fontSize: d.priceSize - 2 }}>{product.price}</span>
    </>
  ) : (
    <span style={{ fontWeight: 700, fontSize: d.priceSize }}>{product.price} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
  );

  return (
    <div
      style={{ cursor: 'pointer' }}
      onClick={() => navigate('product', { id: product.id })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        position: 'relative', borderRadius: d.cornerRadius, overflow: 'hidden',
        aspectRatio: d.imageAspect, background: 'var(--c-beigeDark)', ...hoverStyle
      }}>
        <img src={product.images[0]} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {onSale && (
          <span style={{
            position: 'absolute', top: 12, insetInlineStart: 12, background: 'var(--c-pinkDark)',
            color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999
          }}>{t.sale}</span>
        )}
        {product.stock === 0 && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--c-text)'
          }}>{t.outOfStock}</div>
        )}
      </div>
      <div style={{
        marginTop: d.spacing,
        display: d.pricePosition === 'beside' ? 'flex' : 'block',
        alignItems: d.pricePosition === 'beside' ? 'baseline' : undefined,
        justifyContent: d.pricePosition === 'beside' ? 'space-between' : undefined,
        gap: d.pricePosition === 'beside' ? 8 : 0
      }}>
        <div style={{ fontSize: d.nameSize, fontWeight: 500, marginBottom: d.pricePosition === 'below' ? 4 : 0 }}>{name}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          {priceBlock}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SHOP PAGE
   ============================================================ */
function ShopPage() {
  const { t, lang, route, products, categories, navigate } = useApp();
  const [category, setCategory] = useState(route.category || 'all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');

  useEffect(() => { setCategory(route.category || 'all'); }, [route.category]);

  let list = products.filter((p) => category === 'all' || p.category === category);
  if (search.trim()) {
    const s = search.trim().toLowerCase();
    list = list.filter((p) => p.nameAr.includes(search.trim()) || p.nameEn.toLowerCase().includes(s));
  }
  if (sort === 'priceLow') list = [...list].sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
  if (sort === 'priceHigh') list = [...list].sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));

  const filterOptions = [{ id: 'all', labelAr: t.all, labelEn: t.all }, ...categories];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 80px' }}>
      <SectionTitle>{t.shop}</SectionTitle>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 28, marginBottom: 36,
        alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filterOptions.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)} style={{
              border: '1px solid var(--c-beigeDark)', background: category === c.id ? 'var(--c-primary)' : 'var(--c-white)',
              color: category === c.id ? '#fff' : 'var(--c-text)', padding: '9px 18px', borderRadius: 999, fontSize: 14, fontWeight: 500
            }}>{lang === 'ar' ? c.labelAr : c.labelEn}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} style={{
            border: '1px solid var(--c-beigeDark)', borderRadius: 999, padding: '9px 16px', fontSize: 14, minWidth: 180
          }} />
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{
            border: '1px solid var(--c-beigeDark)', borderRadius: 999, padding: '9px 16px', fontSize: 14
          }}>
            <option value="newest">{t.newest}</option>
            <option value="priceLow">{t.priceLowHigh}</option>
            <option value="priceHigh">{t.priceHighLow}</option>
          </select>
        </div>
      </div>

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', opacity: .6 }}>{t.noResults}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 24 }}>
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PRODUCT DETAIL PAGE
   ============================================================ */
function ProductPage() {
  const { t, lang, route, products, addToCart, navigate, showToast } = useApp();
  const product = products.find((p) => p.id === route.id);
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => { setImgIdx(0); setSize(''); setColor(''); setQty(1); }, [route.id]);

  if (!product) return <div style={{ padding: 80, textAlign: 'center' }}>404</div>;

  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const desc = lang === 'ar' ? product.descAr : product.descEn;
  const onSale = product.salePrice != null;

  const handleAdd = () => {
    if ((product.sizes.length && !size) || (product.colors.length && !color)) {
      showToast(t.pleaseSelect);
      return;
    }
    addToCart({
      id: product.id, name, price: onSale ? product.salePrice : product.price,
      image: product.images[0], size, color, qty
    });
  };

  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 80px' }}>
      <button onClick={() => navigate('shop')} style={{
        background: 'none', border: 'none', color: 'var(--c-primary)', fontSize: 14, marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 6
      }}>{lang === 'ar' ? '→' : '←'} {t.backToShop}</button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }} className="zm-product-grid">
        <div>
          <div style={{ borderRadius: 18, overflow: 'hidden', aspectRatio: '3/4', marginBottom: 12 }}>
            <img src={product.images[imgIdx]} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {product.images.map((img, i) => (
              <button key={i} onClick={() => setImgIdx(i)} style={{
                width: 64, height: 80, borderRadius: 10, overflow: 'hidden', border: i === imgIdx ? '2px solid var(--c-pinkDark)' : '1px solid var(--c-beigeDark)',
                padding: 0, background: 'none'
              }}>
                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <h1 className="zm-serif" style={{ fontSize: 32, fontWeight: 600, margin: '0 0 12px', color: 'var(--c-primary)' }}>{name}</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 20 }}>
            {onSale ? (
              <>
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-pinkDark)' }}>{product.salePrice} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                <span style={{ textDecoration: 'line-through', opacity: .5 }}>{product.price} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
              </>
            ) : (
              <span style={{ fontSize: 24, fontWeight: 700 }}>{product.price} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
            )}
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.9, opacity: .85, marginBottom: 28 }}>{desc}</p>

          {product.sizes.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{t.selectSize}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {product.sizes.map((s) => (
                  <button key={s} onClick={() => setSize(s)} style={{
                    width: 46, height: 40, borderRadius: 8, border: size === s ? '2px solid var(--c-primary)' : '1px solid var(--c-beigeDark)',
                    background: size === s ? 'var(--c-primary)' : 'var(--c-white)', color: size === s ? '#fff' : 'var(--c-text)',
                    fontWeight: 600, fontSize: 14
                  }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {product.colors.length > 0 && (
            <div style={{ marginBottom: 26 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{t.selectColor}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {product.colors.map((c) => (
                  <button key={c} onClick={() => setColor(c)} style={{
                    width: 36, height: 36, borderRadius: '50%', background: c,
                    border: color === c ? '3px solid var(--c-pinkDark)' : '1px solid var(--c-beigeDark)'
                  }} />
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 26 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t.quantity}</div>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--c-beigeDark)', borderRadius: 8 }}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ background: 'none', border: 'none', width: 36, height: 36, fontSize: 18 }}>−</button>
              <span style={{ width: 32, textAlign: 'center', fontWeight: 600 }}>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} style={{ background: 'none', border: 'none', width: 36, height: 36, fontSize: 18 }}>+</button>
            </div>
          </div>

          <button disabled={product.stock === 0} onClick={handleAdd} style={{
            width: '100%', padding: '16px', borderRadius: 12, border: 'none',
            background: product.stock === 0 ? 'var(--c-beigeDark)' : 'var(--c-primary)', color: '#fff',
            fontWeight: 700, fontSize: 16, opacity: product.stock === 0 ? .6 : 1
          }}>{product.stock === 0 ? t.outOfStock : t.addToCart}</button>
        </div>
      </div>

      {related.length > 0 && (
        <div style={{ marginTop: 80 }}>
          <SectionTitle>{t.relatedProducts}</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 24, marginTop: 32 }}>
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      <ProductReviews productId={product.id} />

      <style>{`@media (max-width: 760px) { .zm-product-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

/* ============================================================
   PRODUCT REVIEWS
   ============================================================ */
function ProductReviews({ productId }) {
  const { lang, reviews, setReviews, showToast } = useApp();
  const productReviews = reviews.filter((r) => r.productId === productId);
  const avgRating = productReviews.length
    ? (productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length).toFixed(1)
    : null;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', rating: 5, text: '', image: '' });

  const submitReview = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.text.trim()) return;
    const review = {
      id: 'rev' + Date.now(), productId, name: form.name, rating: form.rating,
      text: form.text, image: form.image || null, date: new Date().toISOString()
    };
    setReviews((prev) => [review, ...prev]);
    setForm({ name: '', rating: 5, text: '', image: '' });
    setShowForm(false);
    showToast(lang === 'ar' ? 'شكراً على تقييمك!' : 'Thanks for your review!');
  };

  return (
    <div style={{ marginTop: 80, borderTop: '1px solid var(--c-beigeDark)', paddingTop: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <SectionTitle>{lang === 'ar' ? 'آراء العملاء' : 'Customer Reviews'}</SectionTitle>
          {avgRating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <StarRow rating={Math.round(avgRating)} />
              <span style={{ fontSize: 14, opacity: .75 }}>{avgRating} ({productReviews.length} {lang === 'ar' ? 'تقييم' : 'reviews'})</span>
            </div>
          )}
        </div>
        <button onClick={() => setShowForm((s) => !s)} style={{
          background: 'var(--c-primary)', color: '#fff', border: 'none', padding: '12px 24px',
          borderRadius: 999, fontWeight: 600, fontSize: 14
        }}>{showForm ? (lang === 'ar' ? 'إلغاء' : 'Cancel') : (lang === 'ar' ? '+ أضيفي تقييمك' : '+ Write a review')}</button>
      </div>

      {showForm && (
        <form onSubmit={submitReview} style={{
          marginTop: 24, background: 'var(--c-beige)', borderRadius: 16, padding: 24,
          display: 'flex', flexDirection: 'column', gap: 14
        }}>
          <Field label={lang === 'ar' ? 'اسمك' : 'Your name'} value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <div>
            <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>{lang === 'ar' ? 'تقييمك' : 'Your rating'}</label>
            <StarPicker value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
          </div>
          <div>
            <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>{lang === 'ar' ? 'رأيك' : 'Your review'}</label>
            <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} rows={3} style={{
              width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--c-beigeDark)', fontSize: 14, resize: 'vertical'
            }} />
          </div>
          <Field label={lang === 'ar' ? 'رابط صورة (اختياري)' : 'Image URL (optional)'} value={form.image} onChange={(v) => setForm((f) => ({ ...f, image: v }))} />
          <button type="submit" style={{
            background: 'var(--c-primary)', color: '#fff', border: 'none', padding: 13, borderRadius: 10, fontWeight: 700, alignSelf: 'flex-start', paddingInline: 28
          }}>{lang === 'ar' ? 'إرسال التقييم' : 'Submit review'}</button>
        </form>
      )}

      <div style={{ display: 'grid', gap: 16, marginTop: 28 }}>
        {productReviews.length === 0 && !showForm && (
          <div style={{ opacity: .55, fontSize: 14 }}>{lang === 'ar' ? 'لا توجد تقييمات بعد، كوني أول من يقيّم!' : 'No reviews yet. Be the first!'}</div>
        )}
        {productReviews.map((r) => (
          <div key={r.id} style={{ display: 'flex', gap: 14, paddingBottom: 16, borderBottom: '1px solid var(--c-beigeDark)' }}>
            {r.image && <img src={r.image} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <strong style={{ fontSize: 14 }}>{r.name}</strong>
                <StarRow rating={r.rating} small />
              </div>
              <p style={{ fontSize: 14, opacity: .85, margin: '6px 0 0', lineHeight: 1.7 }}>{r.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StarRow({ rating, small }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: small ? 13 : 16, color: i <= rating ? 'var(--c-pinkDark)' : 'var(--c-beigeDark)' }}>★</span>
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} style={{
          background: 'none', border: 'none', fontSize: 26, cursor: 'pointer',
          color: i <= value ? 'var(--c-pinkDark)' : 'var(--c-beigeDark)'
        }}>★</button>
      ))}
    </div>
  );
}

/* ============================================================
   CART PAGE
   ============================================================ */
function CartPage() {
  const { t, lang, cart, updateCartQty, removeFromCart, navigate, settings } = useApp();
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const shipping = cart.length === 0 ? 0 : subtotal >= settings.freeShippingOver ? 0 : settings.shippingFee;
  const total = subtotal + shipping;

  if (cart.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 24px' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🛍️</div>
        <h2 className="zm-serif" style={{ fontSize: 26, color: 'var(--c-primary)' }}>{t.emptyCart}</h2>
        <button onClick={() => navigate('shop')} style={{
          marginTop: 20, background: 'var(--c-primary)', color: '#fff', border: 'none',
          padding: '14px 32px', borderRadius: 999, fontWeight: 600
        }}>{t.continueShopping}</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
      <SectionTitle>{t.cart}</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40, marginTop: 32 }} className="zm-cart-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {cart.map((item, idx) => (
            <div key={idx} style={{
              display: 'flex', gap: 16, background: 'var(--c-white)', borderRadius: 14, padding: 14,
              border: '1px solid var(--c-beigeDark)'
            }}>
              <img src={item.image} alt={item.name} style={{ width: 84, height: 100, objectFit: 'cover', borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{item.name}</div>
                <div style={{ fontSize: 13, opacity: .7, display: 'flex', gap: 12 }}>
                  {item.size && <span>{t.size}: {item.size}</span>}
                  {item.color && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{t.color}: <i style={{ width: 14, height: 14, borderRadius: '50%', background: item.color, display: 'inline-block' }} /></span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--c-beigeDark)', borderRadius: 8 }}>
                    <button onClick={() => updateCartQty(idx, item.qty - 1)} style={{ background: 'none', border: 'none', width: 28, height: 28 }}>−</button>
                    <span style={{ width: 26, textAlign: 'center', fontSize: 14 }}>{item.qty}</span>
                    <button onClick={() => updateCartQty(idx, item.qty + 1)} style={{ background: 'none', border: 'none', width: 28, height: 28 }}>+</button>
                  </div>
                  <div style={{ fontWeight: 700 }}>{item.price * item.qty} {lang === 'ar' ? 'ج.م' : 'EGP'}</div>
                </div>
              </div>
              <button onClick={() => removeFromCart(idx)} style={{
                background: 'none', border: 'none', color: 'var(--c-pinkDark)', fontSize: 13, alignSelf: 'flex-start'
              }}>✕</button>
            </div>
          ))}
        </div>

        <div style={{
          background: 'var(--c-white)', borderRadius: 16, padding: 24, border: '1px solid var(--c-beigeDark)',
          alignSelf: 'flex-start'
        }}>
          <h3 className="zm-serif" style={{ fontSize: 20, margin: '0 0 18px', color: 'var(--c-primary)' }}>{t.orderSummary}</h3>
          <Row label={t.subtotal} value={`${subtotal} ${lang === 'ar' ? 'ج.م' : 'EGP'}`} />
          <Row label={t.shipping} value={shipping === 0 ? t.freeShipping : `${shipping} ${lang === 'ar' ? 'ج.م' : 'EGP'}`} />
          <div style={{ borderTop: '1px solid var(--c-beigeDark)', margin: '12px 0' }} />
          <Row label={t.total} value={`${total} ${lang === 'ar' ? 'ج.م' : 'EGP'}`} bold />
          <button onClick={() => navigate('checkout')} style={{
            width: '100%', marginTop: 18, background: 'var(--c-primary)', color: '#fff', border: 'none',
            padding: 15, borderRadius: 12, fontWeight: 700, fontSize: 15
          }}>{t.checkout}</button>
        </div>
      </div>
      <style>{`@media (max-width: 760px) { .zm-cart-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: bold ? 700 : 400, fontSize: bold ? 17 : 14 }}>
      <span style={{ opacity: bold ? 1 : .75 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/* ============================================================
   CHECKOUT PAGE
   ============================================================ */
function CheckoutPage() {
  const { t, lang, cart, settings, navigate, setOrders, setCart, discountCodes, showToast } = useApp();
  const [form, setForm] = useState({ name: '', phone: '', address: '', governorate: '', notes: '', transferRef: '' });
  const [errors, setErrors] = useState({});
  const [discountInput, setDiscountInput] = useState('');
  const [discount, setDiscount] = useState(null);
  const [discountErr, setDiscountErr] = useState('');
  const [step, setStep] = useState(1); // 1=details, 2=payment

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const shipping = subtotal >= settings.freeShippingOver ? 0 : settings.shippingFee;
  const discountAmt = discount ? (discount.type === 'percent' ? Math.round(subtotal * discount.value / 100) : discount.value) : 0;
  const total = subtotal + shipping - discountAmt;
  const deposit = Math.ceil(total / 2);
  const currency = lang === 'ar' ? 'ج.م' : 'EGP';

  const handleChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const applyDiscount = () => {
    const found = discountCodes.find((c) => c.code.toUpperCase() === discountInput.toUpperCase() && c.active);
    if (found) { setDiscount(found); setDiscountErr(''); showToast(lang === 'ar' ? 'تم تطبيق الكود!' : 'Code applied!'); }
    else setDiscountErr(lang === 'ar' ? 'كود غير صحيح أو منتهي' : 'Invalid or expired code');
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    const errs = {};
    ['name', 'phone', 'address', 'governorate'].forEach((k) => { if (!form[k].trim()) errs[k] = true; });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.transferRef.trim()) { setErrors((err) => ({ ...err, transferRef: true })); return; }
    const order = {
      id: 'ORD' + Date.now().toString().slice(-6),
      date: new Date().toISOString(),
      customer: form, items: cart, subtotal, shipping, discountAmt, total,
      deposit, discountCode: discount?.code || null,
      status: 'awaitingDeposit'
    };
    setOrders((prev) => [order, ...prev]);
    setCart([]);
    navigate('orderSuccess', { orderId: order.id });
  };

  if (cart.length === 0) return (
    <div style={{ textAlign: 'center', padding: '100px 24px' }}>
      <h2 className="zm-serif" style={{ color: 'var(--c-primary)' }}>{t.emptyCart}</h2>
      <button onClick={() => navigate('shop')} style={{ marginTop: 16, background: 'var(--c-primary)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 999 }}>{t.continueShopping}</button>
    </div>
  );

  const OrderSummaryBox = () => (
    <div style={{ background: 'var(--c-white)', borderRadius: 16, padding: 24, border: '1px solid var(--c-beigeDark)', alignSelf: 'flex-start' }}>
      <h3 className="zm-serif" style={{ fontSize: 20, margin: '0 0 18px', color: 'var(--c-primary)' }}>{t.orderSummary}</h3>
      {cart.map((item, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', opacity: .85 }}>
          <span>{item.name} × {item.qty}</span><span>{item.price * item.qty}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid var(--c-beigeDark)', margin: '12px 0' }} />
      <Row label={t.subtotal} value={`${subtotal} ${currency}`} />
      {discountAmt > 0 && <Row label={lang === 'ar' ? `خصم (${discount.code})` : `Discount (${discount.code})`} value={`- ${discountAmt} ${currency}`} />}
      <Row label={t.shipping} value={shipping === 0 ? t.freeShipping : `${shipping} ${currency}`} />
      <div style={{ borderTop: '1px solid var(--c-beigeDark)', margin: '12px 0' }} />
      <Row label={t.total} value={`${total} ${currency}`} bold />
      <div style={{ marginTop: 12, padding: 12, background: 'var(--c-beige)', borderRadius: 10, fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: 'var(--c-primary)', marginBottom: 4 }}>
          {lang === 'ar' ? `الديبوزت المطلوب: ${deposit} ${currency}` : `Required deposit: ${deposit} ${currency}`}
        </div>
        <div style={{ opacity: .7 }}>
          {lang === 'ar' ? 'يتم تأكيد الطلب بعد استلام الديبوزت' : 'Order confirmed after deposit is received'}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
      <SectionTitle>{t.checkout}</SectionTitle>

      {/* Step 1: Details */}
      {step === 1 && (
        <form onSubmit={handleStep1} style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40, marginTop: 32 }} className="zm-cart-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label={t.name} value={form.name} onChange={(v) => handleChange('name', v)} error={errors.name} />
            <Field label={t.phone} value={form.phone} onChange={(v) => handleChange('phone', v)} error={errors.phone} type="tel" />
            <Field label={t.address} value={form.address} onChange={(v) => handleChange('address', v)} error={errors.address} />
            <div>
              <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>{t.governorate}</label>
              <select value={form.governorate} onChange={(e) => handleChange('governorate', e.target.value)} style={{
                width: '100%', padding: 12, borderRadius: 10, border: errors.governorate ? '1.5px solid var(--c-pinkDark)' : '1px solid var(--c-beigeDark)', fontSize: 14
              }}>
                <option value="">—</option>
                {t.governorateList.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>{t.notes}</label>
              <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={3} style={{
                width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--c-beigeDark)', fontSize: 14, resize: 'vertical'
              }} />
            </div>

            {/* Discount code */}
            <div>
              <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                {lang === 'ar' ? 'كود الخصم (اختياري)' : 'Discount code (optional)'}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={discountInput} onChange={(e) => { setDiscountInput(e.target.value); setDiscountErr(''); }} style={{
                  flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--c-beigeDark)', fontSize: 14
                }} placeholder={lang === 'ar' ? 'مثال: ZUMURRUD15' : 'e.g. ZUMURRUD15'} />
                <button type="button" onClick={applyDiscount} style={{
                  background: discount ? 'var(--c-pinkDark)' : 'var(--c-primary)', color: '#fff', border: 'none',
                  padding: '0 18px', borderRadius: 10, fontWeight: 600, fontSize: 14
                }}>{discount ? '✓' : (lang === 'ar' ? 'تطبيق' : 'Apply')}</button>
              </div>
              {discountErr && <div style={{ color: 'var(--c-pinkDark)', fontSize: 12, marginTop: 4 }}>{discountErr}</div>}
            </div>

            <button type="submit" style={{
              background: 'var(--c-primary)', color: '#fff', border: 'none', padding: 15, borderRadius: 12, fontWeight: 700, fontSize: 15
            }}>{lang === 'ar' ? 'التالي: الدفع ←' : 'Next: Payment →'}</button>
          </div>
          <OrderSummaryBox />
        </form>
      )}

      {/* Step 2: Payment (Vodafone Cash deposit) */}
      {step === 2 && (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40, marginTop: 32 }} className="zm-cart-grid">
          <div>
            <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--c-primary)', marginBottom: 20, fontSize: 14 }}>
              {lang === 'ar' ? '→ رجوع' : '← Back'}
            </button>

            <div style={{ background: 'var(--c-beige)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', color: 'var(--c-primary)', fontSize: 18, fontWeight: 700 }}>
                {lang === 'ar' ? 'تعليمات الدفع' : 'Payment Instructions'}
              </h3>
              <div style={{ fontSize: 15, lineHeight: 2 }}>
                <div>1. {lang === 'ar' ? 'حولي الديبوزت:' : 'Transfer the deposit:'} <strong>{deposit} {currency}</strong></div>
                <div>2. {lang === 'ar' ? 'على فودافون كاش:' : 'Via Vodafone Cash:'} <strong style={{ fontSize: 18, color: 'var(--c-primary)' }}>{settings.vodafoneCash || '01X-XXXX-XXXX'}</strong></div>
                <div>3. {lang === 'ar' ? 'احتفظي برقم العملية وادخليه تحت' : 'Keep your transaction reference and enter it below'}</div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                {lang === 'ar' ? 'رقم عملية التحويل *' : 'Transfer reference number *'}
              </label>
              <input value={form.transferRef} onChange={(e) => handleChange('transferRef', e.target.value)} style={{
                width: '100%', padding: 14, borderRadius: 10, fontSize: 15,
                border: errors.transferRef ? '1.5px solid var(--c-pinkDark)' : '1px solid var(--c-beigeDark)'
              }} placeholder={lang === 'ar' ? 'ادخلي رقم العملية من فودافون كاش' : 'Enter your Vodafone Cash transaction ID'} />
              {errors.transferRef && <div style={{ color: 'var(--c-pinkDark)', fontSize: 12, marginTop: 4 }}>
                {lang === 'ar' ? 'برجاء ادخال رقم العملية' : 'Please enter the transaction reference'}
              </div>}
            </div>

            <button type="submit" style={{
              width: '100%', marginTop: 20, background: 'var(--c-primary)', color: '#fff', border: 'none',
              padding: 15, borderRadius: 12, fontWeight: 700, fontSize: 15
            }}>{t.placeOrder}</button>
          </div>
          <OrderSummaryBox />
        </form>
      )}
      <style>{`@media (max-width: 760px) { .zm-cart-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function Field({ label, value, onChange, error, type = 'text' }) {
  const { t } = useApp();
  return (
    <div>
      <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={{
        width: '100%', padding: 12, borderRadius: 10, border: error ? '1.5px solid var(--c-pinkDark)' : '1px solid var(--c-beigeDark)', fontSize: 14
      }} />
      {error && <div style={{ color: 'var(--c-pinkDark)', fontSize: 12, marginTop: 4 }}>{t.requiredField}</div>}
    </div>
  );
}

function OrderSuccessPage() {
  const { t, route, navigate } = useApp();
  return (
    <div style={{ textAlign: 'center', padding: '100px 24px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✓</div>
      <h2 className="zm-serif" style={{ fontSize: 28, color: 'var(--c-primary)' }}>{t.orderPlaced}</h2>
      <p style={{ opacity: .75, marginTop: 8 }}>{t.orderPlacedSub}</p>
      <div style={{ marginTop: 8, fontWeight: 700 }}>#{route.orderId}</div>
      <button onClick={() => navigate('home')} style={{
        marginTop: 24, background: 'var(--c-primary)', color: '#fff', border: 'none',
        padding: '14px 32px', borderRadius: 999, fontWeight: 600
      }}>{t.backToHome}</button>
    </div>
  );
}

/* ============================================================
   ABOUT / CONTACT
   ============================================================ */
function AboutPage() {
  const { t } = useApp();
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px 100px', textAlign: 'center' }}>
      <img src={placeholderImg(4, 900, 500)} alt="" style={{ width: '100%', borderRadius: 20, aspectRatio: '16/9', objectFit: 'cover', marginBottom: 36 }} />
      <SectionTitle center>{t.ourStory}</SectionTitle>
      <p style={{ fontSize: 17, lineHeight: 2.1, opacity: .85, marginTop: 24 }}>{t.aboutText}</p>
    </div>
  );
}

function SizesPage() {
  const { lang } = useApp();
  const sizes = [
    { size: '52', lengthIn: 52, lengthCm: 132, widthIn: 23, widthCm: 58, sleeveIn: 23, sleeveCm: 58 },
    { size: '54', lengthIn: 54, lengthCm: 137, widthIn: 24, widthCm: 60, sleeveIn: 24, sleeveCm: 60 },
    { size: '56', lengthIn: 56, lengthCm: 142, widthIn: 25, widthCm: 63, sleeveIn: 24.5, sleeveCm: 62 },
    { size: '58', lengthIn: 58, lengthCm: 147, widthIn: 26, widthCm: 66, sleeveIn: 25, sleeveCm: 64 },
    { size: '60', lengthIn: 60, lengthCm: 152, widthIn: 27, widthCm: 70, sleeveIn: 26, sleeveCm: 66 }
  ];
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px 100px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div className="zm-serif" style={{ fontSize: 13, letterSpacing: 4, color: 'var(--c-primary)', opacity: .7, marginBottom: 8 }}>ZUMURRUD ABAYAS</div>
        <h1 className="zm-serif" style={{ fontSize: 42, color: 'var(--c-primary)', margin: 0 }}>
          {lang === 'ar' ? 'جدول المقاسات' : 'Size Chart'}
        </h1>
        <div style={{ width: 56, height: 3, background: 'var(--c-pinkDark)', margin: '16px auto 0', borderRadius: 2 }} />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--c-primary)' }}>
              <th style={th_}>{lang === 'ar' ? 'المقاس' : 'Size'}</th>
              <th style={th_} colSpan="2">{lang === 'ar' ? 'الطول' : 'Length'}</th>
              <th style={th_} colSpan="2">{lang === 'ar' ? 'العرض' : 'Width'}</th>
              <th style={th_} colSpan="2">{lang === 'ar' ? 'طول الكم' : 'Sleeve'}</th>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--c-beigeDark)' }}>
              <th style={th_}></th>
              <th style={{ ...th_, fontSize: 12, opacity: .65 }}>{lang === 'ar' ? 'إنش' : 'inch'}</th>
              <th style={{ ...th_, fontSize: 12, opacity: .65 }}>{lang === 'ar' ? 'سم' : 'cm'}</th>
              <th style={{ ...th_, fontSize: 12, opacity: .65 }}>{lang === 'ar' ? 'إنش' : 'inch'}</th>
              <th style={{ ...th_, fontSize: 12, opacity: .65 }}>{lang === 'ar' ? 'سم' : 'cm'}</th>
              <th style={{ ...th_, fontSize: 12, opacity: .65 }}>{lang === 'ar' ? 'إنش' : 'inch'}</th>
              <th style={{ ...th_, fontSize: 12, opacity: .65 }}>{lang === 'ar' ? 'سم' : 'cm'}</th>
            </tr>
          </thead>
          <tbody>
            {sizes.map((row, i) => (
              <tr key={row.size} style={{ background: i % 2 === 0 ? 'var(--c-white)' : 'var(--c-beige)', borderBottom: '1px solid var(--c-beigeDark)' }}>
                <td style={{ ...td_, fontWeight: 700, color: 'var(--c-primary)' }}>{row.size}</td>
                <td style={td_}>{row.lengthIn}</td>
                <td style={td_}>{row.lengthCm}</td>
                <td style={td_}>{row.widthIn}</td>
                <td style={td_}>{row.widthCm}</td>
                <td style={td_}>{row.sleeveIn}</td>
                <td style={td_}>{row.sleeveCm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 32, padding: 20, background: 'var(--c-beige)', borderRadius: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--c-primary)' }}>
          {lang === 'ar' ? 'الطول يقاس من الكتف' : 'Length is measured from the shoulder'}
        </div>
        <div style={{ fontSize: 13, opacity: .75, lineHeight: 1.8 }}>
          {lang === 'ar' ? '• القياسات تقريبية وقد تختلف بحسب التصميم' : '• Measurements are approximate and may vary by design'}
        </div>
        <div style={{ fontSize: 13, opacity: .75 }}>
          {lang === 'ar' ? '• يُنصح بأخذ المقاسات الشخصية قبل الطلب' : '• We recommend taking personal measurements before ordering'}
        </div>
      </div>
    </div>
  );
}

const th_ = { padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: 14, color: 'var(--c-primary)' };
const td_ = { padding: '14px 16px', textAlign: 'center', fontSize: 14 };

function ContactPage() {
  const { t, lang, settings } = useApp();
  const [form, setForm] = useState({ name: '', message: '' });
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px 100px' }}>
      <SectionTitle center>{t.getInTouch}</SectionTitle>

      {/* Social icons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
        {settings.whatsapp && (
          <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'var(--c-primary)', color: '#fff',
            padding: '12px 20px', borderRadius: 999, fontWeight: 600, fontSize: 14
          }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.454a.5.5 0 0 0 .489.546h.046l5.78-1.515A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.9 9.9 0 0 1-5.031-1.367l-.36-.214-3.733.978.997-3.645-.235-.374A9.861 9.861 0 0 1 2.1 12C2.1 6.534 6.534 2.1 12 2.1S21.9 6.534 21.9 12 17.466 21.9 12 21.9z"/></svg>
            WhatsApp
          </a>
        )}
        {settings.instagram && (
          <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
            color: '#fff', padding: '12px 20px', borderRadius: 999, fontWeight: 600, fontSize: 14
          }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
            Instagram
          </a>
        )}
        {settings.facebook && (
          <a href={settings.facebook} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 8, background: '#1877f2',
            color: '#fff', padding: '12px 20px', borderRadius: 999, fontWeight: 600, fontSize: 14
          }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
            Facebook
          </a>
        )}
        {settings.tiktok && (
          <a href={`https://tiktok.com/@${settings.tiktok}`} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 8, background: '#010101',
            color: '#fff', padding: '12px 20px', borderRadius: 999, fontWeight: 600, fontSize: 14
          }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>
            TikTok
          </a>
        )}
        {settings.email && (
          <a href={`mailto:${settings.email}`} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'var(--c-white)',
            border: '1px solid var(--c-beigeDark)', color: 'var(--c-text)',
            padding: '12px 20px', borderRadius: 999, fontWeight: 600, fontSize: 14
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            {settings.email}
          </a>
        )}
      </div>

      {/* Message form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 40 }}>
        <Field label={t.name} value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>{t.yourMessage}</label>
          <textarea rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} style={{
            width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--c-beigeDark)', fontSize: 14, resize: 'vertical'
          }} />
        </div>
        <button onClick={() => settings.whatsapp && window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(form.name + ': ' + form.message)}`, '_blank')} style={{
          background: 'var(--c-primary)', color: '#fff', border: 'none', padding: 15, borderRadius: 12, fontWeight: 700, fontSize: 15
        }}>{t.sendMessage}</button>
      </div>
    </div>
  );
}

/* ============================================================
   OWNER LOGIN
   ============================================================ */
function OwnerLoginPage() {
  const { t, accounts, setCurrentUser, navigate } = useApp();
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const account = accounts.find(
      (a) => a.email.trim().toLowerCase() === email.trim().toLowerCase() && a.password === pwd
    );
    if (account) {
      setCurrentUser(account);
      navigate('admin');
    } else {
      setErr(true);
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: '0 auto', padding: '100px 24px' }}>
      <h2 className="zm-serif" style={{ textAlign: 'center', color: 'var(--c-primary)', fontSize: 28 }}>{t.ownerLogin}</h2>
      <form onSubmit={handleSubmit} style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input type="email" placeholder={t.ownerEmail} value={email} onChange={(e) => { setEmail(e.target.value); setErr(false); }} style={{
          padding: 14, borderRadius: 10, border: err ? '1.5px solid var(--c-pinkDark)' : '1px solid var(--c-beigeDark)', fontSize: 15
        }} />
        <input type="password" placeholder={t.password} value={pwd} onChange={(e) => { setPwd(e.target.value); setErr(false); }} style={{
          padding: 14, borderRadius: 10, border: err ? '1.5px solid var(--c-pinkDark)' : '1px solid var(--c-beigeDark)', fontSize: 15
        }} />
        {err && <div style={{ color: 'var(--c-pinkDark)', fontSize: 13 }}>{t.wrongPassword}</div>}
        <button type="submit" style={{
          background: 'var(--c-primary)', color: '#fff', border: 'none', padding: 14, borderRadius: 10, fontWeight: 700
        }}>{t.login}</button>
      </form>
    </div>
  );
}

/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */
function AdminApp() {
  const { t, lang, currentUser, navigate, setCurrentUser } = useApp();
  const [tab, setTab] = useState('products');

  if (!currentUser) {
    navigate('ownerLogin');
    return null;
  }

  const tabs = [
    { key: 'products', label: t.products, icon: '👗' },
    { key: 'categories', label: lang === 'ar' ? 'الفئات' : 'Categories', icon: '🏷️' },
    { key: 'cardDesign', label: lang === 'ar' ? 'تصميم الكارت' : 'Card design', icon: '🖼️' },
    { key: 'layout', label: t.layout, icon: '🧩' },
    { key: 'theme', label: t.themeColors, icon: '🎨' },
    { key: 'orders', label: t.orders, icon: '📦' },
    { key: 'settings', label: t.settings, icon: '⚙️' },
    { key: 'team', label: t.team, icon: '👤' },
    { key: 'announcement', label: lang === 'ar' ? 'شريط الإعلانات' : 'Announcement bar', icon: '📢' },
    { key: 'discounts', label: lang === 'ar' ? 'أكواد الخصم' : 'Discount codes', icon: '🏷️' },
    { key: 'reviews', label: lang === 'ar' ? 'تقييمات العملاء' : 'Customer reviews', icon: '⭐' }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }} className="zm-admin-shell">
      <aside style={{
        width: 240, background: 'var(--c-primaryDark)', color: '#fff', padding: 24,
        display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0
      }}>
        <div className="zm-serif" style={{ fontSize: 24, letterSpacing: 2, marginBottom: 24 }}>ZUMURRUD</div>
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)} style={{
            background: tab === tb.key ? 'rgba(255,255,255,.12)' : 'none', border: 'none', color: '#fff',
            textAlign: 'start', padding: '12px 14px', borderRadius: 10, fontSize: 14, fontWeight: 500,
            display: 'flex', gap: 10, alignItems: 'center'
          }}><span>{tb.icon}</span>{tb.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate('home')} style={{
          background: 'none', border: '1px solid rgba(255,255,255,.25)', color: '#fff', padding: '12px 14px',
          borderRadius: 10, fontSize: 14
        }}>{t.backToSite}</button>
        <button onClick={() => { setCurrentUser(null); navigate('home'); }} style={{
          background: 'none', border: 'none', color: 'var(--c-pink)', padding: '12px 14px', fontSize: 14
        }}>{t.logout}</button>
      </aside>

      <main style={{ flex: 1, padding: 32, overflowX: 'auto' }}>
        {tab === 'products' && <AdminProducts />}
        {tab === 'categories' && <AdminCategories />}
        {tab === 'cardDesign' && <AdminCardDesign />}
        {tab === 'layout' && <AdminLayout />}
        {tab === 'theme' && <AdminTheme />}
        {tab === 'orders' && <AdminOrders />}
        {tab === 'settings' && <AdminSettings />}
        {tab === 'team' && <AdminTeam />}
        {tab === 'announcement' && <AdminAnnouncement />}
        {tab === 'discounts' && <AdminDiscounts />}
        {tab === 'reviews' && <AdminReviews />}
      </main>

      <style>{`
        @media (max-width: 800px) {
          .zm-admin-shell { flex-direction: column; }
          .zm-admin-shell aside { width: 100% !important; flex-direction: row !important; flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}

function AdminCard({ children }) {
  return (
    <div style={{ background: 'var(--c-white)', borderRadius: 16, border: '1px solid var(--c-beigeDark)', padding: 24 }}>
      {children}
    </div>
  );
}

/* ---------------- Admin: Products ---------------- */
function AdminProducts() {
  const { t, lang, products, setProducts, categories } = useApp();
  const [editing, setEditing] = useState(null); // product object or 'new'
  const catLabel = (id) => {
    const c = categories.find((cat) => cat.id === id);
    if (!c) return id;
    return lang === 'ar' ? c.labelAr : c.labelEn;
  };

  const blankProduct = {
    id: '', nameAr: '', nameEn: '', category: categories[0]?.id || '', price: '', salePrice: '',
    descAr: '', descEn: '', colors: [], sizes: [], images: [], featured: false, stock: 10
  };

  const handleDelete = (id) => {
    if (window.confirm?.(lang === 'ar' ? 'تأكيد الحذف؟' : 'Confirm delete?') ?? true) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleSave = (prod) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === prod.id);
      if (exists) return prev.map((p) => (p.id === prod.id ? prod : p));
      return [...prev, prod];
    });
    setEditing(null);
  };

  if (editing) {
    return <ProductEditor product={editing === 'new' ? blankProduct : editing} onSave={handleSave} onCancel={() => setEditing(null)} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="zm-serif" style={{ fontSize: 26, color: 'var(--c-primary)', margin: 0 }}>{t.products}</h2>
        <button onClick={() => setEditing('new')} style={{
          background: 'var(--c-primary)', color: '#fff', border: 'none', padding: '12px 22px', borderRadius: 10, fontWeight: 600
        }}>+ {t.addProduct}</button>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {products.map((p) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 16, background: 'var(--c-white)', borderRadius: 14,
            border: '1px solid var(--c-beigeDark)', padding: 14
          }}>
            <img src={p.images[0]} alt="" style={{ width: 56, height: 70, objectFit: 'cover', borderRadius: 8 }} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 600 }}>{lang === 'ar' ? p.nameAr : p.nameEn}</div>
              <div style={{ fontSize: 13, opacity: .65 }}>{catLabel(p.category)} · {t.stock}: {p.stock}</div>
            </div>
            <div style={{ fontWeight: 700, minWidth: 90 }}>
              {p.salePrice ? <span style={{ color: 'var(--c-pinkDark)' }}>{p.salePrice}</span> : p.price} {lang === 'ar' ? 'ج.م' : 'EGP'}
            </div>
            {p.featured && <span style={{ fontSize: 11, background: 'var(--c-beige)', padding: '4px 10px', borderRadius: 999 }}>★ {t.featuredProduct}</span>}
            <button onClick={() => setEditing(p)} style={{
              background: 'var(--c-beige)', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600
            }}>{t.editProduct}</button>
            <button onClick={() => handleDelete(p.id)} style={{
              background: 'none', border: '1px solid var(--c-pinkDark)', color: 'var(--c-pinkDark)', padding: '8px 16px', borderRadius: 8, fontSize: 13
            }}>{t.deleteProduct}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductEditor({ product, onSave, onCancel }) {
  const { t, lang, categories } = useApp();
  const [form, setForm] = useState({
    ...product,
    colors: (product.colors || []).join(', '),
    sizes: (product.sizes || []).join(', '),
    images: (product.images || []).join(', ')
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const id = form.id || ('p' + Date.now());
    onSave({
      ...form,
      id,
      price: Number(form.price) || 0,
      salePrice: form.salePrice === '' || form.salePrice == null ? null : Number(form.salePrice),
      stock: Number(form.stock) || 0,
      colors: form.colors.split(',').map((s) => s.trim()).filter(Boolean),
      sizes: form.sizes.split(',').map((s) => s.trim()).filter(Boolean),
      images: form.images.split(',').map((s) => s.trim()).filter(Boolean) || [placeholderImg(0)]
    });
  };

  return (
    <AdminCard>
      <h2 className="zm-serif" style={{ fontSize: 24, color: 'var(--c-primary)', marginTop: 0 }}>
        {product.id ? t.editProduct : t.addProduct}
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <AdminField label={t.productName} value={form.nameAr} onChange={(v) => set('nameAr', v)} />
        <AdminField label={t.productNameEn} value={form.nameEn} onChange={(v) => set('nameEn', v)} />
        <div>
          <label style={lbl}>{t.category}</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} style={inp}>
            {categories.map((c) => <option key={c.id} value={c.id}>{lang === 'ar' ? c.labelAr : c.labelEn}</option>)}
          </select>
        </div>
        <AdminField label={t.stock} value={form.stock} onChange={(v) => set('stock', v)} type="number" />
        <AdminField label={t.regularPrice} value={form.price} onChange={(v) => set('price', v)} type="number" />
        <AdminField label={t.onSale} value={form.salePrice} onChange={(v) => set('salePrice', v)} type="number" />
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={lbl}>{t.description}</label>
          <textarea value={form.descAr} onChange={(e) => set('descAr', e.target.value)} rows={3} style={inp} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={lbl}>{t.descriptionEn}</label>
          <textarea value={form.descEn} onChange={(e) => set('descEn', e.target.value)} rows={3} style={inp} />
        </div>
        <AdminField label={t.colors} value={form.colors} onChange={(v) => set('colors', v)} full />
        <AdminField label={t.sizes} value={form.sizes} onChange={(v) => set('sizes', v)} full />
        <AdminField label={t.images} value={form.images} onChange={(v) => set('images', v)} full />
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, gridColumn: '1 / -1' }}>
          <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
          {t.featuredProduct}
        </label>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="submit" style={{ background: 'var(--c-primary)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 700 }}>{t.save}</button>
          <button type="button" onClick={onCancel} style={{ background: 'none', border: '1px solid var(--c-beigeDark)', padding: '12px 28px', borderRadius: 10 }}>{t.cancel}</button>
        </div>
      </form>
    </AdminCard>
  );
}

const lbl = { fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 };
const inp = { width: '100%', padding: 11, borderRadius: 8, border: '1px solid var(--c-beigeDark)', fontSize: 14 };

function AdminField({ label, value, onChange, type = 'text', full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <label style={lbl}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inp} />
    </div>
  );
}

/* ---------------- Admin: Layout (drag & drop) ---------------- */
function AdminLayout() {
  const { t, lang, layout, setLayout } = useApp();
  const dragIdx = useRef(null);

  const handleDragStart = (i) => { dragIdx.current = i; };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (i) => {
    const from = dragIdx.current;
    if (from === null || from === i) return;
    setLayout((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(i, 0, moved);
      return copy;
    });
    dragIdx.current = null;
  };

  const moveItem = (i, dir) => {
    setLayout((prev) => {
      const copy = [...prev];
      const j = i + dir;
      if (j < 0 || j >= copy.length) return prev;
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };

  const toggleEnabled = (id) => {
    setLayout((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  return (
    <AdminCard>
      <h2 className="zm-serif" style={{ fontSize: 24, color: 'var(--c-primary)', marginTop: 0 }}>{t.layout}</h2>
      <p style={{ fontSize: 13, opacity: .65, marginTop: -8, marginBottom: 20 }}>{t.dragToReorder}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {layout.map((section, i) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, background: 'var(--c-beige)',
              borderRadius: 12, padding: '14px 16px', cursor: 'grab', opacity: section.enabled ? 1 : .5
            }}
          >
            <span style={{ fontSize: 18, opacity: .5 }}>⠿</span>
            <span style={{ flex: 1, fontWeight: 600 }}>{section.label[lang]}</span>
            <button onClick={() => moveItem(i, -1)} disabled={i === 0} style={iconBtn} aria-label={t.moveUp}>↑</button>
            <button onClick={() => moveItem(i, 1)} disabled={i === layout.length - 1} style={iconBtn} aria-label={t.moveDown}>↓</button>
            <button onClick={() => toggleEnabled(section.id)} style={{
              background: section.enabled ? 'var(--c-primary)' : 'var(--c-beigeDark)', color: '#fff',
              border: 'none', padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, minWidth: 76
            }}>{section.enabled ? t.show : t.hide}</button>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

const iconBtn = { background: 'var(--c-white)', border: '1px solid var(--c-beigeDark)', width: 32, height: 32, borderRadius: 8 };

/* ---------------- Admin: Theme ---------------- */
/* Helper: lighten/darken a hex color by a percentage (-100 to 100) */
function shadeColor(hex, percent) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h, 16);
  let r = (num >> 16), g = (num >> 8 & 0x00FF), b = (num & 0x0000FF);
  const amt = Math.round(2.55 * percent);
  r = Math.max(0, Math.min(255, r + amt));
  g = Math.max(0, Math.min(255, g + amt));
  b = Math.max(0, Math.min(255, b + amt));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function AdminTheme() {
  const { t, lang, theme, setTheme } = useApp();
  const [local, setLocal] = useState({ ...theme, logo: theme.logo || theme.primary });
  const [shades, setShades] = useState({ primary: 0, logo: 0, beige: 0, pink: 0 });

  const set = (k, v) => setLocal((p) => ({ ...p, [k]: v }));
  const apply = () => setTheme(local);
  const reset = () => { setLocal(COLORS_DEFAULT); setTheme(COLORS_DEFAULT); setShades({ primary: 0, logo: 0, beige: 0, pink: 0 }); };

  const handleShade = (key, darkKey, value) => {
    setShades((s) => ({ ...s, [key]: value }));
    const base = COLORS_DEFAULT[key];
    const shaded = shadeColor(base, value);
    setLocal((p) => ({ ...p, [key]: shaded, [darkKey]: shadeColor(base, value - 18) }));
  };

  const swatchGroups = [
    { key: 'logo', darkKey: 'logo', label: lang === 'ar' ? 'لون اللوجو (ZUMURRUD)' : 'Logo color (ZUMURRUD)', hasShade: true },
    { key: 'primary', darkKey: 'primaryDark', label: t.primaryColor, hasShade: true },
    { key: 'beige', darkKey: 'beigeDark', label: t.beigeColor, hasShade: true },
    { key: 'pink', darkKey: 'pinkDark', label: t.pinkColor, hasShade: true }
  ];

  return (
    <AdminCard>
      <h2 className="zm-serif" style={{ fontSize: 24, color: 'var(--c-primary)', marginTop: 0 }}>{t.themeColors}</h2>
      <p style={{ fontSize: 13, opacity: .65, marginTop: -8, marginBottom: 20 }}>
        {lang === 'ar' ? 'اختاري لوناً ثم اسحبي السلايدر للتحكم في درجة الفتح أو الغمق' : 'Pick a color, then drag the slider to control its lightness or darkness'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 24, marginTop: 20 }}>
        {swatchGroups.map((s) => (
          <div key={s.key}>
            <label style={lbl}>{s.label}</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <input type="color" value={local[s.key]} onChange={(e) => set(s.key, e.target.value)} style={{ width: 50, height: 40, border: 'none', borderRadius: 8 }} />
              <input value={local[s.key]} onChange={(e) => set(s.key, e.target.value)} style={{ ...inp, flex: 1 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, opacity: .6 }}>{lang === 'ar' ? 'غامق' : 'Darker'}</span>
              <input type="range" min="-60" max="60" value={shades[s.key] || 0} onChange={(e) => handleShade(s.key, s.darkKey, Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: 11, opacity: .6 }}>{lang === 'ar' ? 'فاتح' : 'Lighter'}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button onClick={apply} style={{ background: 'var(--c-primary)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 700 }}>{t.save}</button>
        <button onClick={reset} style={{ background: 'none', border: '1px solid var(--c-beigeDark)', padding: '12px 28px', borderRadius: 10 }}>{t.resetDefaults}</button>
      </div>
    </AdminCard>
  );
}

/* ---------------- Admin: Orders ---------------- */
function AdminOrders() {
  const { t, lang, orders, setOrders } = useApp();

  const updateStatus = (id, status) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  if (!orders.length) {
    return <AdminCard><div style={{ textAlign: 'center', padding: 40, opacity: .6 }}>{t.noProducts}</div></AdminCard>;
  }

  const statusLabel = (s) => ({
    awaitingDeposit: lang === 'ar' ? 'بانتظار تأكيد الديبوزت' : 'Awaiting deposit confirmation',
    pending: t.pending, confirmed: t.confirmed, shipped: t.shipped, delivered: t.delivered
  }[s] || s);

  const statusColor = (s) => ({
    awaitingDeposit: 'var(--c-pinkDark)', pending: '#b8860b', confirmed: 'var(--c-primary)',
    shipped: '#4169a8', delivered: '#2e7d32'
  }[s] || 'var(--c-text)');

  return (
    <AdminCard>
      <h2 className="zm-serif" style={{ fontSize: 24, color: 'var(--c-primary)', marginTop: 0 }}>{t.orders}</h2>
      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {orders.map((o) => (
          <div key={o.id} style={{ background: 'var(--c-beige)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div><strong>#{o.id}</strong> · {o.customer.name} · {o.customer.phone}</div>
              <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} style={{
                ...inp, width: 'auto', color: statusColor(o.status), fontWeight: 600
              }}>
                <option value="awaitingDeposit">{statusLabel('awaitingDeposit')}</option>
                <option value="pending">{t.pending}</option>
                <option value="confirmed">{t.confirmed}</option>
                <option value="shipped">{t.shipped}</option>
                <option value="delivered">{t.delivered}</option>
              </select>
            </div>
            <div style={{ fontSize: 13, opacity: .7, marginTop: 6 }}>
              {o.customer.governorate} — {o.customer.address}
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {o.items.map((it, i) => <span key={i}>{it.name} ×{it.qty}{i < o.items.length - 1 ? ', ' : ''}</span>)}
            </div>
            {o.discountCode && (
              <div style={{ fontSize: 12, marginTop: 4, color: 'var(--c-pinkDark)' }}>
                {lang === 'ar' ? 'كود الخصم' : 'Discount code'}: {o.discountCode} (-{o.discountAmt} {lang === 'ar' ? 'ج.م' : 'EGP'})
              </div>
            )}
            {o.customer.transferRef && (
              <div style={{ fontSize: 13, marginTop: 6, padding: 8, background: 'var(--c-white)', borderRadius: 8 }}>
                <strong>{lang === 'ar' ? 'رقم عملية التحويل:' : 'Transfer reference:'}</strong> {o.customer.transferRef}
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700 }}>{t.total}: {o.total} {lang === 'ar' ? 'ج.م' : 'EGP'}</div>
              {o.deposit && (
                <div style={{ fontWeight: 700, color: 'var(--c-pinkDark)' }}>
                  {lang === 'ar' ? 'الديبوزت المطلوب' : 'Required deposit'}: {o.deposit} {lang === 'ar' ? 'ج.م' : 'EGP'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

/* ---------------- Admin: Settings ---------------- */
function AdminSettings() {
  const { t, lang, settings, setSettings } = useApp();
  const [local, setLocal] = useState({ logoSize: 28, sliderHeight: 78, sliderTitleSize: 52, sliderSubSize: 17, navLinkSize: 15, headerPadding: 14, ...settings });
  const set = (k, v) => setLocal((p) => ({ ...p, [k]: v }));
  const SliderRow = ({ label, k, min, max, unit = 'px' }) => (
    <div style={{ gridColumn: '1 / -1' }}>
      <label style={lbl}>{label}: <strong>{local[k]}{unit}</strong></label>
      <input type="range" min={min} max={max} value={local[k] || min} onChange={(e) => set(k, Number(e.target.value))} style={{ width: '100%' }} />
    </div>
  );

  return (
    <AdminCard>
      <h2 className="zm-serif" style={{ fontSize: 24, color: 'var(--c-primary)', marginTop: 0 }}>{t.settings}</h2>

      <div style={{ fontWeight: 700, fontSize: 14, margin: '20px 0 12px', color: 'var(--c-primary)' }}>
        {lang === 'ar' ? 'بيانات المتجر' : 'Store info'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <AdminField label={t.storeName} value={local.storeName} onChange={(v) => set('storeName', v)} />
        <AdminField label={t.whatsappNum} value={local.whatsapp} onChange={(v) => set('whatsapp', v)} />
        <AdminField label={t.taglineAr} value={local.taglineAr} onChange={(v) => set('taglineAr', v)} />
        <AdminField label={t.taglineEn} value={local.taglineEn} onChange={(v) => set('taglineEn', v)} />
        <AdminField label={t.emailAddr} value={local.email} onChange={(v) => set('email', v)} />
        <AdminField label="Instagram" value={local.instagram} onChange={(v) => set('instagram', v)} />
        <AdminField label="Facebook" value={local.facebook || ''} onChange={(v) => set('facebook', v)} />
        <AdminField label="TikTok" value={local.tiktok} onChange={(v) => set('tiktok', v)} />
        <AdminField label={t.shippingFee} value={local.shippingFee} onChange={(v) => set('shippingFee', Number(v))} type="number" />
        <AdminField label={t.freeShipOver} value={local.freeShippingOver} onChange={(v) => set('freeShippingOver', Number(v))} type="number" />
        <AdminField label={lang === 'ar' ? 'رقم فودافون كاش' : 'Vodafone Cash number'} value={local.vodafoneCash || ''} onChange={(v) => set('vodafoneCash', v)} />
      </div>

      <div style={{ fontWeight: 700, fontSize: 14, margin: '28px 0 12px', color: 'var(--c-primary)' }}>
        {lang === 'ar' ? 'أحجام الهيدر' : 'Header sizes'}
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        <SliderRow label={lang === 'ar' ? 'حجم اسم اللوجو' : 'Logo name size'} k="logoSize" min={18} max={48} />
        <SliderRow label={lang === 'ar' ? 'حجم روابط القائمة' : 'Nav link size'} k="navLinkSize" min={12} max={22} />
        <SliderRow label={lang === 'ar' ? 'padding الهيدر (ارتفاع الشريط)' : 'Header padding (bar height)'} k="headerPadding" min={8} max={32} />
      </div>

      <div style={{ fontWeight: 700, fontSize: 14, margin: '28px 0 12px', color: 'var(--c-primary)' }}>
        {lang === 'ar' ? 'أحجام السلايدر' : 'Slider sizes'}
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        <SliderRow label={lang === 'ar' ? 'ارتفاع السلايدر' : 'Slider height'} k="sliderHeight" min={40} max={100} unit="vh" />
        <SliderRow label={lang === 'ar' ? 'حجم العنوان الكبير' : 'Slide title size'} k="sliderTitleSize" min={24} max={90} />
        <SliderRow label={lang === 'ar' ? 'حجم النص الصغير' : 'Slide subtitle size'} k="sliderSubSize" min={12} max={28} />
      </div>

      <button onClick={() => setSettings(local)} style={{
        marginTop: 28, background: 'var(--c-primary)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 700
      }}>{t.save}</button>
    </AdminCard>
  );
}

/* ---------------- Admin: Categories ---------------- */
function AdminCategories() {
  const { t, lang, categories, setCategories, products } = useApp();
  const [newCat, setNewCat] = useState({ labelAr: '', labelEn: '', image: '' });

  const slugify = (s) => s.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '') || ('cat' + Date.now());

  const addCategory = (e) => {
    e.preventDefault();
    if (!newCat.labelAr.trim() || !newCat.labelEn.trim()) return;
    const id = slugify(newCat.labelEn || newCat.labelAr) + '-' + Date.now().toString().slice(-4);
    setCategories((prev) => [...prev, { id, labelAr: newCat.labelAr, labelEn: newCat.labelEn, image: newCat.image || placeholderImg(prev.length) }]);
    setNewCat({ labelAr: '', labelEn: '', image: '' });
  };

  const updateCategory = (id, field, value) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeCategory = (id) => {
    const inUse = products.some((p) => p.category === id);
    if (inUse) {
      window.alert?.(
        lang === 'ar'
          ? 'لا يمكن حذف هذه الفئة لأن فيه منتجات مرتبطة بها. غيّري فئة هذه المنتجات أولاً.'
          : 'This category can\'t be removed because some products use it. Reassign those products first.'
      );
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <AdminCard>
      <h2 className="zm-serif" style={{ fontSize: 24, color: 'var(--c-primary)', marginTop: 0 }}>
        {lang === 'ar' ? 'الفئات' : 'Categories'}
      </h2>
      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        {categories.map((c) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, background: 'var(--c-beige)',
            borderRadius: 12, padding: 12
          }}>
            <img src={c.image || placeholderImg(0)} alt="" style={{ width: 44, height: 56, objectFit: 'cover', borderRadius: 8 }} />
            <input value={c.labelAr} onChange={(e) => updateCategory(c.id, 'labelAr', e.target.value)} placeholder={lang === 'ar' ? 'الاسم بالعربي' : 'Arabic name'} style={{ ...inp, flex: 1 }} />
            <input value={c.labelEn} onChange={(e) => updateCategory(c.id, 'labelEn', e.target.value)} placeholder={lang === 'ar' ? 'الاسم بالإنجليزي' : 'English name'} style={{ ...inp, flex: 1 }} />
            <button onClick={() => removeCategory(c.id)} style={{
              background: 'none', border: '1px solid var(--c-pinkDark)', color: 'var(--c-pinkDark)',
              padding: '8px 16px', borderRadius: 8, fontSize: 13, whiteSpace: 'nowrap'
            }}>{t.deleteProduct}</button>
          </div>
        ))}
      </div>
      <form onSubmit={addCategory} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginTop: 18 }}>
        <input placeholder={lang === 'ar' ? 'الاسم بالعربي' : 'Arabic name'} value={newCat.labelAr} onChange={(e) => setNewCat((c) => ({ ...c, labelAr: e.target.value }))} style={inp} />
        <input placeholder={lang === 'ar' ? 'الاسم بالإنجليزي' : 'English name'} value={newCat.labelEn} onChange={(e) => setNewCat((c) => ({ ...c, labelEn: e.target.value }))} style={inp} />
        <input placeholder={t.orPasteUrl} value={newCat.image} onChange={(e) => setNewCat((c) => ({ ...c, image: e.target.value }))} style={inp} />
        <button type="submit" style={{ background: 'var(--c-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 18px', fontWeight: 600 }}>+ {lang === 'ar' ? 'إضافة فئة' : 'Add category'}</button>
      </form>
    </AdminCard>
  );
}

/* ---------------- Admin: Card Design (live preview) ---------------- */
function AdminCardDesign() {
  const { t, lang, cardDesign, setCardDesign, products } = useApp();
  const [local, setLocal] = useState(cardDesign);
  const set = (k, v) => setLocal((p) => ({ ...p, [k]: v }));
  const sample = products[0] || null;

  const aspectOptions = [
    { id: '1/1', label: lang === 'ar' ? 'مربع' : 'Square' },
    { id: '3/4', label: lang === 'ar' ? 'طولي (افتراضي)' : 'Portrait (default)' },
    { id: '4/5', label: lang === 'ar' ? 'طولي خفيف' : 'Slight portrait' },
    { id: '4/3', label: lang === 'ar' ? 'عرضي' : 'Landscape' }
  ];
  const hoverOptions = [
    { id: 'none', label: lang === 'ar' ? 'بدون' : 'None' },
    { id: 'zoom', label: lang === 'ar' ? 'تكبير خفيف' : 'Zoom' },
    { id: 'shadow', label: lang === 'ar' ? 'ظل' : 'Shadow' },
    { id: 'lift', label: lang === 'ar' ? 'رفع لأعلى' : 'Lift up' }
  ];
  const priceposOptions = [
    { id: 'below', label: lang === 'ar' ? 'تحت الاسم' : 'Below name' },
    { id: 'beside', label: lang === 'ar' ? 'جنب الاسم' : 'Beside name' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }} className="zm-carddesign-grid">
      <AdminCard>
        <h2 className="zm-serif" style={{ fontSize: 24, color: 'var(--c-primary)', marginTop: 0 }}>
          {lang === 'ar' ? 'تصميم الكارت' : 'Card design'}
        </h2>

        <div style={{ marginTop: 20 }}>
          <label style={lbl}>{lang === 'ar' ? `استدارة الزوايا: ${local.cornerRadius}px` : `Corner roundness: ${local.cornerRadius}px`}</label>
          <input type="range" min="0" max="32" value={local.cornerRadius} onChange={(e) => set('cornerRadius', Number(e.target.value))} style={{ width: '100%' }} />
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={lbl}>{lang === 'ar' ? 'نسبة أبعاد الصورة' : 'Image aspect ratio'}</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {aspectOptions.map((o) => (
              <button key={o.id} onClick={() => set('imageAspect', o.id)} style={{
                border: '1px solid var(--c-beigeDark)', background: local.imageAspect === o.id ? 'var(--c-primary)' : 'var(--c-white)',
                color: local.imageAspect === o.id ? '#fff' : 'var(--c-text)', padding: '8px 16px', borderRadius: 999, fontSize: 13
              }}>{o.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={lbl}>{lang === 'ar' ? 'تأثير المرور بالماوس' : 'Hover effect'}</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {hoverOptions.map((o) => (
              <button key={o.id} onClick={() => set('hoverEffect', o.id)} style={{
                border: '1px solid var(--c-beigeDark)', background: local.hoverEffect === o.id ? 'var(--c-primary)' : 'var(--c-white)',
                color: local.hoverEffect === o.id ? '#fff' : 'var(--c-text)', padding: '8px 16px', borderRadius: 999, fontSize: 13
              }}>{o.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={lbl}>{lang === 'ar' ? 'مكان السعر' : 'Price position'}</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {priceposOptions.map((o) => (
              <button key={o.id} onClick={() => set('pricePosition', o.id)} style={{
                border: '1px solid var(--c-beigeDark)', background: local.pricePosition === o.id ? 'var(--c-primary)' : 'var(--c-white)',
                color: local.pricePosition === o.id ? '#fff' : 'var(--c-text)', padding: '8px 16px', borderRadius: 999, fontSize: 13
              }}>{o.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 18 }}>
          <div>
            <label style={lbl}>{lang === 'ar' ? `حجم اسم المنتج: ${local.nameSize}px` : `Product name size: ${local.nameSize}px`}</label>
            <input type="range" min="12" max="22" value={local.nameSize} onChange={(e) => set('nameSize', Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={lbl}>{lang === 'ar' ? `حجم السعر: ${local.priceSize}px` : `Price size: ${local.priceSize}px`}</label>
            <input type="range" min="12" max="22" value={local.priceSize} onChange={(e) => set('priceSize', Number(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={lbl}>{lang === 'ar' ? `المسافة بين الصورة والنص: ${local.spacing}px` : `Spacing below image: ${local.spacing}px`}</label>
          <input type="range" min="4" max="28" value={local.spacing} onChange={(e) => set('spacing', Number(e.target.value))} style={{ width: '100%' }} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 26 }}>
          <button onClick={() => setCardDesign(local)} style={{ background: 'var(--c-primary)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 700 }}>{t.save}</button>
          <button onClick={() => { setLocal(DEFAULT_CARD_DESIGN); setCardDesign(DEFAULT_CARD_DESIGN); }} style={{ background: 'none', border: '1px solid var(--c-beigeDark)', padding: '12px 28px', borderRadius: 10 }}>{t.resetDefaults}</button>
        </div>
      </AdminCard>

      <div style={{ position: 'sticky', top: 24, alignSelf: 'flex-start' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, opacity: .7 }}>
          {lang === 'ar' ? 'معاينة حية' : 'Live preview'}
        </div>
        <div style={{ background: 'var(--c-beige)', borderRadius: 16, padding: 20 }}>
          {sample ? <PreviewCard product={sample} design={local} /> : <div style={{ opacity: .5, fontSize: 13 }}>{t.noProducts}</div>}
        </div>
      </div>

      <style>{`@media (max-width: 900px) { .zm-carddesign-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function PreviewCard({ product, design }) {
  const { t, lang } = useApp();
  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const onSale = product.salePrice != null;
  const d = design;
  return (
    <div>
      <div style={{ position: 'relative', borderRadius: d.cornerRadius, overflow: 'hidden', aspectRatio: d.imageAspect, background: 'var(--c-beigeDark)' }}>
        <img src={product.images[0]} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {onSale && (
          <span style={{
            position: 'absolute', top: 12, insetInlineStart: 12, background: 'var(--c-pinkDark)',
            color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999
          }}>{t.sale}</span>
        )}
      </div>
      <div style={{
        marginTop: d.spacing,
        display: d.pricePosition === 'beside' ? 'flex' : 'block',
        alignItems: d.pricePosition === 'beside' ? 'baseline' : undefined,
        justifyContent: d.pricePosition === 'beside' ? 'space-between' : undefined,
        gap: d.pricePosition === 'beside' ? 8 : 0
      }}>
        <div style={{ fontSize: d.nameSize, fontWeight: 500, marginBottom: d.pricePosition === 'below' ? 4 : 0 }}>{name}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          {onSale ? (
            <>
              <span style={{ fontWeight: 700, color: 'var(--c-pinkDark)', fontSize: d.priceSize + 2 }}>{product.salePrice} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
              <span style={{ textDecoration: 'line-through', opacity: .5, fontSize: d.priceSize - 2 }}>{product.price}</span>
            </>
          ) : (
            <span style={{ fontWeight: 700, fontSize: d.priceSize }}>{product.price} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Admin: Announcement Bar ---------------- */
function AdminAnnouncement() {
  const { lang, announcement, setAnnouncement, t } = useApp();
  const [local, setLocal] = useState(announcement);
  const set = (k, v) => setLocal((p) => ({ ...p, [k]: v }));

  const colorPalette = ['#1f3b32', '#3f7a64', '#d391a3', '#f3c9d4', '#e3d6bc', '#26211a'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <AdminCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="zm-serif" style={{ fontSize: 24, color: 'var(--c-primary)', margin: 0 }}>
            {lang === 'ar' ? 'شريط الإعلانات المتحرك' : 'Announcement Bar'}
          </h2>
          <button onClick={() => set('enabled', !local.enabled)} style={{
            background: local.enabled ? 'var(--c-primary)' : 'var(--c-beigeDark)', color: '#fff',
            border: 'none', padding: '8px 20px', borderRadius: 999, fontWeight: 600, fontSize: 13
          }}>{local.enabled ? (lang === 'ar' ? 'مفعّل' : 'Enabled') : (lang === 'ar' ? 'معطّل' : 'Disabled')}</button>
        </div>

        <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
          <AdminField label={lang === 'ar' ? 'النص بالعربي' : 'Text (Arabic)'} value={local.text} onChange={(v) => set('text', v)} full />
          <AdminField label={lang === 'ar' ? 'النص بالإنجليزي' : 'Text (English)'} value={local.textEn} onChange={(v) => set('textEn', v)} full />

          <div>
            <label style={lbl}>{lang === 'ar' ? 'لون الخلفية' : 'Background color'}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {colorPalette.map((c) => (
                <button key={c} onClick={() => set('bgColor', c)} style={{
                  width: 32, height: 32, borderRadius: '50%', background: c,
                  border: local.bgColor === c ? '3px solid var(--c-pinkDark)' : '1px solid var(--c-beigeDark)'
                }} />
              ))}
              <input type="color" value={local.bgColor} onChange={(e) => set('bgColor', e.target.value)} style={{ width: 32, height: 32, border: 'none', borderRadius: 8 }} />
            </div>
          </div>

          <div>
            <label style={lbl}>{lang === 'ar' ? 'لون النص' : 'Text color'}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['#f3ecdf', '#ffffff', '#1f3b32', '#f3c9d4'].map((c) => (
                <button key={c} onClick={() => set('textColor', c)} style={{
                  width: 32, height: 32, borderRadius: '50%', background: c,
                  border: local.textColor === c ? '3px solid var(--c-pinkDark)' : '1px solid var(--c-beigeDark)'
                }} />
              ))}
              <input type="color" value={local.textColor} onChange={(e) => set('textColor', e.target.value)} style={{ width: 32, height: 32, border: 'none', borderRadius: 8 }} />
            </div>
          </div>

          <div>
            <label style={lbl}>{lang === 'ar' ? `سرعة الحركة: ${local.speed} ثانية` : `Animation speed: ${local.speed}s`}</label>
            <input type="range" min="10" max="60" value={local.speed} onChange={(e) => set('speed', Number(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>

        {/* Live preview */}
        <div style={{ marginTop: 20 }}>
          <label style={lbl}>{lang === 'ar' ? 'معاينة' : 'Preview'}</label>
          <div style={{
            background: local.bgColor, color: local.textColor, padding: '10px 0',
            overflow: 'hidden', whiteSpace: 'nowrap', borderRadius: 8, fontSize: 14, fontWeight: 500
          }}>
            <span style={{ paddingInline: 24 }}>{lang === 'ar' ? local.text : (local.textEn || local.text)}</span>
          </div>
        </div>

        <button onClick={() => setAnnouncement(local)} style={{
          marginTop: 22, background: 'var(--c-primary)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 700
        }}>{t.save}</button>
      </AdminCard>
    </div>
  );
}

/* ---------------- Admin: Discount Codes ---------------- */
function AdminDiscounts() {
  const { lang, discountCodes, setDiscountCodes } = useApp();
  const [newCode, setNewCode] = useState({ code: '', type: 'percent', value: '' });

  const addCode = (e) => {
    e.preventDefault();
    if (!newCode.code.trim() || !newCode.value) return;
    setDiscountCodes((prev) => [...prev, { code: newCode.code.toUpperCase(), type: newCode.type, value: Number(newCode.value), active: true }]);
    setNewCode({ code: '', type: 'percent', value: '' });
  };

  const toggleActive = (code) => {
    setDiscountCodes((prev) => prev.map((c) => (c.code === code ? { ...c, active: !c.active } : c)));
  };

  const removeCode = (code) => {
    setDiscountCodes((prev) => prev.filter((c) => c.code !== code));
  };

  return (
    <AdminCard>
      <h2 className="zm-serif" style={{ fontSize: 24, color: 'var(--c-primary)', marginTop: 0 }}>
        {lang === 'ar' ? 'أكواد الخصم' : 'Discount Codes'}
      </h2>
      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        {discountCodes.map((c) => (
          <div key={c.code} style={{
            display: 'flex', alignItems: 'center', gap: 14, background: 'var(--c-beige)',
            borderRadius: 12, padding: '12px 16px', opacity: c.active ? 1 : .5
          }}>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 15 }}>{c.code}</strong>
              <div style={{ fontSize: 13, opacity: .65 }}>
                {c.type === 'percent' ? `${c.value}%` : `${c.value} ${lang === 'ar' ? 'ج.م' : 'EGP'}`} {lang === 'ar' ? 'خصم' : 'off'}
              </div>
            </div>
            <button onClick={() => toggleActive(c.code)} style={{
              background: c.active ? 'var(--c-primary)' : 'var(--c-beigeDark)', color: '#fff',
              border: 'none', padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600
            }}>{c.active ? (lang === 'ar' ? 'مفعّل' : 'Active') : (lang === 'ar' ? 'معطّل' : 'Inactive')}</button>
            <button onClick={() => removeCode(c.code)} style={{
              background: 'none', border: '1px solid var(--c-pinkDark)', color: 'var(--c-pinkDark)', padding: '7px 16px', borderRadius: 8, fontSize: 13
            }}>{lang === 'ar' ? 'حذف' : 'Remove'}</button>
          </div>
        ))}
      </div>

      <form onSubmit={addCode} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginTop: 18 }}>
        <input placeholder={lang === 'ar' ? 'الكود' : 'Code'} value={newCode.code} onChange={(e) => setNewCode((c) => ({ ...c, code: e.target.value }))} style={inp} />
        <select value={newCode.type} onChange={(e) => setNewCode((c) => ({ ...c, type: e.target.value }))} style={inp}>
          <option value="percent">{lang === 'ar' ? 'نسبة %' : 'Percentage %'}</option>
          <option value="fixed">{lang === 'ar' ? 'مبلغ ثابت' : 'Fixed amount'}</option>
        </select>
        <input type="number" placeholder={lang === 'ar' ? 'القيمة' : 'Value'} value={newCode.value} onChange={(e) => setNewCode((c) => ({ ...c, value: e.target.value }))} style={inp} />
        <button type="submit" style={{ background: 'var(--c-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 18px', fontWeight: 600 }}>+ {lang === 'ar' ? 'إضافة' : 'Add'}</button>
      </form>
    </AdminCard>
  );
}

/* ---------------- Admin: Reviews Moderation ---------------- */
function AdminReviews() {
  const { lang, reviews, setReviews, products } = useApp();

  const removeReview = (id) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const productName = (id) => {
    const p = products.find((p) => p.id === id);
    return p ? (lang === 'ar' ? p.nameAr : p.nameEn) : id;
  };

  return (
    <AdminCard>
      <h2 className="zm-serif" style={{ fontSize: 24, color: 'var(--c-primary)', marginTop: 0 }}>
        {lang === 'ar' ? 'تقييمات العملاء' : 'Customer Reviews'}
      </h2>
      {reviews.length === 0 && <div style={{ opacity: .55, fontSize: 14, marginTop: 16 }}>{lang === 'ar' ? 'لا توجد تقييمات بعد' : 'No reviews yet'}</div>}
      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {reviews.map((r) => (
          <div key={r.id} style={{ display: 'flex', gap: 14, background: 'var(--c-beige)', borderRadius: 12, padding: 14 }}>
            {r.image && <img src={r.image} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <strong style={{ fontSize: 14 }}>{r.name}</strong>
                <StarRow rating={r.rating} small />
              </div>
              <div style={{ fontSize: 12, opacity: .6, marginTop: 2 }}>{productName(r.productId)}</div>
              <p style={{ fontSize: 13, opacity: .85, margin: '6px 0 0' }}>{r.text}</p>
            </div>
            <button onClick={() => removeReview(r.id)} style={{
              background: 'none', border: '1px solid var(--c-pinkDark)', color: 'var(--c-pinkDark)',
              padding: '6px 14px', borderRadius: 8, fontSize: 12, alignSelf: 'flex-start', whiteSpace: 'nowrap'
            }}>{lang === 'ar' ? 'حذف' : 'Remove'}</button>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

function AdminTeam() {
  const { t, lang, accounts, setAccounts, currentUser, setCurrentUser } = useApp();
  const [newMember, setNewMember] = useState({ name: '', email: '', password: '' });
  const [pwdForm, setPwdForm] = useState({ current: '', next: '' });
  const [pwdMsg, setPwdMsg] = useState(null);

  const addMember = (e) => {
    e.preventDefault();
    if (!newMember.name.trim() || !newMember.email.trim() || !newMember.password.trim()) return;
    const account = { id: 'acc' + Date.now(), role: 'staff', ...newMember };
    setAccounts((prev) => [...prev, account]);
    setNewMember({ name: '', email: '', password: '' });
  };

  const removeMember = (id) => {
    if (id === currentUser?.id) return;
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const changeMyPassword = (e) => {
    e.preventDefault();
    if (pwdForm.current !== currentUser.password) {
      setPwdMsg({ ok: false, text: t.incorrectCurrentPassword });
      return;
    }
    const updated = { ...currentUser, password: pwdForm.next };
    setAccounts((prev) => prev.map((a) => (a.id === currentUser.id ? updated : a)));
    setCurrentUser(updated);
    setPwdForm({ current: '', next: '' });
    setPwdMsg({ ok: true, text: t.passwordChanged });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <AdminCard>
        <h2 className="zm-serif" style={{ fontSize: 24, color: 'var(--c-primary)', marginTop: 0 }}>{t.team}</h2>
        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          {accounts.map((a) => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 14, background: 'var(--c-beige)',
              borderRadius: 12, padding: '12px 16px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{a.name} {a.id === currentUser?.id && '(' + (lang === 'ar' ? 'أنتِ' : 'you') + ')'}</div>
                <div style={{ fontSize: 13, opacity: .65 }}>{a.email} · {a.role}</div>
              </div>
              {a.id !== currentUser?.id && (
                <button onClick={() => removeMember(a.id)} style={{
                  background: 'none', border: '1px solid var(--c-pinkDark)', color: 'var(--c-pinkDark)',
                  padding: '8px 16px', borderRadius: 8, fontSize: 13
                }}>{t.removeMember}</button>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={addMember} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginTop: 18 }}>
          <input placeholder={t.memberName} value={newMember.name} onChange={(e) => setNewMember((m) => ({ ...m, name: e.target.value }))} style={inp} />
          <input placeholder={t.memberEmail} type="email" value={newMember.email} onChange={(e) => setNewMember((m) => ({ ...m, email: e.target.value }))} style={inp} />
          <input placeholder={t.memberPassword} value={newMember.password} onChange={(e) => setNewMember((m) => ({ ...m, password: e.target.value }))} style={inp} />
          <button type="submit" style={{ background: 'var(--c-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 18px', fontWeight: 600 }}>+ {t.addMember}</button>
        </form>
      </AdminCard>

      <AdminCard>
        <h3 className="zm-serif" style={{ fontSize: 20, color: 'var(--c-primary)', marginTop: 0 }}>{t.changePassword}</h3>
        <form onSubmit={changeMyPassword} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginTop: 14, alignItems: 'start' }}>
          <input type="password" placeholder={t.currentPassword} value={pwdForm.current} onChange={(e) => setPwdForm((p) => ({ ...p, current: e.target.value }))} style={inp} />
          <input type="password" placeholder={t.newPassword} value={pwdForm.next} onChange={(e) => setPwdForm((p) => ({ ...p, next: e.target.value }))} style={inp} />
          <button type="submit" style={{ background: 'var(--c-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 18px', fontWeight: 600, height: 36 }}>{t.save}</button>
        </form>
        {pwdMsg && (
          <div style={{ marginTop: 10, fontSize: 13, color: pwdMsg.ok ? 'var(--c-primary)' : 'var(--c-pinkDark)' }}>{pwdMsg.text}</div>
        )}
      </AdminCard>
    </div>
  );
}
