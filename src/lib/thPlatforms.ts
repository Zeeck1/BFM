export interface ThailandPlatform {
  id: string;
  name: string;
  url: string;
  /** Favicon / logo source */
  logo: string;
  /** Brand accent for fallback styling */
  color: string;
}

export interface PlatformCategory {
  id: string;
  label: string;
  platforms: ThailandPlatform[];
}

export const PLATFORM_CATEGORIES: PlatformCategory[] = [
  {
    id: "all-in-one",
    label: "All in one",
    platforms: [
      {
        id: "lazada",
        name: "Lazada",
        url: "https://www.lazada.co.th",
        logo: "https://www.google.com/s2/favicons?domain=lazada.co.th&sz=128",
        color: "#0F146D",
      },
      {
        id: "shopee",
        name: "Shopee",
        url: "https://shopee.co.th",
        logo: "https://www.google.com/s2/favicons?domain=shopee.co.th&sz=128",
        color: "#EE4D2D",
      },
      {
        id: "central",
        name: "Central",
        url: "https://www.central.co.th",
        logo: "https://www.google.com/s2/favicons?domain=central.co.th&sz=128",
        color: "#1A1A1A",
      },
      {
        id: "amazon-th",
        name: "Amazon Thailand",
        url: "https://www.amazon.co.th",
        logo: "https://www.google.com/s2/favicons?domain=amazon.co.th&sz=128",
        color: "#FF9900",
      },
      {
        id: "lotuss",
        name: "Lotus's",
        url: "https://www.lotuss.com",
        logo: "https://www.google.com/s2/favicons?domain=lotuss.com&sz=128",
        color: "#00A651",
      },
    ],
  },
  {
    id: "cosmetics",
    label: "Cosmetics & Brands",
    platforms: [
      {
        id: "central",
        name: "Central",
        url: "https://www.central.co.th",
        logo: "https://www.google.com/s2/favicons?domain=central.co.th&sz=128",
        color: "#1A1A1A",
      },
      {
        id: "konvy",
        name: "Konvy",
        url: "https://www.konvy.com",
        logo: "https://www.google.com/s2/favicons?domain=konvy.com&sz=128",
        color: "#E91E8C",
      },
    ],
  },
  {
    id: "home-appliances",
    label: "Home Appliances",
    platforms: [
      {
        id: "homepro",
        name: "HomePro",
        url: "https://www.homepro.co.th",
        logo: "https://www.google.com/s2/favicons?domain=homepro.co.th&sz=128",
        color: "#E31837",
      },
    ],
  },
  {
    id: "electronic",
    label: "Electronic",
    platforms: [
      {
        id: "powerbuy",
        name: "Power Buy",
        url: "https://www.powerbuy.co.th",
        logo: "https://www.google.com/s2/favicons?domain=powerbuy.co.th&sz=128",
        color: "#005BAC",
      },
    ],
  },
];
