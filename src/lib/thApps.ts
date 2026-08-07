export interface ThailandStoreApp {
  id: string;
  name: string;
  color: string;
  logo: string;
  androidUrl: string;
  iosUrl: string;
}

/** Lazada & Shopee Thailand mobile apps (Play Store + App Store). */
export const THAILAND_STORE_APPS: ThailandStoreApp[] = [
  {
    id: "lazada",
    name: "Lazada",
    color: "#0F146D",
    logo: "https://www.google.com/s2/favicons?domain=lazada.co.th&sz=128",
    androidUrl:
      "https://play.google.com/store/apps/details?id=com.lazada.android&hl=en&gl=TH",
    iosUrl: "https://apps.apple.com/th/app/lazada/id785385147",
  },
  {
    id: "shopee",
    name: "Shopee",
    color: "#EE4D2D",
    logo: "https://www.google.com/s2/favicons?domain=shopee.co.th&sz=128",
    androidUrl:
      "https://play.google.com/store/apps/details?id=com.shopee.th&hl=en&gl=TH",
    iosUrl: "https://apps.apple.com/th/app/id959841453",
  },
];
